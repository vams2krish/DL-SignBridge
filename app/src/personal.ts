import type { Landmark } from './domain';

export const MAX_PERSONAL_GESTURES = 200;
export const MIN_SAMPLES = 12;
export const MAX_SAMPLES = 24;
export type PersonalGesture = {
  id: `personal:${string}`;
  name: string;
  phrase: string;
  samples: number[][];
  pose: Landmark[][];
  handedness: string[];
  createdAt: string;
};

/** Translation/scale normalization; retain rotation, hand shape and two-hand spacing.
 * This is a personal static-pose feature, not a natural-language representation. */
export function handFeatures(hands: Landmark[][], handedness: string[] = []): number[] | null {
  if (!Array.isArray(hands)||!hands.length || hands.length > 2 || hands.some(h => !Array.isArray(h)||h.length !== 21 || h.some(p => !p||![p.x,p.y,p.z].every(Number.isFinite)))) return null;
  const indexed = hands.map((h,i) => ({h,side:handedness[i] ?? '',i}));
  // Stable ordering for two hands. A single left hand is mirrored to a right-hand frame.
  if (hands.length === 2) indexed.sort((a,b) => a.h[0].x-b.h[0].x);
  const result: number[] = [hands.length / 2];
  const scales: number[] = [];
  for (const {h,side} of indexed) {
    const wrist = h[0];
    const scale = Math.hypot(h[9].x-wrist.x,h[9].y-wrist.y);
    if (scale < .025) return null;
    scales.push(scale);
    const mirror = hands.length === 1 && side === 'Left' ? -1 : 1;
    for (const p of h) result.push((p.x-wrist.x)/scale*mirror,(p.y-wrist.y)/scale,(p.z-wrist.z)/scale);
  }
  while(result.length < 127) result.push(0);
  if (hands.length === 2) {
    const a=indexed[0].h[0], b=indexed[1].h[0], scale=(scales[0]+scales[1])/2;
    result.push((b.x-a.x)/scale,(b.y-a.y)/scale,(b.z-a.z)/scale);
  } else result.push(0,0,0);
  return result.map(n=>Math.round(n*100000)/100000);
}
export function distance(a: number[],b: number[]) {
  if(a.length!==b.length || a[0]!==b[0]) return Infinity;
  let total=0; for(let i=1;i<a.length;i++)total+=(a[i]-b[i])**2;
  return Math.sqrt(total/(a[0]===.5?63:129));
}
export type PersonalMatch = { id: string; score: number; distance: number; reason: string };
export function classifyPersonal(features: number[] | null, vocabulary: PersonalGesture[]): PersonalMatch {
  if(!features) return {id:'None',score:0,distance:Infinity,reason:'Show the complete hand or hands.'};
  const ranked=vocabulary.filter(g=>g.samples.length>=MIN_SAMPLES).map(g=>{
    const nearest=g.samples.map(s=>distance(features,s)).sort((a,b)=>a-b).slice(0,3);
    return {id:g.id,d:nearest.reduce((a,b)=>a+b,0)/nearest.length};
  }).sort((a,b)=>a.d-b.d);
  const best=ranked[0], second=ranked[1];
  if(!best || !Number.isFinite(best.d) || best.d>.18) return {id:'None',score:0,distance:best?.d??Infinity,reason:'No close personal match. Use the trained hand count and orientation.'};
  if(second && second.d-best.d<.035) return {id:'None',score:0,distance:best.d,reason:'Two learned poses look similar. Add more distinct examples.'};
  // Similarity is a distance-derived heuristic, not calibrated confidence or accuracy.
  return {id:best.id,score:Math.max(0,1-best.d/.6),distance:best.d,reason:'Personal template similarity; review before speaking.'};
}
export function exportVocabulary(gestures: PersonalGesture[]) {
  return JSON.stringify({schema:'signbridge-personal-v1',scope:'Personal static poses, not validated sign-language translation',gestures},null,2);
}
export function importVocabulary(text: string): PersonalGesture[] {
  if(new Blob([text]).size>12*1024*1024)throw new Error('Vocabulary files must be under 12 MB.');
  const parsed=JSON.parse(text);
  if(parsed.schema!=='signbridge-personal-v1'||!Array.isArray(parsed.gestures)||parsed.gestures.length>MAX_PERSONAL_GESTURES)throw new Error('Choose a SignBridge vocabulary file with at most 200 gestures.');
  const ids=new Set<string>(),phrases=new Set<string>();
  return parsed.gestures.map((g:PersonalGesture)=>{
    if(!g||typeof g.id!=='string'||!/^personal:[a-zA-Z0-9-]{1,64}$/.test(g.id)||ids.has(g.id))throw new Error('Gesture identifiers are invalid or duplicated.');
    if(typeof g.name!=='string'||!g.name.trim()||g.name.length>60||typeof g.phrase!=='string'||!g.phrase.trim()||g.phrase.length>200)throw new Error('Each gesture needs a name (up to 60 characters) and phrase (up to 200).');
    const phrase=g.phrase.trim().toLowerCase();if(phrases.has(phrase))throw new Error('Each learned gesture needs a different phrase.');
    if(!Array.isArray(g.samples)||g.samples.length<MIN_SAMPLES||g.samples.length>MAX_SAMPLES||g.samples.some(s=>!Array.isArray(s)||s.length!==130||![.5,1].includes(s[0])||s.some(n=>typeof n!=='number'||!Number.isFinite(n)||Math.abs(n)>15)))throw new Error('Gesture samples are malformed or outside the allowed range.');
    if(!Array.isArray(g.handedness)||g.handedness.some(s=>!['Left','Right'].includes(s))||!Array.isArray(g.pose)||!handFeatures(g.pose,g.handedness))throw new Error('The stored hand pose is invalid.');
    if(g.pose.some(h=>h.some(p=>Math.abs(p.x)>2||Math.abs(p.y)>2||Math.abs(p.z)>5)))throw new Error('Stored landmark coordinates are outside the allowed range.');
    ids.add(g.id);phrases.add(phrase);
    return {id:g.id,name:g.name.trim(),phrase:g.phrase.trim(),samples:g.samples,pose:g.pose,handedness:g.handedness,createdAt:typeof g.createdAt==='string'?g.createdAt:''};
  });
}
