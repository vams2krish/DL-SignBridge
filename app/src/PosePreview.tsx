import { useEffect, useRef } from 'react';
import { CONNECTIONS } from './domain';
import type { PersonalGesture } from './personal';
export default function PosePreview({gesture}:{gesture:PersonalGesture}){
  const canvas=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const element=canvas.current,ctx=element?.getContext('2d');if(!ctx||!element)return;
    const draw=()=>{
      const width=element.clientWidth,height=element.clientHeight;
      element.width=width*2;element.height=height*2;ctx.scale(2,2);ctx.clearRect(0,0,width,height);
      const points=gesture.pose.flat();if(!points.length)return;
      const xs=points.map(p=>p.x),ys=points.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
      const factor=Math.min((width-75)/Math.max(.1,maxX-minX),(height-95)/Math.max(.1,maxY-minY));
      const ox=(width-(maxX-minX)*factor)/2,oy=(height-(maxY-minY)*factor)/2;
      gesture.pose.forEach((hand,index)=>{
        ctx.strokeStyle=index===0?'#246852':'#aa522c';ctx.fillStyle=index===0?'#38775d':'#b66537';ctx.lineWidth=5;ctx.lineCap='round';
        for(const [a,b]of CONNECTIONS){ctx.beginPath();ctx.moveTo(ox+(hand[a].x-minX)*factor,oy+(hand[a].y-minY)*factor);ctx.lineTo(ox+(hand[b].x-minX)*factor,oy+(hand[b].y-minY)*factor);ctx.stroke();}
        for(const p of hand){ctx.beginPath();ctx.arc(ox+(p.x-minX)*factor,oy+(p.y-minY)*factor,4,0,Math.PI*2);ctx.fill();}
      });
    };draw();const observer=new ResizeObserver(draw);observer.observe(element);return()=>observer.disconnect();
  },[gesture]);
  return <div className="pose-preview" role="img" aria-label={`Saved personal hand landmarks for ${gesture.name}. User-taught static pose, not a validated ISL animation.`}><canvas ref={canvas} aria-hidden="true"/><span className="pose-note">YOUR SAVED LANDMARKS · {gesture.pose.length} HAND{gesture.pose.length===1?'':'S'}</span></div>;
}
