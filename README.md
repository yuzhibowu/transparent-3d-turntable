# Transparent 3D Turntable Renderer

Browser-based USDZ, OBJ, and GLB turntable renderer with transparent MOV, PNG sequence, GIF, and animated PNG exports.

## Local development

FFmpeg must be installed and available on `PATH`.

```bash
npm install
npm run dev
```

The app is served at `http://localhost:5174` by default.

## Production architecture

The deployed Vite app exports files entirely in the browser. PNG sequences are packaged with JSZip; MOV, GIF, and animated PNG files are encoded with ffmpeg.wasm. No export backend is required.
