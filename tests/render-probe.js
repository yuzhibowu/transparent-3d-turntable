import * as THREE from 'three';
import {loadModel, render, renderer, scene, camera, renderSettings, applyRenderSettings, renderFrames} from '../src/main.js';
const output = document.querySelector('#test-results');
const log = data => output.textContent += JSON.stringify(data) + '\n';
const assert = (condition, message) => { if (!condition) throw new Error(message); };
document.querySelector('#previewToggle').click();
async function test(file) {
 output.textContent = '';
 try {
  await loadModel(file);
  // Allow texture requests from the model's loader to settle before comparing frames.
  await new Promise(resolve => setTimeout(resolve, 1500));
  const root = scene.children.find(node => node.isGroup);
  const bounds = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
  assert(Math.abs(Math.max(bounds.x,bounds.y,bounds.z)-4)<1e-5,'Model scale was not normalized');
  renderer.setPixelRatio(1);renderer.setSize(512,512,false);camera.aspect=1;camera.updateProjectionMatrix();
  Object.assign(renderSettings,{exposure:1,keyLightIntensity:.68,environmentIntensity:.42,fillLightIntensity:.26,keyAngleX:-35,keyAngle:40,toneMapping:'aces'});
  function capture(strength) {
   renderSettings.shadowIntensity=strength;applyRenderSettings();render();
   const gl=renderer.getContext(),pixels=new Uint8Array(512*512*4);
   gl.readPixels(0,0,512,512,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return pixels;
  }
  function stats(off,on) {
   let difference=0,changed=0,count=0;
   for(let i=0;i<off.length;i+=4) {
    assert(off[i+3]===on[i+3],'Shadows changed transparent silhouette');
    if(off[i+3]>128){count++;let d=0;for(let j=0;j<3;j++) d+=off[i+j]-on[i+j];difference+=d;if(d>3)changed++;}
   }
   return {meanDarkening:difference/count/3,changedPixels:changed};
  }
  for(const degrees of [0,90,180,270]) {
   root.rotation.y=THREE.MathUtils.degToRad(degrees);
   const off=capture(0),half=capture(.5),on=capture(1),back=capture(0);
   const mid=stats(off,half),full=stats(off,on),restored=stats(off,back);
   assert(full.meanDarkening>.5,`Shadow has no visible effect at ${degrees}°`);
   assert(mid.meanDarkening>0 && mid.meanDarkening<full.meanDarkening,'Shadow strength is not monotonic');
   assert(restored.meanDarkening===0,'Turning shadow off did not restore frame');
   log({degrees,half:mid,full,restored:true,alphaUnchanged:true});
  }
  root.rotation.y=0;
  // Regression for C号 deferred semantics: ambient/fill must not erase the mask.
  renderSettings.keyLightIntensity=0;
  const ambientOff=capture(0),ambientOn=capture(1);
  const ambient=stats(ambientOff,ambientOn);
  assert(ambient.meanDarkening>.5,'Shadow only affects direct key light');log({ambientOnly:ambient});
  renderSettings.keyLightIntensity=.68;
  const expected=capture(1);
  const frames=await renderFrames({width:512,height:512,fps:1,duration:1});
  const image=await createImageBitmap(await (await fetch(frames[0])).blob());
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const exported=ctx.getImageData(0,0,512,512).data;
  let maxDifference=0;
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
   const a=(y*512+x)*4,b=((511-y)*512+x)*4;
   if(expected[b+3]===255 && exported[a+3]===255)for(let c=0;c<3;c++)maxDifference=Math.max(maxDifference,Math.abs(expected[b+c]-exported[a+c]));
   assert(Math.abs(expected[b+3]-exported[a+3])<=1,'Export alpha differs');
  }
  assert(maxDifference<=1,'Preview/export pixels differ');
  log({pngExportMatchesPreview:true,maxDifference,PASS:true});
 } catch(error){log({FAIL:error.stack});}
}
document.querySelector('#regression-model').addEventListener('change',event=>{if(event.target.files[0])test(event.target.files[0]);});
