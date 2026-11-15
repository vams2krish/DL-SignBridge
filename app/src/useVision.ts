import { useCallback, useEffect, useRef, useState } from 'react';
import { StabilityGate, type Detection, type GestureId } from './domain';
import { classifyPersonal, handFeatures, type PersonalGesture } from './personal';
import { VisionEngine, type EngineInfo } from './vision-engine';

export type VisionOptions = {
  holdMs?:number; resolution?:256|360|512; hands?:1|2; backend?:'auto'|'CPU'; assist?:boolean;
  vocabulary?:'builtin'|'personal'; personal?:PersonalGesture[];
  onFrame?:(detection:Detection)=>void;
};
export type VisionMetrics={fps:number;p50:number;p95:number;roundTripMs:number;frames:number;inputWidth:number;engine:EngineInfo|null};
const emptyMetrics:VisionMetrics={fps:0,p50:0,p95:0,roundTripMs:0,frames:0,inputWidth:360,engine:null};
type Phase='off'|'loading'|'live'|'sample'|'error';
export function useVision(onGesture:(id:GestureId,score:number,source:'camera'|'sample',assisted?:boolean)=>void,threshold:number,options:VisionOptions={}) {
  const video=useRef<HTMLVideoElement>(null);
  const [phase,setPhase]=useState<Phase>('off');
  const [error,setError]=useState('');
  const [detection,setDetection]=useState<Detection|null>(null);
  const [metrics,setMetrics]=useState<VisionMetrics>(emptyMetrics);
  const stream=useRef<MediaStream|null>(null);
  const engine=useRef<VisionEngine|null>(null);
  const frame=useRef(0),generation=useRef(0);
  const callback=useRef(onGesture),settings=useRef(options);
  const gate=useRef(new StabilityGate(threshold,options.holdMs??350));
  useEffect(()=>{callback.current=onGesture;},[onGesture]);
  useEffect(()=>{settings.current=options;},[options]);
  useEffect(()=>{gate.current.threshold=threshold;gate.current.holdMs=options.holdMs??350;gate.current.assist=options.assist!==false&&options.vocabulary!=='personal';gate.current.reset();},[threshold,options.holdMs,options.vocabulary,options.personal,options.assist]);

  const stop=useCallback((releaseEngine=false)=>{
    generation.current++;
    cancelAnimationFrame(frame.current);video.current?.cancelVideoFrameCallback?.(frame.current);
    stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;
    if(video.current)video.current.srcObject=null;
    if(releaseEngine){engine.current?.dispose();engine.current=null;}
    gate.current.reset();setPhase('off');setDetection(null);setMetrics(emptyMetrics);
  },[]);

  const start=useCallback(async(sample=false)=>{
    stop();const session=generation.current;setPhase('loading');setError('');
    const config=settings.current;
    let frameTimes:number[]=[],inferenceTimes:number[]=[],lastUi=0;
    let processingWidth:number=config.resolution??360,uncertainFrames=0;
    try{
      if(!sample){
        if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera access needs HTTPS and a supported browser. You can still run the sample.');
        const media=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},frameRate:{ideal:24,max:30},facingMode:'user'},audio:false});
        if(generation.current!==session){media.getTracks().forEach(t=>t.stop());return;}
        stream.current=media;media.getVideoTracks()[0].addEventListener('ended',()=>stop(),{once:true});
        if(!video.current)throw new Error('Camera view is not available.');
        video.current.srcObject=media;await video.current.play();
      }
      if(generation.current!==session)return;
      engine.current??=new VisionEngine();const currentEngine=engine.current;
      const info=await currentEngine.configure({mode:sample?'IMAGE':'VIDEO',hands:config.hands??1,backend:config.backend??'auto'});
      if(generation.current!==session)return;
      let frames=0;
      const receive=(raw:Detection,captured:number)=>{
        const now=performance.now();frames++;
        const options=settings.current;
        // Balanced mode can recover detail lost during downscaling. Never lower the
        // acceptance threshold merely to force an uncertain pose into a caption.
        if(!sample&&config.resolution!==256&&raw.landmarks.length&&raw.score<gate.current.threshold){
          uncertainFrames++;
          if(uncertainFrames>=6&&processingWidth<512)processingWidth=512;
        }else uncertainFrames=0;
        let result:Detection={...raw,rawId:raw.id,rawScore:raw.score,sourceKind:'builtin'};
        if(!sample&&options.vocabulary==='personal'){
          const match=classifyPersonal(handFeatures(raw.landmarks,raw.handedness),options.personal??[]);
          result={...result,id:match.id,score:match.score,sourceKind:'personal',matchReason:match.reason};
        }
        options.onFrame?.(raw);
        if(frames>3)inferenceTimes.push(raw.inferenceMs);if(inferenceTimes.length>40)inferenceTimes.shift();
        frameTimes.push(now);if(frameTimes.length>30)frameTimes.shift();
        const stable=sample?(result.score>=gate.current.threshold?result.id:null):gate.current.update(result.id,result.score,now);
        if(stable&&stable!=='None')callback.current(stable as GestureId,result.score,sample?'sample':'camera',!sample&&gate.current.wasAssisted);
        if(sample||now-lastUi>=100){
          lastUi=now;setDetection(result);
          const sorted=inferenceTimes.length?[...inferenceTimes].sort((a,b)=>a-b):[raw.inferenceMs];
          const fps=frameTimes.length>1?(frameTimes.length-1)*1000/(now-frameTimes[0]):0;
          setMetrics({fps,p50:sorted[Math.floor(sorted.length/2)],p95:sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*.95)-1)],roundTripMs:now-captured,frames,inputWidth:processingWidth,engine:info});
        }
      };
      if(sample){
        const response=await fetch('/thumb-up.jpg');if(!response.ok)throw new Error('Sample image could not load.');
        const bitmap=await createImageBitmap(await response.blob());
        if(generation.current!==session){bitmap.close();return;}
        setPhase('sample');const captured=performance.now();const raw=await currentEngine.recognize(bitmap,captured);
        if(generation.current===session)receive(raw,captured);
      }else{
        setPhase('live');
        let lastTime=-1,lastCapture=0;
        const schedule=()=>{
          if(generation.current!==session)return;
          const v=video.current;
          frame.current=v?.requestVideoFrameCallback?v.requestVideoFrameCallback(()=>void loop()):requestAnimationFrame(()=>void loop());
        };
        const loop=async()=>{
          if(generation.current!==session)return;
          const v=video.current;
          if(!v||v.readyState<2||v.currentTime===lastTime||performance.now()-lastCapture<45){schedule();return;}
          lastTime=v.currentTime;lastCapture=performance.now();
          try{
            const width=processingWidth;
            const bitmap=await createImageBitmap(v,{resizeWidth:width,resizeHeight:Math.round(width*v.videoHeight/v.videoWidth)});
            if(generation.current!==session){bitmap.close();return;}
            const raw=await currentEngine.recognize(bitmap,lastCapture);
            if(generation.current!==session)return;
            receive(raw,lastCapture);schedule();
          }catch(e){
            if(generation.current!==session)return;
            stop(true);setPhase('error');setError(e instanceof Error?e.message:'Camera processing stopped. Please retry.');
          }
        };
        schedule();
      }
    }catch(e){
      if(generation.current!==session)return;
      stop(true);setPhase('error');
      setError(e instanceof DOMException&&e.name==='NotAllowedError'?'Camera permission was denied. Allow it in browser settings, or run the sample.':e instanceof DOMException&&e.name==='NotFoundError'?'No camera was found. Connect a camera, or run the sample.':e instanceof Error?e.message:'Could not start vision.');
    }
  },[stop]);
  useEffect(()=>{
    const hide=()=>{if(document.hidden)stop(true);};document.addEventListener('visibilitychange',hide);
    return()=>{document.removeEventListener('visibilitychange',hide);stop(true);};
  },[stop]);
  const quality=detection?.quality;
  const hint=phase==='loading'?'Preparing local vision. Camera preview appears after setup.':phase==='off'?'Enable camera or run the sample.':quality&&quality.brightness<45?'Too dark: add light in front of your hand.':quality&&quality.brightness>235?'Image is washed out: reduce backlighting.':quality?.clipped?'Keep your whole hand inside the camera frame.':quality?.small?'Move your hand closer; keep the wrist visible.':!detection?.landmarks.length?'No hand detected. Show your palm and wrist in good light.':detection.sourceKind==='personal'&&detection.id==='None'?detection.matchReason??'No personal match.':detection.id==='None'?'Hand tracked, but this pose is outside the active vocabulary.':detection.score<threshold?(gate.current.assist?'Lower confidence: hold for at least one second for an assisted proposal. Review carefully.':'Hand tracked. Confidence is low; turn your palm slightly and hold still.'):`Hand tracked. Hold for ${gate.current.holdMs} ms; release to repeat the same gesture.`;
  return {video,phase,error,detection,metrics,hint,start,stop};
}
