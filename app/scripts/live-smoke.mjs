// Private Sites authentication is accepted in memory through hidden stdin only.
import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const text=await new Promise((resolve,reject)=>{let value='';const tty=process.stdin.isTTY;if(tty)process.stdin.setRawMode(true);process.stderr.write('Ready for private demo test JSON on stdin (input is hidden).\n');const done=()=>{process.stdin.removeAllListeners('data');if(tty)process.stdin.setRawMode(false);process.stdin.pause();try{resolve(JSON.parse(value.trim()));}catch{reject(new Error('Provide one JSON request on stdin.'));}};process.stdin.on('data',chunk=>{value+=chunk;if(value.includes('\u0003')){process.exit(130);}if(value.includes('\n')||value.includes('\r'))done();});process.stdin.once('end',done);});
const {url,token}=text;
if(typeof url!=='string'||new URL(url).protocol!=='https:')throw new Error('Use the deployed HTTPS URL.');
const origin=new URL(url).origin;
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
const report={url,checks:[],limitations:'Real model inference; text/avatar flow; no physical camera/audio certification.'};
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  if(token)await page.route(`${origin}/**`,route=>route.continue({headers:{...route.request().headers(),'OAI-Sites-Authorization':token}}));
  await page.goto(url);
  await expect(page.getByRole('heading',{name:/A little movement/})).toBeVisible();report.checks.push('Deployed studio renders');
  await page.getByRole('button',{name:'Run sample photo'}).click();
  await expect(page.getByLabel('REVIEW YOUR CAPTION')).toHaveValue('Yes',{timeout:60000});report.checks.push('Deployed worker + WASM + real model sample → caption');
  await page.getByRole('button',{name:'Speech / text'}).click();await page.getByLabel('Type or dictate a supported phrase').fill('Peace');await page.getByRole('button',{name:'Animate message'}).click();
  await expect(page.getByRole('img',{name:/Illustrative avatar showing Victory/})).toBeVisible();report.checks.push('Deployed text → illustrative avatar');
  await page.getByRole('button',{name:'Gesture library',exact:true}).click();await page.getByLabel('Search ISL practice prompts').fill('Water');await expect(page.locator('.practice-card')).toHaveCount(1);report.checks.push('Deployed ISL catalog search');
  await page.getByRole('button',{name:'Teach this pose'}).click();await expect(page.getByLabel('Personal gesture name')).toHaveValue('Water');report.checks.push('Deployed practice prompt → personal teacher');
  report.success=true;
}catch(e){report.success=false;report.error=e.message;process.exitCode=1;}
finally{await browser.close();}
await mkdir('reports',{recursive:true});await writeFile('reports/live-smoke.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
