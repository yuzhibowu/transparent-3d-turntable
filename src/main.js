import "./styles.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { USDZLoader } from "three/examples/jsm/loaders/USDZLoader.js";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import JSZip from "jszip";

const app = document.querySelector("#app");
const ffmpegCoreBase = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";
let ffmpegCoreUrls = null;

app.innerHTML = `
  <main class="shell">
    <section class="stage">
      <div class="topbar">
        <div class="titleLine">
          <h1>旋转展台｜3D 模型透明背景旋转渲染工具</h1>
        </div>
        <p class="englishDescriptor">3D Model Rotation Renderer with<br />Transparent Background</p>
      </div>

      <div id="dropZone" class="viewportWrap">
        <canvas id="viewport"></canvas>
        <div id="emptyState" class="emptyState">
          <strong>拖入模型文件</strong>
          <span>透明 Alpha 背景，Y 轴 360 度自转预览</span>
        </div>
      </div>
      <button id="resetViewButton" class="resetViewButton" type="button" title="恢复初始视角" aria-label="恢复初始视角" disabled>↻</button>
    </section>

    <aside class="panel">
      <header class="panelHeader">
        <div class="panelHeaderTop">
          <div class="languageControl">
            <button id="languageMenuButton" class="languageMenuButton" type="button" aria-label="切换语言" title="切换语言" aria-expanded="false">⌄</button>
            <span>language</span>
            <div id="languageMenu" class="languageMenu" hidden>
              <button type="button" data-lang="zh">中文</button>
              <button type="button" data-lang="en">English</button>
              <button type="button" data-lang="fr">Français</button>
            </div>
          </div>
          <div class="panelBrand" aria-label="饼饼SHOW"><span>饼</span><span>饼</span><span>S</span><span>H</span><span>O</span><span>W</span></div>
        </div>
        <div class="importStack">
          <label class="importButton">
            <input id="fileInput" type="file" accept=".usdz,.obj,.glb,.gltf,model/vnd.usdz+zip,model/obj,model/gltf-binary" />
            <span data-i18n="importModel">导入模型</span>
          </label>
          <p id="modelStatus">导入 USDZ、OBJ 或 GLB 模型开始渲染</p>
        </div>
      </header>
      <div class="panelBody">
      <div class="group">
        <div class="groupTitle">
          <h2 data-i18n="rotation">旋转</h2>
          <button id="previewToggle" class="previewToggle" type="button" aria-label="暂停预览" title="暂停预览">Ⅱ</button>
        </div>
        <div class="directionGrid" role="radiogroup" aria-label="旋转方向">
          <label><input type="radio" name="direction" value="clockwise" checked /><span data-i18n="clockwise">顺时针</span></label>
          <label><input type="radio" name="direction" value="counterclockwise" /><span data-i18n="counterclockwise">逆时针</span></label>
        </div>
        <label>
          <span data-i18n="duration">整圈时长</span>
          <div class="field">
            <input id="durationInput" type="number" min="0.2" step="0.1" value="4" />
            <small data-i18n="seconds">秒</small>
          </div>
        </label>
        <label>
          <span data-i18n="speed">旋转速度</span>
          <div class="field">
            <input id="speedInput" type="number" min="1" step="1" value="90" />
            <small data-i18n="degreesPerSecond">度/秒</small>
          </div>
        </label>
        <label class="rangeLabel">
          <input id="speedRange" type="range" min="15" max="720" step="15" value="90" />
        </label>
      </div>

      <div class="group">
        <h2 data-i18n="exportMode">输出格式</h2>
        <div class="modeGrid" role="radiogroup" aria-label="导出模式">
          <label><input type="radio" name="mode" value="mov" checked /><span>MOV</span></label>
          <label><input type="radio" name="mode" value="png" /><span data-i18n="pngSequence">PNG 序列</span></label>
          <label><input type="radio" name="mode" value="gif" /><span>GIF</span></label>
          <label><input type="radio" name="mode" value="apng" /><span data-i18n="pngAnimation">PNG 动图</span></label>
        </div>
      </div>

      <div class="group">
        <h2 data-i18n="outputSize">输出尺寸</h2>
        <div class="twoCol">
          <label>
            <span data-i18n="width">宽度</span>
            <div class="field"><input id="widthInput" type="number" min="64" step="16" value="2048" /><small>px</small></div>
          </label>
          <label>
            <span data-i18n="height">高度</span>
            <div class="field"><input id="heightInput" type="number" min="64" step="16" value="1536" /><small>px</small></div>
          </label>
        </div>
        <div class="presetRow" aria-label="4:3 尺寸快捷选项">
          <button type="button" class="sizePreset active" data-scale="1">100%</button>
          <button type="button" class="sizePreset" data-scale="0.75">75%</button>
          <button type="button" class="sizePreset" data-scale="0.5">50%</button>
          <button type="button" class="sizePreset" data-scale="0.25">25%</button>
        </div>
        <div class="fpsSection">
          <label>
            <span data-i18n="renderFps">输出帧率</span>
            <div class="field"><input id="fpsInput" type="number" min="1" max="120" step="1" value="30" /><small>fps</small></div>
          </label>
          <div class="fpsPresetRow" aria-label="帧率快捷选项">
            <button type="button" class="fpsPreset" data-fps="12">12</button>
            <button type="button" class="fpsPreset" data-fps="24">24</button>
            <button type="button" class="fpsPreset" data-fps="36">36</button>
            <button type="button" class="fpsPreset" data-fps="60">60</button>
          </div>
        </div>
      </div>

      <div class="exportDock">
        <p id="exportStatus" class="exportStatus">等待模型</p>
        <button id="exportButton" class="exportButton" data-i18n="exportAnimation" disabled>导出动画</button>
        <div class="progress">
          <div id="progressBar"></div>
        </div>
      </div>
      </div>
    </aside>
  </main>
`;

