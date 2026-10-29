# Third-party assets and dependencies

- **MediaPipe Tasks Vision 1.2.0**: Google / The MediaPipe Authors. Apache License 2.0. [Source and license](https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE). Downloaded runtime files are copied unchanged from the installed NPM package during `npm run assets`.
- **MediaPipe Gesture Recognizer model bundle v1**: Google. [Official task overview and model links](https://ai.google.dev/edge/mediapipe/solutions/vision/gesture_recognizer/index). Downloaded unchanged from the official versioned Google Storage URL recorded in `public/models/provenance.json`. See the upstream model card for intended uses, evaluation, and limitations. This project does not train or claim ownership of the weights.
- **Thumb-up test photo**: [MediaPipe test asset](https://storage.googleapis.com/mediapipe-assets/thumb_up.jpg), distributed with Google's MediaPipe testing assets. Used solely as an openly labeled functional sample; it is not a SignBridge training or validation dataset. [Upstream testing source](https://github.com/google-ai-edge/mediapipe/tree/master/mediapipe/tasks/testdata/vision).
- **React**: Meta Platforms, Inc. and affiliates, MIT.
- **Three.js**: Three.js authors, MIT. Avatar geometry and animation code in this repository are procedural project code, not a downloaded character asset.
- **Lucide**: Lucide contributors, ISC; icon attribution and license are retained in the installed package.
- Development tooling includes Vite, TypeScript, Vitest, Playwright, and axe-core. Their package licenses remain applicable.

The artwork under the repository's `docs/assets/` is AI-generated concept art. Screenshots under `docs/showcase/` are captures of this application; the recognition screenshot contains the attributed MediaPipe sample above.

No blanket license is granted by this notice. Review upstream terms and the repository's licensing status before redistribution or commercial use.
