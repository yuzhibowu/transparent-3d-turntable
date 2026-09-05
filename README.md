# Transparent 3D Turntable Renderer

Browser-based USDZ, OBJ, and GLB turntable renderer with transparent MOV, PNG sequence, GIF, and animated PNG exports.

## Reusable UI standard

See [饼饼SHOW 网页工具 UI 范式](UI范式.md) for the reusable layout, colors, typography, borderless slider rules, responsive behavior, and a ready-to-use prompt for future tools.

## Local development

FFmpeg must be installed and available on `PATH`.

```bash
npm install
npm run dev
```

The app is served at `http://localhost:5174` by default.

## Production architecture

The deployed Vite app exports files entirely in the browser. PNG sequences are packaged with JSZip; MOV, GIF, and animated PNG files are encoded with ffmpeg.wasm. No export backend is required.

## Model lighting

Lighting follows 饼饼运镜C号's neutral defaults: exposure 1, environment 0.42, key 0.68, fill 0.26, shadow 0, key X/Y −35°/40°, ACES. Exposure ranges from 0–4, light strengths 0–3, shadows 0–1, and angles ±180°. White ambient/key/fill lights replace the colored rig and hidden rim light. Presets write the displayed parameters directly. The fixed fill orientation follows C号; shadow bounds scale and move with the model. Three.js retains a studio environment for PBR reflections, so this is a parameter/behavior alignment, not pixel equivalence to SceneKit. Preview and exports use the same scene and renderer.

Run `npm test` for lighting regression checks.

Shadow strength follows C号's deferred shadow semantics: the key light's occlusion mask darkens the completed linear model lighting before exposure and tone mapping, instead of attenuating the key contribution alone. The forward directional-shadow term is removed to avoid applying it twice. Model content is normalized to a longest edge of 4 units without changing turntable framing. ACES is the first and default mapping button.

For actual GPU regression checks, run `npx vite --host 127.0.0.1`, open `/tests/render.html`, and select a model with self-occluding parts (such as 高达.usdz). The test compares strengths 0/0.5/1 at four orientations, checks restoration and alpha, and compares an exported PNG against preview pixels. Model fixtures are selected locally and are not stored in the repository.