const canvas = document.querySelector("#viewport");
const dropZone = document.querySelector("#dropZone");
const emptyState = document.querySelector("#emptyState");
const fileInput = document.querySelector("#fileInput");
const modelStatus = document.querySelector("#modelStatus");
const durationInput = document.querySelector("#durationInput");
const speedInput = document.querySelector("#speedInput");
const speedRange = document.querySelector("#speedRange");
const widthInput = document.querySelector("#widthInput");
const heightInput = document.querySelector("#heightInput");
const fpsInput = document.querySelector("#fpsInput");
const sizePresetButtons = document.querySelectorAll(".sizePreset");
const fpsPresetButtons = document.querySelectorAll(".fpsPreset");
const resetViewButton = document.querySelector("#resetViewButton");
const previewToggle = document.querySelector("#previewToggle");
const languageMenuButton = document.querySelector("#languageMenuButton");
const languageMenu = document.querySelector("#languageMenu");
const exportButton = document.querySelector("#exportButton");
const exportStatus = document.querySelector("#exportStatus");
const progressBar = document.querySelector("#progressBar");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1000);
camera.position.set(0, 1.2, 4);

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
  preserveDrawingBuffer: true,
});
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = false;

const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
keyLight.position.set(3, 4, 4);
const fillLight = new THREE.DirectionalLight(0x9fb8ff, 1.6);
fillLight.position.set(-4, 2, 3);
const rimLight = new THREE.DirectionalLight(0xfff2dc, 1.2);
rimLight.position.set(0, 3, -4);
scene.add(new THREE.HemisphereLight(0xffffff, 0x667085, 1.4), keyLight, fillLight, rimLight);

let modelRoot = null;
let modelFrame = null;
let initialView = null;
let sourceName = "turntable";
let lastTime = performance.now();
let isExporting = false;
let isPreviewPlaying = true;

