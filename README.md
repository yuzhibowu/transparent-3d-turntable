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

- Vercel hosts the Vite frontend.
- A Docker web service hosts `server.js` and FFmpeg.
- Set `VITE_EXPORT_API_URL` in Vercel to the Docker service origin, without a trailing slash.
- Set `ALLOWED_ORIGINS` on the Docker service to the Vercel site origin.

The included `Dockerfile` and `render.yaml` can be deployed directly on Render.
