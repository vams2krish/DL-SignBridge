// Classic worker is intentional: the MediaPipe WASM loader initializes ModuleFactory
// through importScripts. Importing that loader as ESM hides its factory binding.
importScripts('/vision_bundle.js');
const { FilesetResolver, GestureRecognizer } = Vision;
let recognizer;
self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') {
      const files = await FilesetResolver.forVisionTasks(`${self.location.origin}/wasm`);
      recognizer = await GestureRecognizer.createFromOptions(files, {
        baseOptions: { modelAssetPath: `${self.location.origin}/models/gesture_recognizer.task`, delegate: 'CPU' },
        runningMode: 'IMAGE', numHands: 1,
        minHandDetectionConfidence: 0.6, minHandPresenceConfidence: 0.6,
      });
      self.postMessage({ type: 'ready' });
    } else if (data.type === 'frame') {
      const start = performance.now();
      try {
        if (!recognizer) throw new Error('Model is not ready.');
        const result = recognizer.recognize(data.bitmap);
        const first = result.gestures[0]?.[0];
        self.postMessage({ type: 'result', detection: { id: first?.categoryName ?? 'None', score: first?.score ?? 0, landmarks: result.landmarks, inferenceMs: performance.now() - start } });
      } finally { data.bitmap.close(); }
    }
  } catch (error) { self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Vision worker failed.' }); }
};
