import express from "express";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json({ limit: "2gb" }));

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", ["-y", ...args], { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `ffmpeg exited with code ${code}`));
    });
  });
}

function decodeDataUrl(dataUrl) {
  const [, payload] = dataUrl.split(",");
  return Buffer.from(payload, "base64");
}

async function writeFrames(dir, frames) {
  await fs.mkdir(dir, { recursive: true });
  await Promise.all(
    frames.map((frame, index) => {
      const filename = path.join(dir, `frame_${String(index).padStart(5, "0")}.png`);
      return fs.writeFile(filename, decodeDataUrl(frame));
    }),
  );
}

app.post("/api/export", async (req, res) => {
  const { mode, fps, frames, baseName = "turntable" } = req.body;

  if (!Array.isArray(frames) || frames.length === 0) {
    res.status(400).json({ error: "没有可导出的帧。" });
    return;
  }

  const safeFps = Math.max(1, Math.min(120, Number(fps) || 24));
  const safeName = String(baseName).replace(/[^a-z0-9._-]+/gi, "_").replace(/^_+|_+$/g, "") || "turntable";
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "turntable-export-"));
  const frameDir = path.join(workDir, "frames");

  try {
    await writeFrames(frameDir, frames);
    const pattern = path.join(frameDir, "frame_%05d.png");

    if (mode === "png") {
      const zip = new JSZip();
      await Promise.all(
        frames.map(async (_, index) => {
          const framePath = path.join(frameDir, `frame_${String(index).padStart(5, "0")}.png`);
          zip.file(`${safeName}_${String(index + 1).padStart(5, "0")}.png`, await fs.readFile(framePath));
        }),
      );
      const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${safeName}_png_sequence.zip"`);
      res.end(zipBuffer);
      return;
    }

    let outputPath;
    let filename;
    let contentType;
    let args;

    if (mode === "mov") {
      outputPath = path.join(workDir, `${safeName}_prores4444.mov`);
      filename = `${safeName}_prores4444.mov`;
      contentType = "video/quicktime";
      args = [
        "-framerate",
        String(safeFps),
        "-i",
        pattern,
        "-c:v",
        "prores_ks",
        "-profile:v",
        "4",
        "-pix_fmt",
        "yuva444p10le",
        "-vendor",
        "apl0",
        outputPath,
      ];
    } else if (mode === "gif") {
      outputPath = path.join(workDir, `${safeName}.gif`);
      filename = `${safeName}.gif`;
      contentType = "image/gif";
      args = [
        "-framerate",
        String(safeFps),
        "-i",
        pattern,
        "-filter_complex",
        "[0:v]split[s0][s1];[s0]palettegen=reserve_transparent=on:stats_mode=single[p];[s1][p]paletteuse=alpha_threshold=128",
        "-loop",
        "0",
        outputPath,
      ];
    } else if (mode === "apng") {
      outputPath = path.join(workDir, `${safeName}.png`);
      filename = `${safeName}.png`;
      contentType = "image/png";
      args = ["-framerate", String(safeFps), "-i", pattern, "-plays", "0", "-f", "apng", outputPath];
    } else {
      res.status(400).json({ error: "未知导出模式。" });
      return;
    }

    await runFfmpeg(args);
    res.download(outputPath, filename, async () => {
      await fs.rm(workDir, { recursive: true, force: true });
    });
  } catch (error) {
    await fs.rm(workDir, { recursive: true, force: true });
    res.status(500).json({ error: error.message });
  }
});

app.use(express.static(path.join(__dirname, "dist")));
app.get(/.*/, (_, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));

const port = Number(process.env.PORT) || 5174;
const server = app.listen(port, () => {
  console.log(`Transparent 3D turntable ready at http://localhost:${port}`);
});

process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});

setInterval(() => {}, 60_000);
