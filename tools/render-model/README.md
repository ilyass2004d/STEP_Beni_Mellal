# render-model

Renders the orthographic top view (`public/media/model/plan-top-*.webp`) and the part
silhouettes (`masks/`) from the GLB export of the model (`site/public/models/modeles`).

    npm i three@0.170.0            # in this folder
    # copy the .glb files into ./models and the Draco decoder into ./draco
    python -m http.server 8765     # serve this folder
    W=2400 node run.cjs            # writes out_beauty.png (+ masks/)

Camera: orthographic, top-down, centred on the model origin, extent 579.4 × 770.64 m
(the "site" bbox of models/manifest.json). A Blender render with the same camera
(orthographic scale 770.64, aspect 3:4, top view, origin centred) can replace the image
without changing anything else.
