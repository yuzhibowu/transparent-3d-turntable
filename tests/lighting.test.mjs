import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as THREE from 'three';
// Execute the actual application lighting path against real Three.js scene objects.
const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const context = { THREE, updateSliderTracks() {}, renderer: {}, scene: new THREE.Scene(), modelRoot: new THREE.Group(),
  modelFrame: { diameter: 200, height: 100 }, hemisphereLight: new THREE.AmbientLight(),
  keyLight: new THREE.DirectionalLight(), fillLight: new THREE.DirectionalLight(),
  toneMappingPresetButtons: [], lightingPresetButtons: [] };
for (const name of ['exposure','environment','keyLight','fillLight','shadow','lightAngle','lightAngleX']) {
  context[name + 'Range'] = {}; context[name + 'Value'] = {};
}
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('const lightingDefaults'), source.indexOf('function applyModelOffset')), context);
const run = (code) => vm.runInContext(code, context);
run('applyRenderSettings()');
assert.equal(context.keyLight.intensity, .68);
assert.equal(context.keyLight.castShadow, false);
run('Object.assign(renderSettings, {environmentIntensity: 0, keyLightIntensity: 0, fillLightIntensity: 0}); applyRenderSettings()');
assert.equal(context.scene.environmentIntensity + context.hemisphereLight.intensity + context.keyLight.intensity + context.fillLight.intensity, 0);
run('Object.assign(renderSettings, lightingDefaults, {shadowIntensity: 1}); modelRoot.position.set(20,30,40); applyRenderSettings()');
assert.equal(context.keyLight.castShadow, true);
assert.deepEqual(context.keyLight.target.position.toArray(), [20,30,40]);
assert.ok(context.keyLight.shadow.camera.right > 100);
const before = context.keyLight.position.clone();
run('renderSettings.keyAngleX = 45; applyRenderSettings()');
assert.ok(before.distanceTo(context.keyLight.position) > 1);
assert.equal(context.fillLight.intensity, .26);
run('renderSettings.environmentIntensity = 2; applyRenderSettings()');
assert.equal(context.scene.environmentIntensity, 2);
assert.equal(context.keyLight.intensity, .68);
console.log('Lighting regression checks passed: defaults, blackout, shadow bounds, target, independent angles/intensities.');

const { installModelShadows, normalizedModelContent } = await import('../src/model-shadows.js');
for (const Material of [THREE.MeshPhysicalMaterial, THREE.MeshStandardMaterial, THREE.MeshPhongMaterial, THREE.MeshLambertMaterial]) {
 const material = new Material(); installModelShadows(material);
 const shader = {fragmentShader: THREE.ShaderLib[material.isMeshStandardMaterial ? 'physical' : material.isMeshPhongMaterial ? 'phong' : 'lambert'].fragmentShader};
 material.onBeforeCompile(shader, {});
 assert.ok(shader.fragmentShader.includes('outgoingLight *= getShadowMask();'));
 assert.ok(!shader.fragmentShader.includes('getShadow( directionalShadowMap[ i ]'));
 assert.ok(shader.fragmentShader.indexOf('outgoingLight *=') < shader.fragmentShader.indexOf('#include <tonemapping_fragment>'));
 const hook = material.onBeforeCompile;installModelShadows(material);assert.equal(material.onBeforeCompile, hook);
}
for (const scale of [.0001, 1, 10000]) {
 const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 1), new THREE.MeshStandardMaterial());
 mesh.scale.setScalar(scale);mesh.position.set(15*scale, -30*scale, 8*scale);
 const normalized = normalizedModelContent(mesh);
 const bounds = new THREE.Box3().setFromObject(normalized).getSize(new THREE.Vector3());
 assert.ok(Math.abs(Math.max(bounds.x,bounds.y,bounds.z)-4)<1e-8);
}
assert.ok(source.indexOf('data-tone-mapping="aces"') < source.indexOf('data-tone-mapping="linear"'));
console.log('Deferred shadow stage, no double shadow, normalized model sizes and ACES-first order passed.');
