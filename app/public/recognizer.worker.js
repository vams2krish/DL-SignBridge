// Classic worker is required by the MediaPipe WASM ModuleFactory loader.
importScripts('/vision_bundle.js');
const { FilesetResolver, GestureRecognizer } = Vision;
let recognizer, config, delegate='CPU', lastTimestamp=0, frameNumber=0;
let quality={brightness:128,contrast:40,clipped:false,small:false};
const canvas=new OffscreenCanvas(32,24);
const pixels=canvas.getContext('2d',{willReadFrequently:true});
const allow=new Set(['Closed_Fist','Open_Palm','Pointing_Up','Thumb_Down','Thumb_Up','Victory','ILoveYou']);
function preferredDelegate(backend){
  if(backend==='CPU')return 'CPU';
  try{
    const test=new OffscreenCanvas(1,1);const gl=test.getContext('webgl2');
    if(!gl)return 'CPU';
    const info=gl.getExtension('WEBGL_debug_renderer_info');
    const renderer=info?String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)):'';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return !renderer||/swiftshader|llvmpipe|software/i.test(renderer)?'CPU':'GPU';
  }catch{return 'CPU';}
}
async function handle(data){
  const requestId=data.requestId;
  try{
    if(data.type==='init'){
      const next={mode:data.mode||'IMAGE',hands:data.hands||1,backend:data.backend||'CPU'};
      if(!recognizer||config.backend!==next.backend){
        recognizer?.close();recognizer=null;
        const files=await FilesetResolver.forVisionTasks(`${self.location.origin}/wasm`);
        delegate=preferredDelegate(next.backend);
        const options={baseOptions:{modelAssetPath:'/models/gesture_recognizer.task',delegate},runningMode:next.mode,numHands:next.hands,minHandDetectionConfidence:.5,minHandPresenceConfidence:.5,minTrackingConfidence:.5};
        try{recognizer=await GestureRecognizer.createFromOptions(files,options);}
        catch(error){if(delegate!=='GPU')throw error;delegate='CPU';options.baseOptions.delegate='CPU';recognizer=await GestureRecognizer.createFromOptions(files,options);}
      }else if(config.mode!==next.mode||config.hands!==next.hands){
        await recognizer.setOptions({runningMode:next.mode,numHands:next.hands});
      }else if(next.mode==='VIDEO'){
        await recognizer.setOptions({runningMode:'IMAGE'});
        await recognizer.setOptions({runningMode:'VIDEO'});
      }
      config=next;frameNumber=0;lastTimestamp=0;
      self.postMessage({type:'ready',requestId,engine:{delegate,mode:config.mode,hands:config.hands}});
    }else if(data.type==='frame'){
      try{
        if(!recognizer)throw new Error('Model is not ready.');
        const start=performance.now();
        lastTimestamp=Math.max(lastTimestamp+1,Number.isFinite(data.timestamp)?data.timestamp:performance.now());
        const result=config.mode==='VIDEO'?recognizer.recognizeForVideo(data.bitmap,lastTimestamp):recognizer.recognize(data.bitmap);
        const inferenceMs=performance.now()-start;
        if(frameNumber++%6===0&&pixels){
          pixels.drawImage(data.bitmap,0,0,32,24);const rgba=pixels.getImageData(0,0,32,24).data;
          let sum=0,squares=0;for(let i=0;i<rgba.length;i+=4){const l=.2126*rgba[i]+.7152*rgba[i+1]+.0722*rgba[i+2];sum+=l;squares+=l*l;}
          const n=rgba.length/4,brightness=sum/n;quality={...quality,brightness,contrast:Math.sqrt(Math.max(0,squares/n-brightness*brightness))};
        }
        const all=result.landmarks.flat();
        quality.clipped=all.some(p=>p.x<.015||p.x>.985||p.y<.015||p.y>.985);
        quality.small=result.landmarks.some(hand=>Math.hypot(hand[9].x-hand[0].x,hand[9].y-hand[0].y)<.055);
        const candidates=result.gestures.map(g=>g[0]).filter(g=>g&&allow.has(g.categoryName)).sort((a,b)=>b.score-a.score);
        const best=candidates[0];
        self.postMessage({type:'result',requestId,detection:{id:best?.categoryName||'None',score:best?.score||0,landmarks:result.landmarks,handedness:result.handedness.map(h=>h[0]?.categoryName||''),inferenceMs,quality}});
      }finally{data.bitmap.close();}
    }
  }catch(error){self.postMessage({type:'error',requestId,message:error instanceof Error?error.message:'Vision worker failed.'});}
}
let queue=Promise.resolve();
self.onmessage=({data})=>{queue=queue.then(()=>handle(data)).catch(()=>{});};
