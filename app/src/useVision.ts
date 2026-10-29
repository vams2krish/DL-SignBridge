import { useCallback, useEffect, useRef, useState } from 'react';
import { StabilityGate, type Detection, type GestureId } from './domain';

type Phase = 'off' | 'loading' | 'live' | 'sample' | 'error';
export function useVision(onGesture: (id: GestureId, score: number, source: 'camera' | 'sample') => void, threshold: number) {
  const video = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>('off');
  const [error, setError] = useState('');
  const [detection, setDetection] = useState<Detection | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const worker = useRef<Worker | null>(null);
  const frame = useRef(0);
  const generation = useRef(0);
  const callback = useRef(onGesture);
  const gate = useRef(new StabilityGate());
  const readyReject = useRef<((e: Error) => void) | null>(null);
  useEffect(() => { callback.current = onGesture; }, [onGesture]);
  useEffect(() => { gate.current.threshold = threshold; gate.current.reset(); }, [threshold]);

  const stop = useCallback(() => {
    generation.current++;
    cancelAnimationFrame(frame.current);
    readyReject.current?.(new Error('Session stopped.'));
    readyReject.current = null;
    worker.current?.terminate(); worker.current = null;
    stream.current?.getTracks().forEach(t => t.stop()); stream.current = null;
    if (video.current) video.current.srcObject = null;
    gate.current.reset(); setPhase('off'); setDetection(null);
  }, []);

  const start = useCallback(async (sample = false) => {
    stop(); const session = generation.current;
    setPhase('loading'); setError('');
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      if (!sample) {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access needs HTTPS and a supported browser. You can still run the sample.');
        const media = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false });
        if (generation.current !== session) { media.getTracks().forEach(t => t.stop()); return; }
        stream.current = media;
        media.getVideoTracks()[0].addEventListener('ended', stop, { once: true });
        if (!video.current) throw new Error('Camera view is not available.');
        video.current.srcObject = media; await video.current.play();
      }
      if (generation.current !== session) return;
      const w = new Worker('/recognizer.worker.js'); worker.current = w;
      let busy = false; let lastFrame = -1;
      await new Promise<void>((resolve, reject) => {
        readyReject.current = reject;
        timeout = setTimeout(() => reject(new Error('The local vision model took too long to load. Please retry.')), 45000);
        w.onerror = () => reject(new Error('The vision worker could not start. Retry or use a current Chrome/Edge browser.'));
        w.onmessage = ({ data }) => {
          if (generation.current !== session) return;
          if (data.type === 'ready') { clearTimeout(timeout); readyReject.current = null; resolve(); }
          if (data.type === 'error') { busy = false; reject(new Error(data.message)); stop(); setPhase('error'); setError('Gesture recognition stopped: ' + data.message); }
          if (data.type === 'result') {
            busy = false;
            const result: Detection = data.detection; setDetection(result);
            if (sample) {
              if (result.score >= gate.current.threshold && result.id !== 'None') callback.current(result.id as GestureId, result.score, 'sample');
            } else {
              const stable = gate.current.update(result.id, result.score, performance.now());
              if (stable) callback.current(stable, result.score, 'camera');
            }
          }
        };
        w.postMessage({ type: 'init' });
      });
      if (generation.current !== session) return;
      w.onerror = () => { stop(); setPhase('error'); setError('Vision processing stopped unexpectedly. Please retry.'); };
      if (sample) {
        const response = await fetch('/thumb-up.jpg');
        if (!response.ok) throw new Error('Sample image could not load.');
        const bitmap = await createImageBitmap(await response.blob());
        if (generation.current !== session) { bitmap.close(); return; }
        setPhase('sample'); w.postMessage({ type: 'frame', bitmap }, [bitmap]);
      } else {
        setPhase('live');
        const loop = async () => {
          if (generation.current !== session) return;
          const v = video.current;
          if (v && v.readyState >= 2 && !busy && v.currentTime !== lastFrame) {
            busy = true; lastFrame = v.currentTime;
            try {
              const bitmap = await createImageBitmap(v, { resizeWidth: 480, resizeHeight: Math.round(480 * v.videoHeight / v.videoWidth) });
              if (generation.current !== session) { bitmap.close(); return; }
              w.postMessage({ type: 'frame', bitmap }, [bitmap]);
            } catch { stop(); setPhase('error'); setError('Could not read camera frames. Please restart the camera.'); return; }
          }
          frame.current = requestAnimationFrame(loop);
        };
        frame.current = requestAnimationFrame(loop);
      }
    } catch (e) {
      if (generation.current !== session) return;
      stop(); setPhase('error');
      const message = e instanceof DOMException && e.name === 'NotAllowedError' ? 'Camera permission was denied. Allow camera access in your browser settings, or run the sample without a camera.' : e instanceof DOMException && e.name === 'NotFoundError' ? 'No camera was found. Connect a camera, or run the sample.' : e instanceof Error ? e.message : 'Could not start vision.';
      setError(message);
    } finally { clearTimeout(timeout); }
  }, [stop]);

  useEffect(() => {
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', hide);
    return () => { document.removeEventListener('visibilitychange', hide); stop(); };
  }, [stop]);
  return { video, phase, error, detection, start, stop };
}
