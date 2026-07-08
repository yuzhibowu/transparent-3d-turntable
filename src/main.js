import "./styles.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { USDZLoader } from "three/examples/jsm/loaders/USDZLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
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
      <div class="languageControl stageLanguageControl">
        <button id="languageMenuButton" class="languageMenuButton" type="button" aria-label="切换语言" title="切换语言" aria-expanded="false">⌄</button>
        <span>language</span>
        <div id="languageMenu" class="languageMenu" hidden>
          <button type="button" data-lang="zh">中文</button>
          <button type="button" data-lang="en">English</button>
          <button type="button" data-lang="fr">Français</button>
        </div>
      </div>
      <nav class="socialDock" aria-label="社交链接">
        <div class="wechatContact">
          <button id="wechatButton" class="socialIconButton" type="button" aria-label="微信：Freefromboy" aria-expanded="false">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 4C4.81 4 1 7.08 1 10.88c0 2.19 1.28 4.14 3.27 5.4L3.5 19l3.14-1.57c.91.25 1.87.38 2.86.38.29 0 .58-.01.86-.04a6.38 6.38 0 0 1-.36-2.1c0-3.72 3.35-6.75 7.5-6.75.08 0 .17 0 .25.01C16.7 6.06 13.47 4 9.5 4Zm-2.82 5.2a1.05 1.05 0 1 1 0-2.1 1.05 1.05 0 0 1 0 2.1Zm5.64 0a1.05 1.05 0 1 1 0-2.1 1.05 1.05 0 0 1 0 2.1Z"/><path d="M23 15.67c0-3.19-3.08-5.78-6.88-5.78s-6.87 2.59-6.87 5.78 3.08 5.78 6.87 5.78c.8 0 1.58-.12 2.3-.33L21 22.4l-.62-2.22C21.98 19.12 23 17.51 23 15.67Zm-9.17-1.36a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Zm4.58 0a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Z"/></svg>
          </button>
          <span id="wechatBubble" class="wechatBubble" role="status" hidden>Freefromboy</span>
        </div>
        <a class="socialIconLink youtubeIcon" href="https://www.youtube.com/@wqsyyzx" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.13C19.54 3.56 12 3.56 12 3.56s-7.54 0-9.4.51A3 3 0 0 0 .5 6.2 31.2 31.2 0 0 0 0 12a31.2 31.2 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.13c1.86.51 9.4.51 9.4.51s7.54 0 9.4-.51a3 3 0 0 0 2.1-2.13A31.2 31.2 0 0 0 24 12a31.2 31.2 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.23 3.6-6.23 3.6Z"/></svg>
        </a>
        <a class="socialIconLink xiaohongshuIcon" href="https://xhslink.com/m/6haeQAMgARs" target="_blank" rel="noopener noreferrer" aria-label="小红书">
          <img src="/xiaohongshu.svg" alt="" />
        </a>
        <a class="socialIconLink githubIcon" href="https://github.com/yuzhibowu/transparent-3d-turntable" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.23c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.3c0 .32.22.7.82.58A12 12 0 0 0 12 .5Z"/></svg>
        </a>
      </nav>
    </section>

    <aside class="panel">
      <header class="panelHeader">
        <button id="lightingPanelButton" class="lightingPanelButton" type="button" aria-controls="lightingPanel" aria-expanded="false" data-i18n="lightingPanel">灯光与画面</button>
        <div class="panelHeaderTop">
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
      <section id="lightingPanel" class="lightingPanel" aria-labelledby="lightingPanelTitle" hidden>
        <div class="lightingPanelHeader">
          <h2 id="lightingPanelTitle" data-i18n="lightingPanel">灯光与画面</h2>
          <button id="lightingPanelClose" type="button" aria-label="关闭灯光与画面面板">×</button>
        </div>
        <div class="lightingControls">
          <label class="lightingRange"><span data-i18n="exposure">曝光</span><output data-setting-output="exposure">1.15</output><input data-render-setting="exposure" type="range" min="0.25" max="2.5" step="0.05" value="1.15" /></label>
          <label class="lightingRange"><span data-i18n="environmentIntensity">环境光强度</span><output data-setting-output="environmentIntensity">1.35</output><input data-render-setting="environmentIntensity" type="range" min="0" max="3" step="0.05" value="1.35" /></label>
          <label class="lightingRange"><span data-i18n="keyLightIntensity">主光强度</span><output data-setting-output="keyLightIntensity">3.20</output><input data-render-setting="keyLightIntensity" type="range" min="0" max="8" step="0.1" value="3.2" /></label>
          <label class="lightingRange"><span data-i18n="fillLightIntensity">补光强度</span><output data-setting-output="fillLightIntensity">1.80</output><input data-render-setting="fillLightIntensity" type="range" min="0" max="6" step="0.1" value="1.8" /></label>
          <label class="lightingRange"><span data-i18n="shadowIntensity">阴影强度</span><output data-setting-output="shadowIntensity">0.35</output><input data-render-setting="shadowIntensity" type="range" min="0" max="1" step="0.05" value="0.35" /></label>
          <label class="lightingColor"><span data-i18n="backgroundColor">背景颜色</span><input id="backgroundColorInput" data-render-setting="backgroundColor" type="color" value="#f2f2f2" /></label>
          <label class="transparentBackground"><input id="transparentBackgroundInput" type="checkbox" checked /><span data-i18n="transparentBackground">透明背景</span></label>
          <label class="toneMappingControl"><span data-i18n="toneMapping">色调映射</span><select id="toneMappingSelect"><option value="aces">ACES</option><option value="linear">Linear</option></select></label>
          <div class="compositionSection">
            <h3 data-i18n="compositionPosition">构图位置</h3>
            <label class="lightingRange"><span data-i18n="horizontalPosition">水平位置</span><output data-setting-output="offsetX">0</output><input data-render-setting="offsetX" type="range" min="-50" max="50" step="1" value="0" /></label>
            <label class="lightingRange"><span data-i18n="verticalPosition">垂直位置</span><output data-setting-output="offsetY">0</output><input data-render-setting="offsetY" type="range" min="-50" max="50" step="1" value="0" /></label>
            <button id="centerModelButton" class="centerModelButton" type="button" data-i18n="centerModel">模型居中</button>
          </div>
        </div>
        <button id="resetLightingButton" class="resetLightingButton" type="button" data-i18n="resetLighting">恢复影棚默认值</button>
      </section>
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
const wechatButton = document.querySelector("#wechatButton");
const wechatBubble = document.querySelector("#wechatBubble");
const previewToggle = document.querySelector("#previewToggle");
const languageMenuButton = document.querySelector("#languageMenuButton");
const languageMenu = document.querySelector("#languageMenu");
const exportButton = document.querySelector("#exportButton");
const exportStatus = document.querySelector("#exportStatus");
const progressBar = document.querySelector("#progressBar");
const lightingPanelButton = document.querySelector("#lightingPanelButton");
const lightingPanel = document.querySelector("#lightingPanel");
const lightingPanelClose = document.querySelector("#lightingPanelClose");
const lightingSettingInputs = document.querySelectorAll("[data-render-setting]");
const transparentBackgroundInput = document.querySelector("#transparentBackgroundInput");
const toneMappingSelect = document.querySelector("#toneMappingSelect");
const resetLightingButton = document.querySelector("#resetLightingButton");
const centerModelButton = document.querySelector("#centerModelButton");

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
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = false;