const translations = {
  zh: { importModel: "导入模型", rotation: "旋转", clockwise: "顺时针", counterclockwise: "逆时针", duration: "整圈时长", seconds: "秒", speed: "旋转速度", degreesPerSecond: "度/秒", exportMode: "输出格式", pngSequence: "PNG 序列", pngAnimation: "PNG 动图", outputSize: "输出尺寸", width: "宽度", height: "高度", renderFps: "输出帧率", exportAnimation: "导出动画" },
  en: { importModel: "Import Model", rotation: "Rotation", clockwise: "Clockwise", counterclockwise: "Counterclockwise", duration: "Full Turn", seconds: "sec", speed: "Rotation Speed", degreesPerSecond: "deg/s", exportMode: "Output Format", pngSequence: "PNG Sequence", pngAnimation: "Animated PNG", outputSize: "Output Size", width: "Width", height: "Height", renderFps: "Output Frame Rate", exportAnimation: "Export Animation" },
  fr: { importModel: "Importer", rotation: "Rotation", clockwise: "Horaire", counterclockwise: "Antihoraire", duration: "Tour complet", seconds: "s", speed: "Vitesse", degreesPerSecond: "deg/s", exportMode: "Format de sortie", pngSequence: "Séquence PNG", pngAnimation: "PNG animé", outputSize: "Dimensions", width: "Largeur", height: "Hauteur", renderFps: "Fréquence de sortie", exportAnimation: "Exporter l’animation" },
  ja: { importModel: "モデル読込", rotation: "回転", clockwise: "時計回り", counterclockwise: "反時計回り", duration: "一周時間", seconds: "秒", speed: "回転速度", degreesPerSecond: "度/秒", exportMode: "出力形式", pngSequence: "PNG 連番", pngAnimation: "アニメ PNG", outputSize: "出力サイズ", width: "幅", height: "高さ", renderFps: "出力フレームレート", exportAnimation: "アニメを書き出す" },
  de: { importModel: "Modell laden", rotation: "Drehung", clockwise: "Im Uhrzeigersinn", counterclockwise: "Gegen Uhrzeigersinn", duration: "Volle Runde", seconds: "s", speed: "Drehgeschwindigkeit", degreesPerSecond: "Grad/s", exportMode: "Ausgabeformat", pngSequence: "PNG-Sequenz", pngAnimation: "Animiertes PNG", outputSize: "Ausgabegröße", width: "Breite", height: "Höhe", renderFps: "Ausgabebildrate", exportAnimation: "Animation exportieren" },
  ko: { importModel: "모델 가져오기", rotation: "회전", clockwise: "시계 방향", counterclockwise: "반시계 방향", duration: "한 바퀴 시간", seconds: "초", speed: "회전 속도", degreesPerSecond: "도/초", exportMode: "출력 형식", pngSequence: "PNG 시퀀스", pngAnimation: "애니메이션 PNG", outputSize: "출력 크기", width: "너비", height: "높이", renderFps: "출력 프레임 속도", exportAnimation: "애니메이션 내보내기" },
};

function setLanguage(language) {
  const dictionary = translations[language] || translations.zh;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = dictionary[element.dataset.i18n];
  });
  document.documentElement.lang = language;
}

function selectedMode() {
  return document.querySelector('input[name="mode"]:checked').value;
}

function rotationDirection() {
  return document.querySelector('input[name="direction"]:checked').value === "clockwise" ? 1 : -1;
}

function setProgress(value) {
  progressBar.style.width = `${Math.round(value * 100)}%`;
}

function resizePreview() {
  const rect = dropZone.getBoundingClientRect();
  const width = Math.max(320, Math.floor(rect.width));
  const height = Math.max(240, Math.floor(rect.height));
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function render() {
  renderer.render(scene, camera);
}

function frame(now) {
  const delta = (now - lastTime) / 1000;
  lastTime = now;

  if (modelRoot && !isExporting && isPreviewPlaying) {
    modelRoot.rotation.y += rotationDirection() * THREE.MathUtils.degToRad(Number(speedInput.value) || 90) * delta;
  }

  controls.update();
  render();
  requestAnimationFrame(frame);
}

function syncFromDuration() {
  const duration = Math.max(0.2, Number(durationInput.value) || 4);
  const speed = 360 / duration;
  speedInput.value = speed.toFixed(speed >= 100 ? 0 : 1);
  speedRange.value = String(Math.min(720, Math.max(15, speed)));
}

function syncFromSpeed() {
  const speed = Math.max(1, Number(speedInput.value) || 90);
  const duration = 360 / speed;
  durationInput.value = duration.toFixed(duration >= 10 ? 1 : 2);
  speedRange.value = String(Math.min(720, Math.max(15, speed)));
}

function measureObjectForTurntable(object, content) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  content.position.sub(center);

  box.setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const radialExtent = Math.max(
    Math.hypot(box.min.x, box.min.z),
    Math.hypot(box.min.x, box.max.z),
    Math.hypot(box.max.x, box.min.z),
    Math.hypot(box.max.x, box.max.z),
  );

  return {
    height: Math.max(size.y, 0.001),
    diameter: Math.max(radialExtent * 2, 0.001),
  };
}

