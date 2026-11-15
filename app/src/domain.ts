export const gestures = [
  { id: 'Open_Palm', name: 'Open palm', emoji: '✋', phrase: 'Hello', aliases: ['hello', 'hi', 'open palm'], hint: 'Face your palm toward the camera. Keep all five fingers extended.' },
  { id: 'Thumb_Up', name: 'Thumb up', emoji: '👍', phrase: 'Yes', aliases: ['yes', 'thumb up', 'thumbs up'], hint: 'Close four fingers and point your thumb upward.' },
  { id: 'Thumb_Down', name: 'Thumb down', emoji: '👎', phrase: 'No', aliases: ['no', 'thumb down', 'thumbs down'], hint: 'Close four fingers and point your thumb downward.' },
  { id: 'Closed_Fist', name: 'Closed fist', emoji: '✊', phrase: 'Wait', aliases: ['wait', 'closed fist', 'fist'], hint: 'Close your fingers into a relaxed fist.' },
  { id: 'Pointing_Up', name: 'Point up', emoji: '☝️', phrase: 'One moment', aliases: ['one moment', 'point up', 'pointing up'], hint: 'Extend your index finger upward and close the other fingers.' },
  { id: 'Victory', name: 'Victory', emoji: '✌️', phrase: 'Peace', aliases: ['peace', 'victory'], hint: 'Extend your index and middle fingers in a V.' },
  { id: 'ILoveYou', name: 'I love you', emoji: '🤟', phrase: 'I love you', aliases: ['i love you'], hint: 'Extend your thumb, index, and little finger. Close the middle and ring fingers.' },
] as const;
export type GestureId = typeof gestures[number]['id'] | `personal:${string}`;
export type Gesture = typeof gestures[number];
export const findGesture = (id: string) => gestures.find(g => g.id === id);
export type Plan = { supported: true; gesture: Gesture } | { supported: false; reason: string };
export function planText(text: string): Plan {
  const normalized = text.toLowerCase().replace(/[.!?,;:]+/g, '').trim().replace(/\s+/g, ' ');
  const gesture = gestures.find(g => g.aliases.some(alias => alias === normalized));
  return gesture ? { supported: true, gesture } : { supported: false, reason: normalized ? 'This message is outside the demo vocabulary. Your text is preserved below; no gesture has been invented.' : 'Type a supported phrase or choose one below.' };
}

/** Require a continuous confident hold; require release before repeating a gesture. */
export class StabilityGate {
  private candidate = '';
  private since = 0;
  private emitted = '';
  private releaseSince: number | null = null;
  private lastGood = 0;
  private frames = 0;
  public assist = false;
  public wasAssisted = false;
  constructor(public threshold = 0.70, public holdMs = 350, public releaseMs = 250, public dropoutMs = 150, public minFrames = 3) {}
  reset() { this.candidate = ''; this.since = 0; this.emitted = ''; this.releaseSince = null; this.frames=0; this.lastGood=0; }
  update(id: string, score: number, now: number): GestureId | null {
    this.wasAssisted=false;
    const assisted=this.assist&&score<this.threshold;
    const minimum=this.assist?Math.max(.5,this.threshold-.08):this.threshold;
    if ((!findGesture(id) && !/^personal:[a-zA-Z0-9-]+$/.test(id)) || !Number.isFinite(score) || score < minimum) {
      if(now-this.lastGood>this.dropoutMs){this.candidate='';this.frames=0;}
      if (this.releaseSince === null) this.releaseSince = now;
      if (now - this.releaseSince >= this.releaseMs) this.emitted = '';
      return null;
    }
    this.releaseSince = null;
    if (id !== this.candidate) { this.candidate = id; this.since = now; this.frames=0; }
    this.lastGood=now;this.frames++;
    const requiredHold=assisted?Math.max(1000,this.holdMs*2):this.holdMs;
    const requiredFrames=assisted?Math.max(6,this.minFrames):this.minFrames;
    if (now - this.since < requiredHold || this.frames<requiredFrames || this.emitted === id) return null;
    this.emitted = id;
    this.wasAssisted=assisted;
    return id as GestureId;
  }
}

export const CONNECTIONS = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
export type Landmark = { x: number; y: number; z: number };
export type Detection = { id: string; score: number; landmarks: Landmark[][]; inferenceMs: number; handedness?:string[]; quality?:{brightness:number;contrast:number;clipped:boolean;small:boolean}; rawId?:string; rawScore?:number; sourceKind?:'builtin'|'personal'; matchReason?:string };
