# Camera responsiveness and measured limits

## Root causes addressed

The first release invoked the model in IMAGE mode for each camera frame. VIDEO mode can track an existing hand instead of rerunning palm detection on every frame. The old 650 ms gate also restarted on every low-confidence result, leaving the user without a caption when classification flickered.

This revision adds:

- VIDEO inference with increasing timestamps; IMAGE mode remains available for the sample photograph.
- One in-flight bitmap, fresh-frame scheduling, and no inference queue to accumulate old camera input.
- 256/360/512 px options, with balanced/detail recovery to 512 px after repeated uncertain tracked frames. More detail can cost more time and does not guarantee a better score.
- Hardware GPU selection when identifiable, with CPU fallback; software-renderer environments use CPU.
- Warm worker/model reuse while the tab stays visible. Stop releases camera tracks immediately; page hiding and unmount also terminate the worker.
- At most ten React detection updates per second, rolling inference/FPS diagnostics, and lower-cost avatar rendering at 24 fps (12 fps in reduced-motion/live-camera mode).
- A default 350 ms hold and three matching results, with 150 ms dropout tolerance and release-based repeat suppression.
- Explicit, configurable **assist mode** for built-in gestures: a score up to eight percentage points below the chosen threshold can propose a caption only after at least one second and six matching results. The lower score is still displayed, the proposal is labeled, and speech requires review. This is a usability tradeoff that can increase false positives, not a claim of improved accuracy.
- Hand-count, framing, brightness, and unsupported-pose feedback instead of silent waiting.

## Controlled measurement

[Raw report](performance-tracking.json): Windows x64, Chromium 156.0.8078.4, CPU delegate, one hand, the same attributed thumb-up test photograph repeated 25 times. Warm statistics exclude the first three frames. This benchmark compares inference modes, not full application versions or real conversational delay.

| Processing mode | Warm median inference | Warm p95 inference | First frame |
| --- | ---: | ---: | ---: |
| IMAGE | 75.9 ms | 87.1 ms | 208.2 ms |
| VIDEO | 48.6 ms | 71.0 ms | 248.6 ms |

Warm median inference was about **36% lower** in this controlled case. The VIDEO first frame was slower. These numbers do not establish a general speedup across devices, two-hand inputs, signers, or GPU backends. Initial model loading, camera startup, transfer, stability holds, human review, and speech startup are additional delays.

The browser tests reproduced a tracked pose whose classification score remained just below the threshold. Higher resolution did not reliably resolve that fixture, so the separate labeled assist mode was tested rather than inflating the model's confidence display. Turn assist off if stricter abstention is preferable.

Run `node scripts/benchmark-vision.mjs` from `app/` with the local dev server running to repeat the mode comparison. Live p95 excludes the first three inference results and uses up to 40 later frames; it is a local rolling statistic, not a service-level promise.