function fitCameraToFrame(aspect = camera.aspect, requestedDirection = null) {
  if (!modelFrame) return;

  const direction = requestedDirection?.clone().normalize() || new THREE.Vector3(0, 0, 1);
  camera.position.copy(direction);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();

  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  const radius = modelFrame.diameter / 2;
  const halfHeight = modelFrame.height / 2;
  const envelopeExtent = (axis) => radius * Math.hypot(axis.x, axis.z) + halfHeight * Math.abs(axis.y);
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
  const verticalDistance = envelopeExtent(up) / Math.tan(verticalFov / 2);
  const horizontalDistance = envelopeExtent(right) / Math.tan(horizontalFov / 2);
  const depthAllowance = envelopeExtent(direction);
  const distance = depthAllowance + Math.max(verticalDistance, horizontalDistance) / 0.9;
  const extent = Math.max(modelFrame.height, modelFrame.diameter);

  camera.near = Math.max(distance - extent * 1.5, 0.001);
  camera.far = distance + extent * 2.5;
  camera.position.copy(direction.multiplyScalar(distance));
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  controls.target.set(0, 0, 0);
  controls.update();
}

function normalizeMaterials(object) {
  object.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        material.side = THREE.DoubleSide;
        material.needsUpdate = true;
      });
    }
  });
}

async function loadModel(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  const url = URL.createObjectURL(file);
  let loaded;

  try {
    if (extension === "glb" || extension === "gltf") {
      loaded = (await new GLTFLoader().loadAsync(url)).scene;
    } else if (extension === "obj") {
      loaded = await new OBJLoader().loadAsync(url);
    } else if (extension === "usdz") {
      const arrayBuffer = await file.arrayBuffer();
      loaded = await new USDZLoader().parse(arrayBuffer);
    } else {
      throw new Error("仅支持 USDZ、OBJ、GLB / GLTF。");
    }

    if (modelRoot) scene.remove(modelRoot);
    modelRoot = new THREE.Group();
    modelRoot.add(loaded);
    normalizeMaterials(modelRoot);
    scene.add(modelRoot);
    modelFrame = measureObjectForTurntable(modelRoot, loaded);
    fitCameraToFrame();
    initialView = {
      position: camera.position.clone(),
      target: controls.target.clone(),
      near: camera.near,
      far: camera.far,
    };
    sourceName = file.name.replace(/\.[^.]+$/, "");
    emptyState.classList.add("hidden");
    modelStatus.textContent = `${file.name} 已载入`;
    exportStatus.textContent = "可导出";
    exportButton.disabled = false;
    resetViewButton.disabled = false;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToPng() {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    }, "image/png");
  });
}

async function renderFrames({ width, height, fps, duration }) {
  const previewRect = dropZone.getBoundingClientRect();
  const previewSize = { width: previewRect.width, height: previewRect.height };
  const originalRotation = modelRoot.rotation.y;
  const originalCameraPosition = camera.position.clone();
  const originalCameraTarget = controls.target.clone();
  const originalNear = camera.near;
  const originalFar = camera.far;
  const frames = [];
  const frameCount = Math.max(1, Math.round(duration * fps));

  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.position.copy(originalCameraPosition);
  controls.target.copy(originalCameraTarget);
  camera.updateProjectionMatrix();

  const direction = rotationDirection();

  for (let index = 0; index < frameCount; index += 1) {
    modelRoot.rotation.y = originalRotation + direction * (index / frameCount) * Math.PI * 2;
    controls.update();
    render();
    frames.push(await canvasToPng());
    setProgress((index + 1) / frameCount * 0.72);
    exportStatus.textContent = `正在渲染 ${index + 1} / ${frameCount} 帧`;
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }

  modelRoot.rotation.y = originalRotation;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(previewSize.width, previewSize.height, false);
  camera.aspect = previewSize.width / previewSize.height;
  camera.position.copy(originalCameraPosition);
  controls.target.copy(originalCameraTarget);
  camera.near = originalNear;
  camera.far = originalFar;
  camera.updateProjectionMatrix();
  controls.update();
  return frames;
}

