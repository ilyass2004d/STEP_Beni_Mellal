// Geographic arrival: map provider and camera sequence.
// Satellite imagery: Esri World Imagery (attribution required, check Esri terms of use).
// To switch provider, change `tiles` and `attribution` (any XYZ raster source works).
// Set `enabled: false` to always use the offline fallback.
export const mapConfig = {
  enabled: true,
  tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
  tileSize: 256,
  maxzoom: 19,
  attribution:
    'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  // If no tile has loaded after this delay, the fallback is shown.
  timeoutMs: 9000,
  // Camera sequence (durations in ms). The last view is computed to match the
  // home view of the 3D model, so the hand-over is a simple cross-fade.
  sequence: {
    region: { zoom: 8.2 },
    approach: { zoom: 15.2, duration: 3200 },
    oblique: { duration: 1900 },
    reveal: { duration: 1000 },
    // the model may still be loading: wait at most this long before handing over
    maxWaitForModel: 12000,
  },
};
