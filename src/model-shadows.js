import * as THREE from 'three';

// C号 uses SCNShadowMode.deferred + black shadowColor(alpha: strength).
// Apply the occlusion mask to the completed linear lighting, before exposure/ACES.
// Three's default forward path shadows only the key light and leaves ambient/fill
// untouched. Disable that term here so the key light is not shadowed twice.
export function installModelShadows(material) {
  if (material.userData.modelDeferredShadow || !(
    material.isMeshStandardMaterial || material.isMeshPhongMaterial || material.isMeshLambertMaterial
  )) return;
  material.userData.modelDeferredShadow = true;
  const previousCompile = material.onBeforeCompile;
  const previousKey = material.customProgramCacheKey();
  material.onBeforeCompile = function (shader, renderer) {
    previousCompile.call(this, shader, renderer);
    const forward = THREE.ShaderChunk.lights_fragment_begin.replace(
      /^.*directLight\.color \*=.*getShadow\( directionalShadowMap\[ i \].*$/m,
      '// Directional shadow is composited once after lighting.',
    );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <shadowmap_pars_fragment>',
        '#include <shadowmap_pars_fragment>\n#include <shadowmask_pars_fragment>')
      .replace('#include <lights_fragment_begin>', forward)
      .replace('#include <opaque_fragment>',
        'outgoingLight *= getShadowMask();\n#include <opaque_fragment>');
  };
  material.customProgramCacheKey = () => `${previousKey}|model-deferred-shadow-v1`;
  material.needsUpdate = true;
}

export function normalizedModelContent(object) {
  const content = new THREE.Group();
  content.add(object);
  const size = new THREE.Box3().setFromObject(content).getSize(new THREE.Vector3());
  const longest = Math.max(size.x, size.y, size.z);
  if (Number.isFinite(longest) && longest > 0) content.scale.setScalar(4 / longest);
  return content;
}
