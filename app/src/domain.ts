export const gestures = [
  { id: 'Open_Palm', name: 'Open palm', emoji: '✋', phrase: 'Hello', aliases: ['hello', 'hi', 'open palm'], hint: 'Face your palm toward the camera. Keep all five fingers extended.' },
  { id: 'Thumb_Up', name: 'Thumb up', emoji: '👍', phrase: 'Yes', aliases: ['yes', 'thumb up', 'thumbs up'], hint: 'Close four fingers and point your thumb upward.' },
  { id: 'Thumb_Down', name: 'Thumb down', emoji: '👎', phrase: 'No', aliases: ['no', 'thumb down', 'thumbs down'], hint: 'Close four fingers and point your thumb downward.' },
  { id: 'Closed_Fist', name: 'Closed fist', emoji: '✊', phrase: 'Wait', aliases: ['wait', 'closed fist', 'fist'], hint: 'Close your fingers into a relaxed fist.' },
  { id: 'Pointing_Up', name: 'Point up', emoji: '☝️', phrase: 'One moment', aliases: ['one moment', 'point up', 'pointing up'], hint: 'Extend your index finger upward and close the other fingers.' },
  { id: 'Victory', name: 'Victory', emoji: '✌️', phrase: 'Peace', aliases: ['peace', 'victory'], hint: 'Extend your index and middle fingers in a V.' },
  { id: 'ILoveYou', name: 'I love you', emoji: '🤟', phrase: 'I love you', aliases: ['i love you'], hint: 'Extend your thumb, index, and little finger. Close the middle and ring fingers.' },
] as const;
export type GestureId = typeof gestures[number]['id'];
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
  constructor(public threshold = 0.75, public holdMs = 650, public releaseMs = 350) {}
  reset() { this.candidate = ''; this.since = 0; this.emitted = ''; this.releaseSince = null; }
  update(id: string, score: number, now: number): GestureId | null {
    if (!findGesture(id) || !Number.isFinite(score) || score < this.threshold) {
      this.candidate = '';
      if (this.releaseSince === null) this.releaseSince = now;
      if (now - this.releaseSince >= this.releaseMs) this.emitted = '';
      return null;
    }
    this.releaseSince = null;
    if (id !== this.candidate) { this.candidate = id; this.since = now; }
    if (now - this.since < this.holdMs || this.emitted === id) return null;
    this.emitted = id;
    return id as GestureId;
  }
}

export const CONNECTIONS = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
export type Landmark = { x: number; y: number; z: number };
export type Detection = { id: string; score: number; landmarks: Landmark[][]; inferenceMs: number };
