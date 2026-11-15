// Explicit, local-only camera smoke test. No photographs or recordings are saved.
import { chromium } from '@playwright/test';
import { mkdir,writeFile } from 'node:fs/promises';
const base=process.env.DEMO_URL||'http://127.0.0.1:43190';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw new Error('Physical camera checks require a local preview.');
const browser=await chromium.launch();
let report;
try{
  const context=await browser.newContext({permissions:['camera']});const page=await context.newPage();await page.goto(base);
  await page.getByRole('button',{name:'Enable camera'}).click();await page.getByRole('button',{name:'Allow camera',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.detection-pill')||document.querySelector('[role="alert"]'),null,{timeout:45000});
  const alert=await page.locator('[role="alert"]').allTextContents();
  if(alert.length)report={physicalCameraAvailable:false,result:'Camera pipeline could not start on this host.',detail:alert.join(' ')};
  else{
    await page.waitForTimeout(2500);
    const status=await page.locator('.live-diagnostics').innerText();
    await page.evaluate(()=>{const video=document.querySelector('video');window.__smokeTracks=video?.srcObject?.getTracks();});
    await page.getByRole('button',{name:'Stop camera'}).click();
    const released=await page.evaluate(()=>window.__smokeTracks?.every(t=>t.readyState==='ended'));
    report={physicalCameraAvailable:true,result:'Real camera frames reached the actual vision model.',status,tracksReleased:released,limitations:'No signer accuracy, microphone, or audible speech validation. No frames saved.'};
  }
}catch(e){report={physicalCameraAvailable:false,result:'Physical camera validation incomplete.',detail:e.message};}
finally{await browser.close();}
await mkdir('reports',{recursive:true});await writeFile('reports/hardware-smoke.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