function safeBaseName(value) {
  return String(value).replace(/[^a-z0-9._-]+/gi, "_").replace(/^_+|_+$/g, "") || "turntable";
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportPngSequence(frames, baseName) {
  const zip = new JSZip();
  frames.forEach((frame, index) => {
    zip.file(`${baseName}_${String(index + 1).padStart(5, "0")}.png`, frame.split(",")[1], { base64: true });
  });
  return zip.generateAsync(
    { type: "blob", compression: "DEFLATE" },
    ({ percent }) => setProgress(0.82 + (percent / 100) * 0.17),
  );
}

async function loadBrowserFfmpeg() {
  exportStatus.textContent = "首次使用，正在加载编码器（约 31 MB）";
  if (!ffmpegCoreUrls) {
    ffmpegCoreUrls = Promise.all([
      toBlobURL(`${ffmpegCoreBase}/ffmpeg-core.js`, "text/javascript"),
      toBlobURL(`${ffmpegCoreBase}/ffmpeg-core.wasm`, "application/wasm"),
    ]);
  }

  const [coreURL, wasmURL] = await ffmpegCoreUrls;
  const ffmpeg = new FFmpeg();
  let latestLog = "";
  ffmpeg.on("log", ({ message }) => {
    latestLog = message;
  });
  ffmpeg.on("progress", ({ progress }) => {
    if (Number.isFinite(progress)) setProgress(0.84 + Math.min(1, Math.max(0, progress)) * 0.15);
  });
  await ffmpeg.load({ coreURL, wasmURL });
  return { ffmpeg, getLatestLog: () => latestLog };
}

async function exportAnimatedFile({ mode, frames, fps, baseName }) {
  const { ffmpeg, getLatestLog } = await loadBrowserFfmpeg();
  const frameNames = frames.map((_, index) => `frame_${String(index).padStart(5, "0")}.png`);
  let outputName;
  let mimeType;
  let args;

  if (mode === "mov") {
    outputName = `${baseName}_prores4444.mov`;
    mimeType = "video/quicktime";
    args = [
      "-framerate", String(fps), "-i", "frame_%05d.png",
      "-c:v", "prores_ks", "-profile:v", "4", "-pix_fmt", "yuva444p10le", "-vendor", "apl0",
      outputName,
    ];
  } else if (mode === "gif") {
    outputName = `${baseName}.gif`;
    mimeType = "image/gif";
    args = [
      "-framerate", String(fps), "-i", "frame_%05d.png",
      "-filter_complex",
      "[0:v]split[s0][s1];[s0]palettegen=reserve_transparent=on:stats_mode=single[p];[s1][p]paletteuse=alpha_threshold=128",
      "-loop", "0", outputName,
    ];
  } else {
    outputName = `${baseName}.png`;
    mimeType = "image/png";
    args = ["-framerate", String(fps), "-i", "frame_%05d.png", "-plays", "0", "-f", "apng", outputName];
  }

  try {
    for (let index = 0; index < frames.length; index += 1) {
      await ffmpeg.writeFile(frameNames[index], await fetchFile(frames[index]));
      setProgress(0.72 + ((index + 1) / frames.length) * 0.1);
      exportStatus.textContent = `正在准备编码 ${index + 1} / ${frames.length} 帧`;
    }

    exportStatus.textContent = "正在浏览器中编码，请保持页面开启";
    const exitCode = await ffmpeg.exec(args);
    if (exitCode !== 0) throw new Error(getLatestLog() || `编码器退出，错误码 ${exitCode}`);
    const output = await ffmpeg.readFile(outputName);
    return { blob: new Blob([output.buffer], { type: mimeType }), filename: outputName };
  } finally {
    await Promise.allSettled([...frameNames, outputName].map((name) => ffmpeg.deleteFile(name)));
    ffmpeg.terminate();
  }
}

async function exportTurntable() {
  if (!modelRoot || isExporting) return;
  isExporting = true;
  exportButton.disabled = true;
  setProgress(0);

  const mode = selectedMode();
  const width = Math.max(64, Math.round(Number(widthInput.value) || 2048));
  const height = Math.max(64, Math.round(Number(heightInput.value) || 1536));
  const fps = Math.max(1, Math.min(120, Math.round(Number(fpsInput.value) || 30)));
  const duration = Math.max(0.2, Number(durationInput.value) || 4);

  try {
    const frames = await renderFrames({ width, height, fps, duration });
    exportStatus.textContent = "正在编码导出文件";
    setProgress(0.82);
    const baseName = safeBaseName(sourceName);
    let blob;
    let filename;

    if (mode === "png") {
      blob = await exportPngSequence(frames, baseName);
      filename = `${baseName}_png_sequence.zip`;
    } else {
      ({ blob, filename } = await exportAnimatedFile({ mode, frames, fps, baseName }));
    }

    downloadBlob(blob, filename);
    setProgress(1);
    exportStatus.textContent = `${filename} 已生成`;
  } catch (error) {
    exportStatus.textContent = error.message;
  } finally {
    isExporting = false;
    exportButton.disabled = false;
    resizePreview();
  }
}

durationInput.addEventListener("input", syncFromDuration);
speedInput.addEventListener("input", syncFromSpeed);
speedRange.addEventListener("input", () => {
  speedInput.value = speedRange.value;
  syncFromSpeed();
});

sizePresetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const scale = Number(button.dataset.scale);
    widthInput.value = String(Math.round(2048 * scale));
    heightInput.value = String(Math.round(1536 * scale));
    sizePresetButtons.forEach((item) => item.classList.toggle("active", item === button));
  });
});

