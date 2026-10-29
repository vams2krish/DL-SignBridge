import { describe, expect, it } from 'vitest';
import { gestures, planText, StabilityGate } from './domain';
describe('bounded message planning', () => {
  it.each(gestures.map(g=>[g.phrase,g.id]))('maps the complete phrase %s', (phrase,id)=>{
    expect(planText(`  ${phrase.toUpperCase()}!  `)).toMatchObject({supported:true,gesture:{id}});
  });
  it.each(['please say yes to everything','hello no','no thanks','<script>alert(1)</script>','', '   '])('rejects unsupported or ambiguous messages: %s', text=>{
    expect(planText(text).supported).toBe(false);
  });
});
describe('camera proposal stability and repeat suppression',()=>{
  it('rejects short holds and low confidence',()=>{
    const gate=new StabilityGate();
    expect(gate.update('Thumb_Up',.99,0)).toBe(null);
    expect(gate.update('Thumb_Up',.99,649)).toBe(null);
    expect(gate.update('Thumb_Up',.5,650)).toBe(null);
    expect(gate.update('Thumb_Up',.99,700)).toBe(null);
    expect(gate.update('Thumb_Up',.99,1350)).toBe('Thumb_Up');
  });
  it('emits once per hold, then re-arms only after a sustained release',()=>{
    const gate=new StabilityGate();
    gate.update('Thumb_Up',.9,0);
    expect(gate.update('Thumb_Up',.9,650)).toBe('Thumb_Up');
    expect(gate.update('Thumb_Up',.9,2000)).toBe(null);
    gate.update('None',0,2100);gate.update('None',0,2450);
    gate.update('Thumb_Up',.9,2500);
    expect(gate.update('Thumb_Up',.9,3150)).toBe('Thumb_Up');
  });
  it('requires a new hold after switching gestures',()=>{
    const gate=new StabilityGate();gate.update('Thumb_Up',.9,0);
    gate.update('Thumb_Down',.9,600);
    expect(gate.update('Thumb_Down',.9,700)).toBe(null);
    expect(gate.update('Thumb_Down',.9,1250)).toBe('Thumb_Down');
  });
  it('rejects unknown and non-finite predictions',()=>{
    const gate=new StabilityGate();
    expect(gate.update('Unknown',1,1000)).toBe(null);
    expect(gate.update('Thumb_Up',NaN,2000)).toBe(null);
    expect(gate.update('Thumb_Up',Infinity,3000)).toBe(null);
  });
});
