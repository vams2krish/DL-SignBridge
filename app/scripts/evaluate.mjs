// Local-only evaluation: user-owned images never leave loopback.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { chromium } from '@playwright/test';
const [manifestPath, outputPath = 'reports/evaluation.json'] = process.argv.slice(2);
if (!manifestPath) throw new Error('Usage: node scripts/evaluate.mjs <manifest.json> [report.json]. Start npm run dev first.');
const base = new URL(process.env.DEMO_URL || 'http://127.0.0.1:5173/');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)) throw new Error('Evaluation is restricted to a local loopback server.');
const labels = ['Open_Palm','Thumb_Up','Thumb_Down','Closed_Fist','Pointing_Up','Victory','ILoveYou','None'];
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (manifest.split !== 'test' || !Array.isArray(manifest.trainSignerIds) || !Array.isArray(manifest.images) || !manifest.images.length) throw new Error('Manifest requires split="test", trainSignerIds, and nonempty images. See docs/evaluation.md.');
const threshold = manifest.threshold ?? .7;
if (!Number.isFinite(threshold) || threshold < .5 || threshold > .95) throw new Error('threshold must be between 0.5 and 0.95.');
const seen = new Set(); const images=[];
for (const item of manifest.images) {
  if (!labels.includes(item.label) || !item.signerId || manifest.trainSignerIds.includes(item.signerId)) throw new Error('Invalid label or missing/overlapping test signer.');
  const file = path.resolve(path.dirname(path.resolve(manifestPath)), item.file);
  const buffer=await readFile(file); const sha=createHash('sha256').update(buffer).digest('hex');
  if (seen.has(sha)) throw new Error('Duplicate image content in test set.'); seen.add(sha);
  images.push({...item,sha,bytes:[...buffer]});
}
const browser=await chromium.launch(); let results;
try {
  const page=await browser.newPage();await page.goto(base.href);
  results=await page.evaluate(async ({images,threshold})=>{
    const worker=new Worker('/recognizer.worker.js');
    const read=()=>new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Worker timed out.')),60000);worker.onmessage=e=>{clearTimeout(timeout);e.data.type==='error'?reject(new Error(e.data.message)):resolve(e.data);};worker.onerror=()=>{clearTimeout(timeout);reject(new Error('Worker failed.'));};});
    try {
      const ready=read();worker.postMessage({type:'init'});await ready;
      const result=[];
      for (const item of images) {
        const bitmap=await createImageBitmap(new Blob([new Uint8Array(item.bytes)]));
        const pending=read();worker.postMessage({type:'frame',bitmap},[bitmap]);const {detection}=await pending;
        result.push({file:item.file,signerId:item.signerId,expected:item.label,sha256:item.sha,predicted:detection.score>=threshold?detection.id:'None',score:detection.score,inferenceMs:detection.inferenceMs});
      }
      return result;
    } finally {worker.terminate();}
  },{images,threshold});
} finally {await browser.close();}
const matrix=Object.fromEntries(labels.map(label=>[label,Object.fromEntries(labels.map(other=>[other,0]))]));
for(const row of results) matrix[row.expected][labels.includes(row.predicted)?row.predicted:'None']++;
const metrics=Object.fromEntries(labels.map(label=>{const tp=matrix[label][label];const predicted=labels.reduce((n,l)=>n+matrix[l][label],0);const support=Object.values(matrix[label]).reduce((a,b)=>a+b,0);const precision=predicted?tp/predicted:0;const recall=support?tp/support:0;return[label,{support,precision,recall,f1:precision+recall?2*precision*recall/(precision+recall):0}];}));
const times=results.map(r=>r.inferenceMs).sort((a,b)=>a-b);
const report={createdAt:new Date().toISOString(),scope:'Isolated gesture IMAGE inference only. Not ASL translation, continuous signing, or avatar validation.',threshold,samples:results.length,signers:[...new Set(results.map(r=>r.signerId))].length,accuracy:results.filter(r=>r.expected===r.predicted).length/results.length,rejectionRate:results.filter(r=>r.predicted==='None').length/results.length,inferenceMs:{median:times[Math.floor(times.length*.5)],p95:times[Math.min(times.length-1,Math.ceil(times.length*.95)-1)]},perClass:metrics,confusionMatrix:matrix,results,limitations:['Signer separation is checked against manifest declarations, not independently verified.','Upstream pretraining signer identities are unknown.','CPU, browser, camera conditions, and model provenance must accompany published results.','Data consent and redistribution rights must be independently reviewed.']};
await mkdir(path.dirname(path.resolve(outputPath)),{recursive:true});await writeFile(outputPath,JSON.stringify(report,null,2)+'\n');console.log(`Evaluated ${results.length} images. Report saved to ${path.resolve(outputPath)}. Do not interpret a small smoke test as an accuracy benchmark.`);