const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
keyLight.position.set(3, 4, 4);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.bias = -0.0003;
const fillLight = new THREE.DirectionalLight(0x9fb8ff, 1.6);
fillLight.position.set(-4, 2, 3);
const rimLight = new THREE.DirectionalLight(0xfff2dc, 1.2);
rimLight.position.set(0, 3, -4);
const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x667085, 1.4);
scene.add(hemisphereLight, keyLight, fillLight, rimLight);

const environmentGenerator = new THREE.PMREMGenerator(renderer);
const environmentScene = new RoomEnvironment();
const studioEnvironment = environmentGenerator.fromScene(environmentScene, 0.04).texture;
environmentScene.dispose();
environmentGenerator.dispose();
scene.environment = studioEnvironment;

const defaultRenderSettings = Object.freeze({
  exposure: 1.15,
  environmentIntensity: 1.35,
  keyLightIntensity: 3.2,
  fillLightIntensity: 1.8,
  shadowIntensity: 0.35,
  backgroundColor: "#f2f2f2",
  transparentBackground: true,
  toneMapping: "aces",
  offsetX: 0,
  offsetY: 0,
});
const renderSettings = { ...defaultRenderSettings };

let modelRoot = null;
let modelFrame = null;
let initialView = null;
let sourceName = "turntable";
let lastTime = performance.now();
let isExporting = false;
let isPreviewPlaying = true;

