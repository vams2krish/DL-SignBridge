# Release scope and production readiness

This release is a deployable research demo. It is **not a production-ready sign-language translation service**.

## Implemented safeguards

- Separate camera and microphone consent, visible capture state, and explicit stop controls.
- Vision worker termination and track cleanup on stop, navigation within the app, page hiding, and unmount.
- Neural inference off the main UI thread with one in-flight camera frame at a time.
- Supported-category allowlist, configurable confidence threshold, 650 ms camera hold, and repeat suppression until release.
- Human review before text-to-speech; no auto-speech from uncertain predictions.
- Whole-phrase matching for reverse mapping. Unsupported messages remain readable without invented gestures.
- No server, account database, persistent transcript storage, recording, analytics, or application API credentials.
- Model/WASM hosted with the app; lazy-loaded 3D renderer; context-loss and permission-error fallbacks.
- Unit and browser checks, TypeScript build, accessibility scanning, mobile screenshots, and dependency audit.

## Remaining release gates for a real translation product

- Deaf community partnerships and compensation; target language/dialect and use-case validation.
- Trained, licensed language-specific translation models with held-out signer evaluation.
- Linguist-reviewed motion library with handshape, motion, orientation, gaze, face, body, and spatial grammar.
- Representative hardware/browser testing and calibrated confidence; no minimum device performance is promised.
- Real microphone, speaker, and camera hardware acceptance testing. Headless tests can verify app boundaries, not audible output or the user's physical devices.
- Independent accessibility audit with assistive technology and intended users.
- Security and privacy review of deployment headers, dependencies, browser speech services, and retention policies before adding cloud processing.
- Hosting observability and operational support appropriate to the intended audience.

## Browser behavior

Use a current Chromium desktop browser and HTTPS (or localhost) for the camera. Browser microphone transcription is optional and provider-dependent; audio may go to the browser provider. Some TTS voices are remote; the voice selector labels local voices. Safari/Firefox and mobile behavior require additional device testing. Text input and captions are the fallback.

The model confidence display is not a published accuracy number. Inference timing is device-dependent and excludes the 650 ms hold, review, and speech startup. Avatar mouth motion is decorative, not phoneme-synchronized speech animation.
