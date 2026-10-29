import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('real model sample → editable caption → speech; showcases desktop product',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await expect(page.getByRole('heading',{name:'A little movement.' ,exact:false})).toBeVisible();
  await expect(page.locator('.avatar-canvas canvas')).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({path:'../docs/showcase/01-studio.png',fullPage:true});
  await page.getByRole('button',{name:'Run sample photo'}).click();
  await expect(page.getByLabel('REVIEW YOUR CAPTION')).toHaveValue('Yes',{timeout:60000});
  await expect(page.getByRole('status')).toContainText('Thumb up recognized');
  await page.screenshot({path:'../docs/showcase/02-recognition.png',fullPage:true});
  // Browser audio is stubbed at the device boundary; vision above is not mocked.
  await page.evaluate(()=>{const w=window as typeof window&{spoken?:string};window.speechSynthesis.speak=(u)=>{w.spoken=u.text;u.onstart?.(new Event('start') as SpeechSynthesisEvent);};window.speechSynthesis.cancel=()=>{};});
  await page.getByLabel('REVIEW YOUR CAPTION').fill('Yes, I am ready.');
  await page.getByRole('button',{name:'Speak caption'}).click();
  expect(await page.evaluate(()=>(window as typeof window&{spoken?:string}).spoken)).toBe('Yes, I am ready.');
  await expect(page.getByRole('button',{name:'Stop speaking'})).toBeVisible();
  await page.getByRole('button',{name:'Clear session & stop devices'}).click();
  await expect(page.getByLabel('REVIEW YOUR CAPTION')).toHaveValue('');
  expect(errors).toEqual([]);
});
test('text → gesture avatar, unknown message fallback, and session clearing',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Speech / text'}).click();
  await page.getByLabel('Type or dictate a supported phrase').fill('Peace');
  await page.getByRole('button',{name:'Animate message'}).click();
  await expect(page.getByRole('img',{name:/Illustrative avatar showing Victory/})).toBeVisible();
  await page.waitForTimeout(1000);
  await page.screenshot({path:'../docs/showcase/03-avatar.png',fullPage:true});
  await page.getByLabel('Type or dictate a supported phrase').fill('Tell me about the weather');
  await page.getByRole('button',{name:'Animate message'}).click();
  await expect(page.getByRole('status')).toContainText('outside the demo vocabulary');
  await expect(page.locator('#text-fallback')).toHaveText('Tell me about the weather');
  await expect(page.getByRole('img',{name:'Friendly illustrative avatar in a resting pose.'})).toBeVisible();
  await page.getByRole('button',{name:'Clear session & stop devices'}).click();
  await expect(page.getByLabel('Type or dictate a supported phrase')).toHaveValue('');
});
test('camera denial is recoverable and modal consent is keyboard accessible',async({page,context})=>{
  await context.grantPermissions([]);await page.goto('/');
  await page.getByRole('button',{name:'Enable camera'}).click();
  await expect(page.getByRole('dialog',{name:'Your camera, on your terms.'})).toBeVisible();
  await page.getByRole('button',{name:'Allow camera',exact:true}).click();
  await expect(page.getByRole('alert')).toBeVisible({timeout:20000});
  await expect(page.getByRole('button',{name:'Enable camera'})).toBeVisible();
  await page.getByRole('button',{name:'Studio settings'}).click();
  await expect(page.getByRole('dialog',{name:'Studio settings'})).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();
});
test('library, responsive layouts and accessibility',async({page})=>{
  await page.goto('/');
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations).toEqual([]);
  await page.getByRole('button',{name:'Gesture library',exact:true}).click();
  await expect(page.locator('.library-item')).toHaveCount(7);
  await page.screenshot({path:'../docs/showcase/04-library.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Studio',exact:true}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'../docs/showcase/05-mobile.png',fullPage:true});
});

test('camera frame pipeline uses real inference and releases its media track',async({page})=>{
  // Only the physical camera is replaced: actual model + frame loop + hold gate run.
  await page.addInitScript(()=>{
    navigator.mediaDevices.getUserMedia=async()=>{
      const image=new Image();image.src='/thumb-up.jpg';await image.decode();
      const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
      const ctx=canvas.getContext('2d')!;ctx.drawImage(image,0,0);
      const stream=canvas.captureStream(12);
      const timer=setInterval(()=>ctx.drawImage(image,0,0),80);
      const track=stream.getVideoTracks()[0];const original=track.stop.bind(track);track.stop=()=>{clearInterval(timer);original();};
      (window as typeof window&{testCameraStream?:MediaStream}).testCameraStream=stream;
      return stream;
    };
  });
  await page.goto('/');await page.getByRole('button',{name:'Enable camera'}).click();
  await page.getByRole('button',{name:'Allow camera',exact:true}).click();
  await expect(page.getByLabel('REVIEW YOUR CAPTION')).toHaveValue('Yes',{timeout:60000});
  await page.getByRole('button',{name:'Stop camera'}).click();
  expect(await page.evaluate(()=>(window as typeof window&{testCameraStream?:MediaStream}).testCameraStream?.getVideoTracks()[0].readyState)).toBe('ended');
});

test('microphone consent → transcript review → avatar at the browser speech boundary',async({page})=>{
  await page.addInitScript(()=>{
    class MockRecognition {
      lang='';interimResults=false;continuous=false;
      onresult:((event:unknown)=>void)|null=null;onerror=null;onend:(()=>void)|null=null;
      start(){setTimeout(()=>{this.onresult?.({results:[[{transcript:'Hello'}]]});this.onend?.();},50);}
      stop(){this.onend?.();}abort(){}
    }
    Object.defineProperty(window,'SpeechRecognition',{value:MockRecognition,configurable:true});
  });
  await page.goto('/');await page.getByRole('button',{name:'Speech / text'}).click();
  await page.getByLabel('Type or dictate a supported phrase').fill('');
  await page.getByRole('button',{name:'Use microphone'}).click();
  await expect(page.getByRole('dialog',{name:'Before you use the microphone'})).toBeVisible();
  await page.getByRole('button',{name:'Start microphone'}).click();
  await expect(page.getByLabel('Type or dictate a supported phrase')).toHaveValue('Hello');
  await page.getByRole('button',{name:'Animate message'}).click();
  await expect(page.getByRole('img',{name:/Illustrative avatar showing Open Palm/})).toBeVisible();
});