[widthInput, heightInput].forEach((input) => {
  input.addEventListener("input", () => {
    sizePresetButtons.forEach((button) => button.classList.remove("active"));
  });
});

fpsPresetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    fpsInput.value = button.dataset.fps;
    fpsPresetButtons.forEach((item) => item.classList.toggle("active", item === button));
  });
});

fpsInput.addEventListener("input", () => {
  fpsPresetButtons.forEach((button) => button.classList.remove("active"));
});

resetViewButton.addEventListener("click", () => {
  if (!modelRoot || !initialView) return;
  camera.position.copy(initialView.position);
  controls.target.copy(initialView.target);
  camera.near = initialView.near;
  camera.far = initialView.far;
  camera.updateProjectionMatrix();
  modelRoot.rotation.y = 0;
  controls.update();
});

previewToggle.addEventListener("click", () => {
  isPreviewPlaying = !isPreviewPlaying;
  previewToggle.classList.toggle("paused", !isPreviewPlaying);
  previewToggle.textContent = isPreviewPlaying ? "Ⅱ" : "▶";
  previewToggle.setAttribute("aria-label", isPreviewPlaying ? "暂停预览" : "播放预览");
  previewToggle.title = isPreviewPlaying ? "暂停预览" : "播放预览";
});

languageMenuButton.addEventListener("click", () => {
  languageMenu.hidden = !languageMenu.hidden;
  languageMenuButton.setAttribute("aria-expanded", String(!languageMenu.hidden));
});

languageMenu.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-lang]");
  if (!button) return;
  setLanguage(button.dataset.lang);
  languageMenu.hidden = true;
  languageMenuButton.setAttribute("aria-expanded", "false");
});

document.addEventListener("click", (event) => {
  if (event.target.closest("#languageMenuButton, #languageMenu")) return;
  languageMenu.hidden = true;
  languageMenuButton.setAttribute("aria-expanded", "false");
});

fileInput.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  modelStatus.textContent = "正在载入模型";
  exportStatus.textContent = "载入中";
  try {
    await loadModel(file);
  } catch (error) {
    modelStatus.textContent = error.message;
    exportStatus.textContent = "载入失败";
  }
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("dragging");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragging");
});

dropZone.addEventListener("drop", async (event) => {
  event.preventDefault();
  dropZone.classList.remove("dragging");
  const [file] = event.dataTransfer.files;
  if (!file) return;
  try {
    await loadModel(file);
  } catch (error) {
    modelStatus.textContent = error.message;
    exportStatus.textContent = "载入失败";
  }
});

exportButton.addEventListener("click", exportTurntable);
window.addEventListener("resize", resizePreview);

syncFromDuration();
resizePreview();
requestAnimationFrame(frame);
