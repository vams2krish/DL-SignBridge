# ISL-focused learning and personal vocabulary

SignBridge now prioritizes **Indian Sign Language (ISL)** as its learning direction. Its personal matcher is not a pretrained ISL translator.

## Three distinct capabilities

| Capability | Count | What it means |
| --- | --- | --- |
| Built-in gesture classifier | 7 categories | Generic static hand categories from MediaPipe, with demo phrase mappings |
| Practice catalog | 207 prompts | Searchable English labels organized into ten categories; not recognized ISL classes |
| Personal vocabulary | Up to 200 poses per tab/file | Static hand poses that the user explicitly teaches with 12–24 examples each |

The [official ISLRTC dictionary](https://islrtc.nic.in/isl-dictionary/) is linked for learning. Its [FAQ](https://islrtc.nic.in/faq/) explains that dictionary videos include English/Hindi equivalents, synonyms, and regional variation. The app links to that source; it does not copy its video collection or claim that all dictionary terms are recognized.

## Teach, test, and retain a personal pose

1. Learn the form from a qualified ISL signer or the official dictionary. Determine whether the sign needs motion, body position, or facial features: those cannot be modeled by this static learner.
2. Open Studio settings and choose one or two tracked hands. Two-hand processing can cost more; use it when the pose requires both hands.
3. Enable the camera with consent, keep all fingertips and wrists visible, and read the live framing/lighting feedback.
4. Enter a distinct name and the caption to propose. Capture 12–24 snapshots with modest angle variation and the same hand count. Capture pauses after 20 seconds if it cannot finish.
5. Save the gesture, release your hands, then test again in Personal recognition mode. Testing on a fresh pose is essential; fitting the captured examples is not validation.
6. Review the caption before speech. A text message exactly matching a personal caption can also display that saved hand-landmark pose.
7. Export deliberately if you want to retain the vocabulary. Reloading the tab clears it. Export/import files contain hand coordinates and labels, not photographs; they remain personal data.

## Matching and rejection

The MediaPipe neural model supplies hand landmarks. A small nearest-neighbor matcher normalizes wrist translation and scale while retaining hand orientation and two-hand spacing. It compares the nearest three examples and rejects distant or ambiguous matches. The displayed similarity is a heuristic distance score, not calibrated probability or accuracy. Built-in low-confidence assist mode is disabled for personal matching.

The vocabulary has no general signer recognition guarantee. Similar handshapes, unstable handedness labels, occlusion, orientation changes, and two-hand ordering changes can cause errors. Landmarks omit face/body grammar and much linguistic context. The saved-pose preview visualizes the captured coordinates; it does not generate a validated signing avatar or reconstruct movement.

Names, phrases, identifiers, sample counts, vector dimensions, coordinate bounds, duplicate phrases, file size, and the schema version are checked on import. The limit is 200 gestures and 24 examples each. No automatic persistent storage or cloud upload is introduced.
