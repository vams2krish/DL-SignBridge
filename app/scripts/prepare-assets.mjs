import { mkdir, copyFile, readdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const root = process.cwd();
const target = path.join(root, 'public/models');
await mkdir(target, { recursive: true });
await mkdir(path.join(root, 'public/wasm'), { recursive: true });
for (const name of await readdir(path.join(root, 'node_modules/@mediapipe/tasks-vision/wasm'))) {
  if (/\.(wasm|js)$/.test(name)) await copyFile(path.join(root, 'node_modules/@mediapipe/tasks-vision/wasm', name), path.join(root, 'public/wasm', name));
}
const url = 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';
const response = await fetch(url);
if (!response.ok) throw new Error(`Model download failed: ${response.status}`);
const bytes = Buffer.from(await response.arrayBuffer());
await writeFile(path.join(target, 'gesture_recognizer.task'), bytes);
await copyFile(path.join(root, 'node_modules/@mediapipe/tasks-vision/vision_bundle.js'), path.join(root, 'public/vision_bundle.js'));
const provenance = { source: url, modelVersion: 1, runtime: JSON.parse(await readFile(path.join(root, 'node_modules/@mediapipe/tasks-vision/package.json'), 'utf8')).version, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, license: 'Apache-2.0; see THIRD_PARTY_NOTICES.md and upstream model card' };
await writeFile(path.join(target, 'provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
console.log(`Prepared self-hosted model (${bytes.length} bytes) and WASM runtime.`);