const translations = {
  zh: { importModel: "导入模型", rotation: "旋转", clockwise: "顺时针", counterclockwise: "逆时针", duration: "整圈时长", seconds: "秒", speed: "旋转速度", degreesPerSecond: "度/秒", exportMode: "输出格式", pngSequence: "PNG 序列", pngAnimation: "PNG 动图", outputSize: "输出尺寸", width: "宽度", height: "高度", renderFps: "输出帧率", exportAnimation: "导出动画", lightingPanel: "灯光与画面", exposure: "曝光", environmentIntensity: "环境光强度", keyLightIntensity: "主光强度", fillLightIntensity: "补光强度", shadowIntensity: "阴影强度", backgroundColor: "背景颜色", transparentBackground: "透明背景", toneMapping: "色调映射", compositionPosition: "构图位置", horizontalPosition: "水平位置", verticalPosition: "垂直位置", centerModel: "模型居中", resetLighting: "恢复影棚默认值" },
  en: { importModel: "Import Model", rotation: "Rotation", clockwise: "Clockwise", counterclockwise: "Counterclockwise", duration: "Full Turn", seconds: "sec", speed: "Rotation Speed", degreesPerSecond: "deg/s", exportMode: "Output Format", pngSequence: "PNG Sequence", pngAnimation: "Animated PNG", outputSize: "Output Size", width: "Width", height: "Height", renderFps: "Output Frame Rate", exportAnimation: "Export Animation", lightingPanel: "Lighting & Image", exposure: "Exposure", environmentIntensity: "Environment", keyLightIntensity: "Key Light", fillLightIntensity: "Fill Light", shadowIntensity: "Shadows", backgroundColor: "Background", transparentBackground: "Transparent Background", toneMapping: "Tone Mapping", compositionPosition: "Composition", horizontalPosition: "Horizontal Position", verticalPosition: "Vertical Position", centerModel: "Center Model", resetLighting: "Reset Studio Lighting" },
  fr: { importModel: "Importer", rotation: "Rotation", clockwise: "Horaire", counterclockwise: "Antihoraire", duration: "Tour complet", seconds: "s", speed: "Vitesse", degreesPerSecond: "deg/s", exportMode: "Format de sortie", pngSequence: "Séquence PNG", pngAnimation: "PNG animé", outputSize: "Dimensions", width: "Largeur", height: "Hauteur", renderFps: "Fréquence de sortie", exportAnimation: "Exporter l’animation", lightingPanel: "Lumière & Image", exposure: "Exposition", environmentIntensity: "Environnement", keyLightIntensity: "Lumière principale", fillLightIntensity: "Lumière d’appoint", shadowIntensity: "Ombres", backgroundColor: "Arrière-plan", transparentBackground: "Fond transparent", toneMapping: "Mappage tonal", compositionPosition: "Composition", horizontalPosition: "Position horizontale", verticalPosition: "Position verticale", centerModel: "Centrer le modèle", resetLighting: "Réinitialiser le studio" },
  ja: { importModel: "モデル読込", rotation: "回転", clockwise: "時計回り", counterclockwise: "反時計回り", duration: "一周時間", seconds: "秒", speed: "回転速度", degreesPerSecond: "度/秒", exportMode: "出力形式", pngSequence: "PNG 連番", pngAnimation: "アニメ PNG", outputSize: "出力サイズ", width: "幅", height: "高さ", renderFps: "出力フレームレート", exportAnimation: "アニメを書き出す" },
  de: { importModel: "Modell laden", rotation: "Drehung", clockwise: "Im Uhrzeigersinn", counterclockwise: "Gegen Uhrzeigersinn", duration: "Volle Runde", seconds: "s", speed: "Drehgeschwindigkeit", degreesPerSecond: "Grad/s", exportMode: "Ausgabeformat", pngSequence: "PNG-Sequenz", pngAnimation: "Animiertes PNG", outputSize: "Ausgabegröße", width: "Breite", height: "Höhe", renderFps: "Ausgabebildrate", exportAnimation: "Animation exportieren" },
  ko: { importModel: "모델 가져오기", rotation: "회전", clockwise: "시계 방향", counterclockwise: "반시계 방향", duration: "한 바퀴 시간", seconds: "초", speed: "회전 속도", degreesPerSecond: "도/초", exportMode: "출력 형식", pngSequence: "PNG 시퀀스", pngAnimation: "애니메이션 PNG", outputSize: "출력 크기", width: "너비", height: "높이", renderFps: "출력 프레임 속도", exportAnimation: "애니메이션 내보내기" },
};

