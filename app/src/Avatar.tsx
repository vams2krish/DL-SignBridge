import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { GestureId } from './domain';

type Props = { gesture: GestureId | null; playing: boolean; speaking: boolean; speed: number; reduced: boolean };
/** Procedural illustration of seven static gestures; not validated linguistic signing. */
export default function Avatar(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const state = useRef(props);
  const [failed, setFailed] = useState(false);
  useEffect(() => { state.current = props; }, [props]);
  useEffect(() => {
    if (!host.current) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { setFailed(true); return; }
    const container = host.current;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 30);
    camera.position.set(0, 1.95, 7.5); camera.lookAt(0, 1.65, 0);
    scene.add(new THREE.HemisphereLight(0xfff6e6, 0x506a63, 2.6));
    const key = new THREE.DirectionalLight(0xffe6cc, 3.5); key.position.set(-3, 5, 5); scene.add(key);
    const rim = new THREE.DirectionalLight(0xb9e9da, 2); rim.position.set(3, 2, -2); scene.add(rim);
    const skin = new THREE.MeshStandardMaterial({ color: 0xc68b65, roughness: 0.55 });
    const shirt = new THREE.MeshStandardMaterial({ color: 0x23675d, roughness: 0.8 });
    const hair = new THREE.MeshStandardMaterial({ color: 0x29342f, roughness: 0.8 });
    const eyes = new THREE.MeshStandardMaterial({ color: 0x28352e });
    const white = new THREE.MeshStandardMaterial({ color: 0xfff8e8 });
    function sphere(parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sy: number, sz: number, material: THREE.Material) {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), material);
      mesh.position.set(x,y,z); mesh.scale.set(sx,sy,sz); parent.add(mesh); return mesh;
    }
    function bone(parent: THREE.Object3D, length: number, radius: number, material: THREE.Material) {
      const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, Math.max(0.005, length - radius * 2), 6, 12), material);
      mesh.position.y = length / 2; parent.add(mesh); return mesh;
    }
    const body = new THREE.Group(); scene.add(body);
    sphere(body, 0, 0.75, 0, .62, .79, .31, shirt);
    sphere(body, -.4, 1.27, 0, .34, .27, .29, shirt);
    sphere(body, .4, 1.27, 0, .34, .27, .29, shirt);
    sphere(body, 0, 1.64, 0, .17, .26, .17, skin);
    const head = new THREE.Group(); head.position.y = 2.11; body.add(head);
    sphere(head, 0, 0, 0, .37, .47, .32, skin);
    sphere(head, -.37, -.015, 0, .07, .12, .065, skin);
    sphere(head, .37, -.015, 0, .07, .12, .065, skin);
    sphere(head, 0, .21, -.09, .39, .32, .3, hair);
    sphere(head, -.17, .31, .15, .23, .15, .19, hair);
    sphere(head, .08, .34, .12, .23, .15, .18, hair);
    for (const x of [-.135,.135]) {
      sphere(head, x, .055, .281, .069, .046, .035, white);
      sphere(head, x, .055, .312, .029, .033, .014, eyes);
      const brow = sphere(head, x, .16, .285, .075, .014, .02, hair); brow.rotation.z = x < 0 ? .08 : -.08;
    }
    sphere(head, 0, -.035, .326, .057, .083, .075, skin);
    const mouth = sphere(head, 0, -.19, .284, .097, .021, .025, new THREE.MeshStandardMaterial({ color: 0x6e4235 }));
    const shoulders: THREE.Group[] = [];
    const elbows: THREE.Group[] = [];
    const hands: THREE.Group[] = [];
    const fingers: THREE.Group[][] = [];
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Group(); shoulder.position.set(side * .58,1.32,0); body.add(shoulder); shoulders.push(shoulder);
      bone(shoulder,.55,.13,shirt);
      const elbow = new THREE.Group(); elbow.position.y=.55; shoulder.add(elbow); elbows.push(elbow);
      bone(elbow,.52,.095,skin);
      const hand = new THREE.Group(); hand.position.y=.58; elbow.add(hand); hands.push(hand);
      sphere(hand,0,.10,0,.115,.16,.055,skin);
      const joints: THREE.Group[] = [];
      const lengths=[.22,.29,.31,.28,.22];
      for (let f=0;f<5;f++) {
        const joint = new THREE.Group();
        joint.position.set(f===0 ? -.13 : -.082+(f-1)*.055, f===0 ? .055 : .22, .01);
        if (f===0) joint.rotation.z=.75;
        hand.add(joint); joints.push(joint);
        const length=lengths[f]; bone(joint,length*.53,.026,skin);
        const mid = new THREE.Group(); mid.position.y=length*.53; joint.add(mid); joints.push(mid);
        bone(mid,length*.47,.023,skin);
      }
      fingers.push(joints);
      shoulder.rotation.z=-side * 2.85;
    }
    let lastTick=performance.now(); let motion=0;
    const animate = () => {
      const s=state.current; const tick=performance.now(); const dt=Math.min((tick-lastTick)/1000,.05); lastTick=tick;
      if(s.playing && !s.reduced) motion+=dt*s.speed;
      const gesture=s.gesture;
      const active=!!gesture;
      const targetShoulder=active ? -.72 : -2.85;
      shoulders[1].rotation.z=THREE.MathUtils.damp(shoulders[1].rotation.z,targetShoulder,7,dt);
      shoulders[1].rotation.x=THREE.MathUtils.damp(shoulders[1].rotation.x,active ? .15 : 0,7,dt);
      elbows[1].rotation.z=THREE.MathUtils.damp(elbows[1].rotation.z,active ? .87 : 0,7,dt);
      elbows[1].rotation.x=THREE.MathUtils.damp(elbows[1].rotation.x,active ? .28 : 0,7,dt);
      hands[1].rotation.z=THREE.MathUtils.damp(hands[1].rotation.z,gesture==='Thumb_Down' ? Math.PI-1 : gesture==='Thumb_Up' ? -1 : 0,8,dt);
      // Index/thumb directions are illustrative; no natural-language translation is implied.
      const extended = gesture==='Closed_Fist' ? [false,false,false,false,false] : gesture==='Thumb_Up'||gesture==='Thumb_Down' ? [true,false,false,false,false] : gesture==='Pointing_Up' ? [false,true,false,false,false] : gesture==='Victory' ? [false,true,true,false,false] : gesture==='ILoveYou' ? [true,true,false,false,true] : [true,true,true,true,true];
      for(let side=0;side<2;side++) for(let f=0;f<5;f++) {
        const open=side===1&&active ? extended[f] : true;
        const base=fingers[side][f*2]; const mid=fingers[side][f*2+1];
        base.rotation.x=THREE.MathUtils.damp(base.rotation.x,open?0:1.35,10,dt);
        mid.rotation.x=THREE.MathUtils.damp(mid.rotation.x,open?0:1.65,10,dt);
        base.rotation.z=f===0 ? (open?1.0:.3) : gesture==='Victory' && side===1 && f<=2 ? (f===1?.2:-.2) : 0;
      }
      body.rotation.y=s.reduced?0:Math.sin(motion*.65)*.025;
      head.rotation.z=s.reduced?0:Math.sin(motion*.7)*.018;
      mouth.scale.y=s.speaking&&!s.reduced ? .025+Math.abs(Math.sin(performance.now()*.018))*.045 : .021;
      renderer.render(scene,camera);
    };
    const resize=()=>{ const w=container.clientWidth; const h=container.clientHeight; if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix(); };
    const observer=new ResizeObserver(resize);observer.observe(container);resize();renderer.setAnimationLoop(animate);
    const contextLost=(event: Event)=>{event.preventDefault();setFailed(true);};
    renderer.domElement.addEventListener('webglcontextlost',contextLost);
    return()=>{observer.disconnect();renderer.setAnimationLoop(null);renderer.domElement.removeEventListener('webglcontextlost',contextLost);scene.traverse(obj=>{if(obj instanceof THREE.Mesh){obj.geometry.dispose();const materials=Array.isArray(obj.material)?obj.material:[obj.material];materials.forEach(m=>m.dispose());}});renderer.dispose();renderer.domElement.remove();};
  }, []);
  return <div ref={host} className="avatar-canvas" role="img" aria-label={props.gesture ? `Illustrative avatar showing ${props.gesture.replaceAll('_',' ')}. Not validated sign-language animation.` : 'Friendly illustrative avatar in a resting pose.'}>{failed && <div className="avatar-fallback">3D preview is unavailable on this device. Gesture names and captions remain available.</div>}</div>;
}
