import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MODEL_BASE, type Manifest } from './manifest';

export interface ViewerCallbacks {
  onProgress?(loaded: number, total: number): void;
  onPartError?(partId: string, error: unknown): void;
  /** `point` is the picked position on the model (x, z in model coordinates) */
  onPick?(partId: string | null, point: [number, number] | null): void;
  onHover?(partId: string | null, x: number, y: number, point: [number, number] | null): void;
  onUserInteract?(): void;
  /** wheel used without Ctrl: the page scrolls instead of zooming */
  onWheelBlocked?(): void;
}

/** share of brightness removed from the parts that are not selected */
const DIM = 0.86;
const MASK_OPACITY = 0.7;
const FOCUS_MS = 1100;
/** a click may move a few pixels (touchpad press, mouse jitter) and still count as a click */
const DRAG_TOLERANCE = 10;

type Anim = { from: [THREE.Vector3, THREE.Vector3]; to: [THREE.Vector3, THREE.Vector3]; start: number; ms: number };

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return Boolean(window.WebGL2RenderingContext && c.getContext('webgl2')) || Boolean(c.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Home view of the model: the whole site seen from the south, slightly oblique, fitted to
 * the viewport. Also used to end the satellite arrival on the same framing.
 * `outline`: points [x, z] (model coordinates) that must stay in view.
 */
export function homeView(outline: number[][], aspect: number) {
  const xs = outline.map((p) => p[0]);
  const zs = outline.map((p) => p[1]);
  const target: [number, number, number] = [(Math.min(...xs) + Math.max(...xs)) / 2, 0, (Math.min(...zs) + Math.max(...zs)) / 2];
  // seen from the south-west, looking north-east: the long axis of the site runs across the screen
  const polar = THREE.MathUtils.degToRad(54); // from vertical
  const azimuth = THREE.MathUtils.degToRad(-45); // west of south
  const dir = new THREE.Vector3(Math.sin(azimuth) * Math.sin(polar), Math.cos(polar), Math.cos(azimuth) * Math.sin(polar));
  const cam = new THREE.PerspectiveCamera(35, aspect || 1.6, 1, 20000);
  const t = new THREE.Vector3(...target);
  const pts = outline.map(([x, z]) => new THREE.Vector3(x, 4, z));
  const extent = (d: number) => {
    cam.position.copy(t).addScaledVector(dir, d);
    cam.lookAt(t);
    cam.updateMatrixWorld();
    let m = 0;
    for (const p of pts) {
      const v = p.clone().project(cam);
      m = Math.max(m, Math.abs(v.x) / 0.86, Math.abs(v.y) / 0.8);
    }
    return m;
  };
  let lo = 150, hi = 6000;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (extent(mid) > 1) lo = mid;
    else hi = mid;
  }
  const position = cam.position.copy(t).addScaledVector(dir, hi).toArray() as [number, number, number];
  return { target, position, fov: 35 };
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Renders the STEP model (one GLB per part, as listed in manifest.json) and
 * handles picking, highlighting and camera moves. Works with *part ids*; the
 * React layer maps parts to the documented structures.
 */
export class StepViewer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private loader: GLTFLoader;
  private draco: DRACOLoader;
  private envTexture: THREE.Texture;
  private parts = new Map<string, THREE.Object3D>();
  private loading = new Map<string, Promise<void>>();
  private pickable = new Set<string>();
  private highlighted: string[] = [];
  private isolated: Set<string> | null = null;
  private hiddenLayers = new Set<string>();
  private siteBox = new THREE.Box3();
  private home: [THREE.Vector3, THREE.Vector3] = [new THREE.Vector3(), new THREE.Vector3()];
  private anim: Anim | null = null;
  private dirty = true;
  private running = false;
  private frame = 0;
  private disposed = false;
  private raycaster = new THREE.Raycaster();
  private pointerDown: { x: number; y: number } | null = null;
  private lastHover = 0;
  private resizeObserver: ResizeObserver;
  private dimActive = false;
  private outline: number[][] | null = null;
  private dimLevel = 0;
  private dimTarget = 0;
  private lastDimTick = 0;
  private footprints = new THREE.Group();

  constructor(
    private container: HTMLElement,
    private cb: ViewerCallbacks = {},
    private reducedMotion = false,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.domElement.className = 'viewer-canvas';
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    container.appendChild(this.renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this.envTexture;
    this.scene.environmentIntensity = 0.35;

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f7a, 1.25));
    const sun = new THREE.DirectionalLight(0xfff6e8, 1.5);
    sun.position.set(380, 700, 260);
    this.scene.add(sun);

    this.footprints.renderOrder = 11;
    this.scene.add(this.footprints);

    this.camera = new THREE.PerspectiveCamera(35, 1, 1, 20000);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !reducedMotion;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.47;
    this.controls.minDistance = 12;
    this.controls.maxDistance = 2400;
    this.controls.zoomToCursor = true;
    this.controls.screenSpacePanning = false;
    this.controls.addEventListener('change', this.onControlsChange);
    this.controls.addEventListener('start', this.onControlsStart);

    this.draco = new DRACOLoader().setDecoderPath(`${import.meta.env.BASE_URL}draco/`);
    this.loader = new GLTFLoader().setDRACOLoader(this.draco);

    // The model sits in the page: the wheel scrolls the page; Ctrl/Cmd + wheel (and touchpad
    // pinch, which the browser reports with ctrlKey) zooms. In full screen the wheel always zooms.
    container.addEventListener('wheel', this.onWheelCapture, { capture: true, passive: true });

    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerleave', this.onPointerLeave);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
  }

  // ---------------------------------------------------------------- loading

  /** Loads `ids` from the manifest (max 4 in parallel). Resolves when all have settled. */
  async load(manifest: Manifest, ids: string[]) {
    const s = manifest.site;
    this.siteBox.set(new THREE.Vector3(...s.min), new THREE.Vector3(...s.max));
    if (this.parts.size === 0 && this.loading.size === 0) this.setHome();

    const byId = new Map(manifest.parties.map((p) => [p.id, p]));
    const queue = ids.filter((id) => byId.has(id) && !this.parts.has(id) && !this.loading.has(id));
    const total = queue.length;
    let done = 0;
    this.cb.onProgress?.(0, total);
    const worker = async () => {
      for (let id = queue.shift(); id; id = queue.shift()) {
        const part = byId.get(id)!;
        const p = this.loadPart(id, MODEL_BASE + part.fichier);
        this.loading.set(id, p);
        await p;
        this.loading.delete(id);
        this.cb.onProgress?.(++done, total);
      }
    };
    await Promise.all(Array.from({ length: 4 }, worker));
  }

  private loadPart(id: string, url: string) {
    return new Promise<void>((resolve) => {
      this.loader.load(
        url,
        (gltf) => {
          if (this.disposed) {
            disposeObject(gltf.scene);
            return resolve();
          }
          const root = gltf.scene;
          root.name = id;
          root.traverse((o) => {
            o.userData.partId = id;
            o.matrixAutoUpdate = false;
          });
          root.updateMatrixWorld(true);
          root.visible = !this.hiddenLayers.has(id) && (!this.isolated || this.isolated.has(id));
          this.parts.set(id, root);
          this.scene.add(root);
          if (this.dimActive) this.applyDim();
          this.dirty = true;
          resolve();
        },
        undefined,
        (err) => {
          this.cb.onPartError?.(id, err);
          resolve();
        },
      );
    });
  }

  hasPart(id: string) {
    return this.parts.has(id);
  }

  /** World-space bounds of a loaded part (debug / tests). */
  partBounds(id: string) {
    const o = this.parts.get(id);
    if (!o) return null;
    const b = new THREE.Box3().setFromObject(o);
    return { min: b.min.toArray(), max: b.max.toArray() };
  }

  // ------------------------------------------------------------ interaction

  setPickable(ids: string[]) {
    this.pickable = new Set(ids);
  }

  /**
   * Selection rendering: the whole model dims, the selected parts keep their own colours.
   * `lit`: parts left untouched. `masks`: footprints (rings of [x, z]) darkened on top of a
   * part that is shared with the selection (e.g. the other basins of the « Lagunes » part).
   * Call with `active = false` to restore the model.
   */
  highlight(lit: string[], active = lit.length > 0, masks: number[][][] = []) {
    this.highlighted = lit;
    this.dimActive = active;
    this.dimTarget = active ? 1 : 0;
    this.setMasks(active ? masks : []);
    if (this.reducedMotion) this.dimLevel = this.dimTarget;
    // repaint now: when a selection replaces another one the dim level does not change,
    // so the fade loop alone would leave the previous structure lit
    this.applyDim();
    if (!this.reducedMotion) this.ensureRunning();
  }

  private applyDim() {
    const k = 1 - DIM * this.dimLevel;
    for (const [id, root] of this.parts) {
      const factor = this.highlighted.includes(id) ? 1 : k;
      root.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats as THREE.MeshStandardMaterial[]) {
          if (!m.color) continue;
          m.userData.baseColor ??= m.color.clone();
          m.color.copy(m.userData.baseColor).multiplyScalar(factor);
          if (m.emissive) {
            m.userData.baseEmissive ??= m.emissive.clone();
            m.emissive.copy(m.userData.baseEmissive).multiplyScalar(factor);
          }
        }
      });
    }
    for (const c of this.footprints.children) ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = MASK_OPACITY * this.dimLevel;
    this.dirty = true;
  }

  private setMasks(rings: number[][][]) {
    for (const child of [...this.footprints.children]) {
      this.footprints.remove(child);
      const m = child as THREE.Mesh;
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    for (const r of rings) {
      if (r.length < 3) continue;
      const shape = new THREE.Shape(r.map(([x, z]) => new THREE.Vector2(x, -z)));
      const mask = new THREE.Mesh(
        new THREE.ShapeGeometry(shape),
        new THREE.MeshBasicMaterial({ color: 0x0d1310, transparent: true, opacity: MASK_OPACITY * this.dimLevel, depthWrite: false }),
      );
      mask.rotation.x = -Math.PI / 2;
      mask.position.y = 6.4;
      mask.renderOrder = 2;
      this.footprints.add(mask);
    }
  }

  /** Frames a rectangle given in model coordinates. */
  focusBounds(x0: number, z0: number, x1: number, z1: number) {
    const box = new THREE.Box3(new THREE.Vector3(x0, 0, z0), new THREE.Vector3(x1, 14, z1));
    this.focusBox(box);
  }

  /** Show only `ids` (plus `keep`), or everything when `ids` is null. */
  isolate(ids: string[] | null, keep: string[] = []) {
    this.isolated = ids ? new Set([...ids, ...keep]) : null;
    this.applyVisibility();
  }

  setLayerVisible(id: string, visible: boolean) {
    if (visible) this.hiddenLayers.delete(id);
    else this.hiddenLayers.add(id);
    this.applyVisibility();
  }

  private applyVisibility() {
    for (const [id, o] of this.parts) {
      o.visible = !this.hiddenLayers.has(id) && (!this.isolated || this.isolated.has(id));
    }
    this.dirty = true;
  }

  // ----------------------------------------------------------------- camera

  /** Outline that must fit in the home view (model coordinates), set by the page. */
  setOutline(points: number[][]) {
    this.outline = points;
  }

  private setHome() {
    const b = this.siteBox;
    const outline = this.outline ?? [[b.min.x, b.min.z], [b.max.x, b.min.z], [b.max.x, b.max.z], [b.min.x, b.max.z]];
    const h = homeView(outline, this.camera.aspect);
    const target = new THREE.Vector3(...h.target);
    const pos = new THREE.Vector3(...h.position);
    this.home = [pos, target];
    this.camera.position.copy(pos);
    this.controls.target.copy(target);
    this.controls.update();
    this.dirty = true;
  }

  resetView() {
    this.animateTo(this.home[0].clone(), this.home[1].clone());
  }

  /** Frames the given parts (or every visible part when omitted). */
  focus(ids?: string[]) {
    const box = new THREE.Box3();
    const list = ids ?? [...this.parts.keys()];
    for (const id of list) {
      const o = this.parts.get(id);
      if (o && (ids || o.visible)) box.expandByObject(o);
    }
    if (box.isEmpty()) return;
    this.focusBox(box);
  }

  private focusBox(box: THREE.Box3) {
    const center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(box.getSize(new THREE.Vector3()).length() / 2, 18);
    const vfov = THREE.MathUtils.degToRad(this.camera.fov);
    const fit = Math.min(vfov, 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect));
    const dist = (radius / Math.sin(fit / 2)) * 1.08;

    // keep the current azimuth, settle on a comfortable 50° elevation
    const offset = this.camera.position.clone().sub(this.controls.target);
    const sph = new THREE.Spherical().setFromVector3(offset);
    sph.radius = dist;
    sph.phi = THREE.MathUtils.degToRad(50);
    const pos = center.clone().add(new THREE.Vector3().setFromSpherical(sph));
    this.animateTo(pos, center);
  }

  private animateTo(pos: THREE.Vector3, target: THREE.Vector3) {
    if (this.reducedMotion) {
      this.camera.position.copy(pos);
      this.controls.target.copy(target);
      this.controls.update();
      this.dirty = true;
      return;
    }
    this.anim = {
      from: [this.camera.position.clone(), this.controls.target.clone()],
      to: [pos, target],
      start: performance.now(),
      ms: FOCUS_MS,
    };
    this.ensureRunning();
  }

  // ---------------------------------------------------------------- events

  private onControlsChange = () => {
    // keep the orbit target over the site so panning can't lose the model
    const t = this.controls.target;
    if (!this.siteBox.isEmpty()) {
      t.x = THREE.MathUtils.clamp(t.x, this.siteBox.min.x, this.siteBox.max.x);
      t.z = THREE.MathUtils.clamp(t.z, this.siteBox.min.z, this.siteBox.max.z);
      t.y = THREE.MathUtils.clamp(t.y, -5, 40);
    }
    this.dirty = true;
  };

  private onControlsStart = () => {
    this.anim = null; // the visitor takes over: never fight their input
    this.cb.onUserInteract?.();
  };

  private onWheelCapture = (e: WheelEvent) => {
    const zoom = e.ctrlKey || e.metaKey || Boolean(document.fullscreenElement) || this.container.closest('.is-fullscreen') !== null;
    this.controls.enableZoom = zoom;
    if (!zoom) this.cb.onWheelBlocked?.();
  };

  private onPointerDown = (e: PointerEvent) => {
    this.pointerDown = { x: e.clientX, y: e.clientY };
  };

  private onPointerUp = (e: PointerEvent) => {
    const d = this.pointerDown;
    this.pointerDown = null;
    if (!d || e.button !== 0) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > DRAG_TOLERANCE) return;
    const hit = this.pick(e.clientX, e.clientY);
    this.cb.onPick?.(hit.id, hit.point);
  };

  private onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || this.pointerDown || !this.cb.onHover) return;
    const now = performance.now();
    if (now - this.lastHover < 90) return;
    this.lastHover = now;
    const hit = this.pick(e.clientX, e.clientY);
    const r = this.container.getBoundingClientRect();
    this.cb.onHover(hit.id, e.clientX - r.left, e.clientY - r.top, hit.point);
  };

  private onPointerLeave = () => {
    this.renderer.domElement.style.cursor = '';
    this.cb.onHover?.(null, 0, 0, null);
  };

  /** The React layer decides whether the hovered point is a selectable structure. */
  setCursor(pointer: boolean) {
    this.renderer.domElement.style.cursor = pointer ? 'pointer' : '';
  }

  private pick(clientX: number, clientY: number): { id: string | null; point: [number, number] | null } {
    const r = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const targets: THREE.Object3D[] = [];
    for (const id of this.pickable) {
      const o = this.parts.get(id);
      if (o?.visible) targets.push(o);
    }
    const hit = this.raycaster.intersectObjects(targets, true).find((h) => h.object.visible);
    return {
      id: (hit?.object.userData.partId as string | undefined) ?? null,
      point: hit ? [hit.point.x, hit.point.z] : null,
    };
  }

  // ------------------------------------------------------------- lifecycle

  /** Start/stop the render loop (pause when offscreen or tab hidden). */
  setActive(active: boolean) {
    if (active) this.ensureRunning();
    else this.stop();
  }

  private ensureRunning() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.dirty = true;
    const tick = () => {
      if (!this.running) return;
      this.frame = requestAnimationFrame(tick);
      if (this.anim) {
        const t = Math.min(1, (performance.now() - this.anim.start) / this.anim.ms);
        const k = easeInOut(t);
        this.camera.position.lerpVectors(this.anim.from[0], this.anim.to[0], k);
        this.controls.target.lerpVectors(this.anim.from[1], this.anim.to[1], k);
        if (t >= 1) this.anim = null;
        this.dirty = true;
      }
      if (this.dimLevel !== this.dimTarget) {
        // time-based fade (≈ 450 ms), independent of the frame rate
        const now = performance.now();
        const dt = Math.min(0.5, (now - (this.lastDimTick || now)) / 450);
        this.lastDimTick = now;
        const step = Math.max(dt, 0.02);
        this.dimLevel = this.dimTarget > this.dimLevel ? Math.min(this.dimTarget, this.dimLevel + step) : Math.max(this.dimTarget, this.dimLevel - step);
        this.applyDim();
        if (this.dimLevel === this.dimTarget) this.lastDimTick = 0;
      }
      this.controls.update();
      if (this.dirty) {
        this.dirty = false;
        this.renderer.render(this.scene, this.camera);
      }
    };
    tick();
  }

  private stop() {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  private resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.resizeObserver.disconnect();
    this.container.removeEventListener('wheel', this.onWheelCapture, { capture: true });
    const el = this.renderer.domElement;
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerleave', this.onPointerLeave);
    this.controls.removeEventListener('change', this.onControlsChange);
    this.controls.removeEventListener('start', this.onControlsStart);
    this.controls.dispose();
    for (const o of this.parts.values()) disposeObject(o);
    this.parts.clear();
    this.setMasks([]);
    this.envTexture.dispose();
    this.draco.dispose();
    this.renderer.dispose();
    el.remove();
  }
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
      m.dispose();
    }
  });
}
