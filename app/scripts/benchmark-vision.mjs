import { chromium } from '@playwright/test';
import { writeFile, mkdir } from 'node:fs/promises';
const base = process.env.DEMO_URL || 'http://127.0.0.1:5173';
if (!['127.0.0.1','localhost'].includes(new URL(base).hostname)) throw new Error('Use a loopback preview URL.');
const browser = await chromium.launch({args:['--enable-unsafe-swiftshader']});
try {
  const page = await browser.newPage();
  await page.goto(`${base}/models/provenance.json`);
  const runs=[];
  for (const mode of ['IMAGE','VIDEO']) {
    runs.push(await page.evaluate(async ({mode,base})=>{
      const code=`importScripts('${base}/vision_bundle.js');onmessage=async()=>{try{const files=await Vision.FilesetResolver.forVisionTasks('${base}/wasm');const model=await Vision.GestureRecognizer.createFromOptions(files,{baseOptions:{modelAssetPath:'${base}/models/gesture_recognizer.task',delegate:'CPU'},runningMode:'${mode}',numHands:1});const photo=await createImageBitmap(await(await fetch('${base}/thumb-up.jpg')).blob());const timings=[];let label='';for(let i=0;i<25;i++){const t=performance.now();const r='${mode}'==='VIDEO'?model.recognizeForVideo(photo,i*67):model.recognize(photo);timings.push(performance.now()-t);label=r.gestures[0]?.[0]?.categoryName;}model.close();photo.close();postMessage({mode:'${mode}',timings,label});}catch(e){postMessage({error:e.message});}}`;
      const url=URL.createObjectURL(new Blob([code],{type:'application/javascript'}));const worker=new Worker(url);
      try {return await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Benchmark timed out')),90000);worker.onmessage=e=>{clearTimeout(timeout);resolve(e.data);};worker.onerror=e=>{clearTimeout(timeout);reject(new Error(e.message));};worker.postMessage({});});}
      finally{worker.terminate();URL.revokeObjectURL(url);}
    },{mode,base}));
  }
  const summary=runs.map(r=>{if(r.error)return r;const warm=r.timings.slice(3).sort((a,b)=>a-b);return {mode:r.mode,frames:r.timings.length,firstFrameMs:r.timings[0],warmMedianMs:warm[Math.floor(warm.length/2)],warmP95Ms:warm[Math.ceil(warm.length*.95)-1],lastLabel:r.label};});
  const report={environment:process.platform+' '+process.arch,browser:browser.version(),scenario:'Same thumb-up test photograph repeated 25 times, one hand, CPU delegate. Warm samples exclude first 3 frames. Measures inference only, not real signer accuracy or camera-to-speech latency.',summary};
  await mkdir('reports',{recursive:true});await writeFile('reports/tracking-benchmark.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
