import { useCallback, useEffect, useRef, useState } from 'react';
import type { Detection } from './domain';
import { handFeatures, MAX_PERSONAL_GESTURES, MAX_SAMPLES, MIN_SAMPLES, type PersonalGesture } from './personal';

export function useVocabulary(){
  const [items,setItems]=useState<PersonalGesture[]>([]);
  const [collecting,setCollecting]=useState(false),[count,setCount]=useState(0);
  const [message,setMessage]=useState('');
  const buffer=useRef<{samples:number[][];pose:Detection['landmarks'];handedness:string[];last:number;hands:number}>({samples:[],pose:[],handedness:[],last:0,hands:0});
  const active=useRef(false);
  useEffect(()=>{
    if(!collecting)return;
    const timer=setTimeout(()=>{active.current=false;setCollecting(false);setMessage(`Capture paused after 20 seconds with ${buffer.current.samples.length} usable snapshots. Improve lighting/framing, then recapture if fewer than 12 were collected.`);},20000);
    return()=>clearTimeout(timer);
  },[collecting]);
  const start=useCallback(()=>{
    buffer.current={samples:[],pose:[],handedness:[],last:0,hands:0};active.current=true;
    setCount(0);setCollecting(true);setMessage('Hold a static pose. Keep all fingertips visible and vary the angle slightly.');
  },[]);
  const cancel=useCallback(()=>{active.current=false;setCollecting(false);},[]);
  const ingest=useCallback((d:Detection)=>{
    if(!active.current||performance.now()-buffer.current.last<100)return;
    if(d.quality?.clipped||d.quality?.small||!d.landmarks.length)return;
    const vector=handFeatures(d.landmarks,d.handedness);if(!vector||vector.some(x=>Math.abs(x)>15))return;
    const current=buffer.current;
    if(current.hands&&current.hands!==d.landmarks.length){setMessage('Keep the same number of hands visible throughout this capture.');return;}
    current.hands=d.landmarks.length;current.last=performance.now();
    current.samples.push(vector);current.pose=d.landmarks.map(h=>h.map(p=>({...p})));current.handedness=d.handedness??[];
    setCount(current.samples.length);
    if(current.samples.length===MAX_SAMPLES){active.current=false;setCollecting(false);setMessage('Capture complete. Review the label and save your personal gesture.');}
  },[]);
  const save=useCallback((name:string,phrase:string)=>{
    if(collecting)throw new Error('Pause capture before saving.');
    if(buffer.current.samples.length<MIN_SAMPLES)throw new Error(`Capture at least ${MIN_SAMPLES} usable hand snapshots first.`);
    if(!name.trim()||!phrase.trim())throw new Error('Add both a gesture name and a spoken phrase.');
    if(items.length>=MAX_PERSONAL_GESTURES)throw new Error('This vocabulary has reached its 200-gesture limit. Export it before removing gestures.');
    if(items.some(g=>g.phrase.toLowerCase()===phrase.trim().toLowerCase()))throw new Error('A gesture already uses that phrase. Use a distinct phrase or remove the old gesture.');
    const current=buffer.current;
    const gesture:PersonalGesture={id:`personal:${crypto.randomUUID()}`,name:name.trim().slice(0,60),phrase:phrase.trim().slice(0,200),samples:current.samples.map(s=>[...s]),pose:current.pose,handedness:current.handedness,createdAt:new Date().toISOString()};
    setItems(previous=>[...previous,gesture]);buffer.current={samples:[],pose:[],handedness:[],last:0,hands:0};setCount(0);setMessage(`Saved “${gesture.name}”. Test it in personal recognition mode with a fresh pose.`);return gesture;
  },[items,collecting]);
  const clear=useCallback(()=>{active.current=false;setCollecting(false);setItems([]);setCount(0);buffer.current={samples:[],pose:[],handedness:[],last:0,hands:0};setMessage('Personal vocabulary cleared from this session.');},[]);
  return {items,setItems,collecting,count,message,setMessage,start,cancel,ingest,save,clear};
}
export type VocabularyController=ReturnType<typeof useVocabulary>;