function updateMaterialEnvironment(object = modelRoot) {
  if (!object) return;
  object.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if ("envMapIntensity" in material) material.envMapIntensity = renderSettings.environmentIntensity;
      material.needsUpdate = true;
    });
  });
}

function applyModelOffset() {
  if (!modelRoot || !modelFrame) return;
  camera.updateMatrixWorld();
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  modelRoot.position
    .copy(right.multiplyScalar((renderSettings.offsetX / 100) * modelFrame.diameter))
    .add(up.multiplyScalar((renderSettings.offsetY / 100) * modelFrame.height));
}

function formatSettingValue(key, value) {
  return key === "offsetX" || key === "offsetY" ? `${Math.round(Number(value))}%` : Number(value).toFixed(2);
}

function applyRenderSettings() {
  renderer.toneMapping = renderSettings.toneMapping === "linear" ? THREE.LinearToneMapping : THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = renderSettings.exposure;
  scene.environmentIntensity = renderSettings.environmentIntensity;
  hemisphereLight.intensity = renderSettings.environmentIntensity * 0.9;
  keyLight.intensity = renderSettings.keyLightIntensity;
  fillLight.intensity = renderSettings.fillLightIntensity;
  keyLight.shadow.intensity = renderSettings.shadowIntensity;
  renderer.setClearColor(renderSettings.backgroundColor, renderSettings.transparentBackground ? 0 : 1);
  dropZone.style.setProperty("--preview-background", renderSettings.backgroundColor);
  updateMaterialEnvironment();
  applyModelOffset();
}

function syncLightingControls() {
  lightingSettingInputs.forEach((input) => {
    input.value = renderSettings[input.dataset.renderSetting];
    const output = document.querySelector(`[data-setting-output="${input.dataset.renderSetting}"]`);
    if (output) output.value = formatSettingValue(input.dataset.renderSetting, input.value);
  });
  transparentBackgroundInput.checked = renderSettings.transparentBackground;
  toneMappingSelect.value = renderSettings.toneMapping;
}

function configureShadowCamera() {
  if (!modelFrame) return;
  const extent = Math.max(modelFrame.height, modelFrame.diameter, 0.01);
  const shadowCamera = keyLight.shadow.camera;
  shadowCamera.left = -extent;
  shadowCamera.right = extent;
  shadowCamera.top = extent;
  shadowCamera.bottom = -extent;
  shadowCamera.near = Math.max(extent * 0.01, 0.001);
  shadowCamera.far = extent * 12;
  keyLight.position.set(extent * 3, extent * 4, extent * 4);
  keyLight.shadow.bias = -0.0002 * extent;
  shadowCamera.updateProjectionMatrix();
}

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
  const width = Math.max(320, Math.floor(dropZone.clientWidth));
  const height = Math.max(240, Math.floor(dropZone.clientHeight));
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
  applyModelOffset();
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
        if ("envMapIntensity" in material) material.envMapIntensity = renderSettings.environmentIntensity;
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
    configureShadowCamera();
    fitCameraToFrame();
    applyModelOffset();
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

