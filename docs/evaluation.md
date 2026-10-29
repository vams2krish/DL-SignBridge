# Evaluation protocol

The shipped sample is a **functional smoke test**, not an accuracy dataset. There is no claim of validated translation, signer generalization, avatar comprehensibility, or real-time reliability.

## Run a private isolated-gesture evaluation

1. Obtain consent and permission to use each image. Keep private images outside public Git history.
2. Create a test manifest, with image paths relative to the manifest:

```json
{
  "split": "test",
  "threshold": 0.7,
  "trainSignerIds": ["training-signer-01"],
  "images": [
    { "file": "heldout/thumb-up.jpg", "label": "Thumb_Up", "signerId": "test-signer-01" },
    { "file": "heldout/no-hand.jpg", "label": "None", "signerId": "test-signer-02" }
  ]
}
```

3. From `app/`, run `npm run dev`. In another terminal, run:

```bash
npx playwright install chromium
node scripts/evaluate.mjs ../data/test-manifest.json reports/evaluation.json
```

The harness loads the same self-hosted model and worker used by the product. It rejects unsupported labels, duplicate image hashes, missing signer IDs, and signers listed in the declared training set. It permits only a loopback demo URL. Images are read locally and passed into a local browser; they are not sent to a hosted demo.

Outputs include a confusion matrix, class support, precision/recall/F1, rejection rate, image hashes, and median/p95 inference time. The latency includes worker inference and extraction, not the camera hold, speech generation, user review, or complete conversational delay. It uses IMAGE inference, not a continuous signing benchmark. Add device/browser details when reporting results. The manifest can only check declared signer separation; upstream model training identities are unknown.

## Before claiming broad accuracy

- Gather a representative, consented, signer-disjoint dataset with unknown gestures and no-hand negatives.
- Report class distribution, lighting, skin tones, hand visibility, handedness, backgrounds, and failures.
- Tune the threshold on a separate validation set. Do not tune it on the held-out test set.
- Measure temporal duplicate/rejection behavior separately on video.
- Evaluate avatar visual comprehensibility with intended users. Static pose previews do not validate a sign language.
- For ASL–English translation, acquire language-specific data and evaluate semantics and non-manual grammar with fluent signers and linguists.
- Publish results and limitations before changing the product's scope labels.

Private image data and evaluation reports are ignored by Git. Review report filenames and signer identifiers before publishing them.
