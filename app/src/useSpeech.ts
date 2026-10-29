import { useCallback, useEffect, useRef, useState } from 'react';
type Recognition = {
  lang: string; interimResults: boolean; continuous: boolean;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
export function useSpeech(onTranscript: (text: string) => void) {
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const recognition = useRef<Recognition | null>(null);
  const speechToken = useRef(0);
  const callback = useRef(onTranscript);
  useEffect(() => { callback.current = onTranscript; }, [onTranscript]);
  const win = window as SpeechWindow;
  const canListen = !!(win.SpeechRecognition || win.webkitSpeechRecognition);
  const canSpeak = 'speechSynthesis' in window;
  useEffect(() => {
    if (!canSpeak) return;
    const update = () => setVoices(window.speechSynthesis.getVoices());
    update(); window.speechSynthesis.addEventListener('voiceschanged', update);
    return () => { window.speechSynthesis.removeEventListener('voiceschanged', update); window.speechSynthesis.cancel(); };
  }, [canSpeak]);
  const stopSpeaking = useCallback(() => { speechToken.current++; window.speechSynthesis?.cancel(); setSpeaking(false); }, []);
  const speak = useCallback((text: string, rate: number, voiceName: string) => {
    stopSpeaking(); setError('');
    if (!canSpeak) { setError('Speech synthesis is unavailable. Your captions remain available.'); return; }
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 500));
    const token = speechToken.current;
    utterance.rate = rate; utterance.lang = 'en-US';
    const voice = voices.find(v => v.name === voiceName); if (voice) utterance.voice = voice;
    utterance.onstart = () => { if (token === speechToken.current) setSpeaking(true); };
    utterance.onend = () => { if (token === speechToken.current) setSpeaking(false); };
    utterance.onerror = e => { if (token !== speechToken.current) return; setSpeaking(false); if (e.error !== 'canceled' && e.error !== 'interrupted') setError('Speech playback failed. Try another installed voice.'); };
    window.speechSynthesis.speak(utterance);
  }, [canSpeak, voices, stopSpeaking]);
  const stopListening = useCallback(() => { const r = recognition.current; recognition.current = null; if (r) { r.onend = null; r.onresult = null; r.onerror = null; r.abort(); } setListening(false); }, []);
  const listen = useCallback(() => {
    stopListening(); stopSpeaking(); setError('');
    const Constructor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!Constructor) { setError('Microphone transcription is not supported in this browser. Type your message instead.'); return; }
    const r = new Constructor(); recognition.current = r;
    r.lang = 'en-US'; r.interimResults = true; r.continuous = false;
    r.onresult = e => callback.current(Array.from(e.results).map(row => row[0].transcript).join(' '));
    r.onerror = e => { setListening(false); setError(e.error === 'not-allowed' ? 'Microphone access was denied. You can type instead.' : `Microphone transcription stopped (${e.error}). You can type instead.`); };
    r.onend = () => { setListening(false); recognition.current = null; };
    try { r.start(); setListening(true); } catch { setError('The microphone could not start. Please try again.'); }
  }, [win.SpeechRecognition, win.webkitSpeechRecognition, stopListening, stopSpeaking]);
  useEffect(() => {
    const hide = () => { if (document.hidden) { stopListening(); stopSpeaking(); } };
    document.addEventListener('visibilitychange', hide);
    return () => { document.removeEventListener('visibilitychange', hide); stopListening(); stopSpeaking(); };
  }, [stopListening, stopSpeaking]);
  return { speaking, listening, error, voices, canListen, canSpeak, speak, stopSpeaking, listen, stopListening };
}
