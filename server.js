import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.static(path.join(__dirname, "dist")));
app.get(/.*/, (_, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));

const port = Number(process.env.PORT) || 5174;
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Transparent 3D turntable ready at http://localhost:${port}`);
});

process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});

setInterval(() => {}, 60_000);
