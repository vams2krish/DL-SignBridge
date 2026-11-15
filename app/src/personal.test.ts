import {describe,expect,it} from 'vitest';
import {classifyPersonal,exportVocabulary,handFeatures,importVocabulary,type PersonalGesture} from './personal';
import {StabilityGate,type Landmark} from './domain';
const hand:Landmark[]=Array.from({length:21},(_,i)=>({x:.3+(i%4)*.025,y:.7-i*.015,z:i===0?0:-i*.001}));
const feature=handFeatures([hand],['Right'])!;
const make=(id='one',vector=feature):PersonalGesture=>({id:`personal:${id}`,name:'Test pose',phrase:`Phrase ${id}`,samples:Array.from({length:12},()=>[...vector]),pose:[hand],handedness:['Right'],createdAt:'2026-10-30'});
describe('personal static-pose features and matching',()=>{
  it('is invariant to translation and scale',()=>{
    const shifted=hand.map(p=>({x:p.x*1.2+.05,y:p.y*1.2-.1,z:p.z*1.2}));
    expect(handFeatures([shifted],['Right'])).toEqual(feature);
  });
  it('rejects absent, incomplete, or tiny hands',()=>{
    expect(handFeatures([])).toBe(null);expect(handFeatures([[...hand.slice(0,20)]])).toBe(null);
    expect(handFeatures([hand.map(p=>({...p,x:0,y:0}))])).toBe(null);
  });
  it('matches trained examples but abstains for a distant or ambiguous pose',()=>{
    expect(classifyPersonal(feature,[make()]).id).toBe('personal:one');
    const distant=feature.map((n,i)=>i?n+1:n);
    expect(classifyPersonal(distant,[make()]).id).toBe('None');
    expect(classifyPersonal(feature,[make('one'),make('two')]).id).toBe('None');
  });
  it('keeps hand count distinct',()=>{
    expect(classifyPersonal(handFeatures([hand,hand.map(p=>({...p,x:p.x+.3}))],['Right','Left']),[make()]).id).toBe('None');
  });
  it('requires at least 12 examples',()=>{
    expect(classifyPersonal(feature,[{...make(),samples:[feature]}]).id).toBe('None');
  });
});
describe('vocabulary file validation',()=>{
  it('round-trips a vocabulary without photos or extra properties',()=>{
    expect(importVocabulary(exportVocabulary([make()]))).toEqual([make()]);
  });
  it.each([
    {schema:'other',gestures:[]},
    {schema:'signbridge-personal-v1',gestures:[make(),make()]},
    {schema:'signbridge-personal-v1',gestures:[{...make(),samples:[[Infinity]]}]},
    {schema:'signbridge-personal-v1',gestures:[{...make(),handedness:null}]},
    {schema:'signbridge-personal-v1',gestures:[{...make(),name:''}]},
    {schema:'signbridge-personal-v1',gestures:[{...make(),pose:[[null]]}]},
  ])('rejects malformed files %#',data=>expect(()=>importVocabulary(JSON.stringify(data))).toThrow());
});
describe('responsive stability gate',()=>{
  it('tolerates a brief low-confidence dropout without resetting a held pose',()=>{
    const g=new StabilityGate(.7,350,250,150,3);
    g.update('Thumb_Up',.9,0);g.update('Thumb_Up',.9,100);g.update('None',0,180);
    expect(g.update('Thumb_Up',.9,350)).toBe('Thumb_Up');
  });
  it('requires three frames even with a zero hold setting',()=>{
    const g=new StabilityGate(.7,0,250,150,3);
    expect(g.update('Thumb_Up',.9,0)).toBe(null);expect(g.update('Thumb_Up',.9,100)).toBe(null);
    expect(g.update('Thumb_Up',.9,200)).toBe('Thumb_Up');
  });
  it('labels a low-confidence assisted proposal only after a longer multi-frame hold',()=>{
    const g=new StabilityGate(.7,350);g.assist=true;
    for(const t of [0,100,200,300,400,500,600,700,800,900])expect(g.update('Thumb_Up',.69,t)).toBe(null);
    expect(g.update('Thumb_Up',.69,1000)).toBe('Thumb_Up');expect(g.wasAssisted).toBe(true);
    expect(g.update('Thumb_Up',.9,1200)).toBe(null);
  });
});