async function renderFrames({ width, height, fps, duration, forceTransparent = false }) {
  const previewSize = { width: dropZone.clientWidth, height: dropZone.clientHeight };
  const originalRotation = modelRoot.rotation.y;
  const originalCameraPosition = camera.position.clone();
  const originalCameraTarget = controls.target.clone();
  const originalNear = camera.near;
  const originalFar = camera.far;
  const frames = [];
  const frameCount = Math.max(1, Math.round(duration * fps));

  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  applyRenderSettings();
  if (forceTransparent) renderer.setClearAlpha(0);
  camera.aspect = width / height;
  camera.position.copy(originalCameraPosition);
  controls.target.copy(originalCameraTarget);
  camera.updateProjectionMatrix();

  const direction = rotationDirection();

  for (let index = 0; index < frameCount; index += 1) {
    modelRoot.rotation.y = originalRotation + direction * (index / frameCount) * Math.PI * 2;
    controls.update();
    applyModelOffset();
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
  applyModelOffset();
  applyRenderSettings();
  return frames;
}

async function frameHasTransparency(dataUrl) {
  const bitmap = await createImageBitmap(await (await fetch(dataUrl)).blob());
  const sampleCanvas = document.createElement("canvas");
  sampleCanvas.width = 16;
  sampleCanvas.height = 16;
  const context = sampleCanvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(bitmap, 0, 0, 16, 16);
  bitmap.close();
  const pixels = context.getImageData(0, 0, 16, 16).data;
  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] < 255) return true;
  }
  return false;
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
  const logs = [];
  ffmpeg.on("log", ({ message }) => {
    latestLog = message;
    logs.push(message);
  });
  ffmpeg.on("progress", ({ progress }) => {
    if (Number.isFinite(progress)) setProgress(0.84 + Math.min(1, Math.max(0, progress)) * 0.15);
  });
  await ffmpeg.load({ coreURL, wasmURL });
  return { ffmpeg, getLatestLog: () => latestLog, getLogs: () => logs.join("\n") };
}

async function exportAnimatedFile({ mode, frames, fps, baseName }) {
  const { ffmpeg, getLatestLog, getLogs } = await loadBrowserFfmpeg();
  const frameNames = frames.map((_, index) => `frame_${String(index).padStart(5, "0")}.png`);
  let outputName;
  let mimeType;
  let args;

  if (mode === "mov") {
    outputName = `${baseName}_prores4444.mov`;
    mimeType = "video/quicktime";
    args = [
      "-framerate", String(fps), "-i", "frame_%05d.png",
      "-c:v", "prores_ks", "-profile:v", "4", "-pix_fmt", "yuva444p10le",
      "-alpha_bits", "16", "-vtag", "ap4h", "-vendor", "apl0",
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
    if (mode === "mov" && !/Video: prores \(ap4h[\s\S]*yuva444p10le/.test(getLogs())) {
      throw new Error("MOV 编码结果未通过 ProRes 4444 Alpha 校验。");
    }
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
    const frames = await renderFrames({ width, height, fps, duration, forceTransparent: mode === "mov" });
    if (mode === "mov" && !(await frameHasTransparency(frames[0]))) {
      throw new Error("透明帧校验失败，请重新导出 MOV。");
    }
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

function setLightingPanelOpen(open) {
  lightingPanel.hidden = !open;
  lightingPanelButton.setAttribute("aria-expanded", String(open));
}

lightingPanelButton.addEventListener("click", () => {
  setLightingPanelOpen(lightingPanel.hidden);
});

lightingPanelClose.addEventListener("click", () => setLightingPanelOpen(false));

lightingSettingInputs.forEach((input) => {
  input.addEventListener("input", () => {
    const key = input.dataset.renderSetting;
    renderSettings[key] = input.type === "color" ? input.value : Number(input.value);
    const output = document.querySelector(`[data-setting-output="${key}"]`);
    if (output) output.value = formatSettingValue(key, input.value);
    applyRenderSettings();
  });
});

transparentBackgroundInput.addEventListener("change", () => {
  renderSettings.transparentBackground = transparentBackgroundInput.checked;
  applyRenderSettings();
});

toneMappingSelect.addEventListener("change", () => {
  renderSettings.toneMapping = toneMappingSelect.value;
  applyRenderSettings();
});

resetLightingButton.addEventListener("click", () => {
  const { offsetX, offsetY } = renderSettings;
  Object.assign(renderSettings, defaultRenderSettings);
  renderSettings.offsetX = offsetX;
  renderSettings.offsetY = offsetY;
  syncLightingControls();
  applyRenderSettings();
});

centerModelButton.addEventListener("click", () => {
  renderSettings.offsetX = 0;
  renderSettings.offsetY = 0;
  syncLightingControls();
  applyModelOffset();
});

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

wechatButton.addEventListener("click", (event) => {
  event.stopPropagation();
  const willOpen = wechatBubble.hidden;
  wechatBubble.hidden = !willOpen;
  wechatButton.setAttribute("aria-expanded", String(willOpen));
});

document.addEventListener("click", () => {
  wechatBubble.hidden = true;
  wechatButton.setAttribute("aria-expanded", "false");
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
syncLightingControls();
applyRenderSettings();
resizePreview();
requestAnimationFrame(frame);
