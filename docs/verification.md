# Verification — October 28, 2026

Scope: the browser-local, seven-category gesture demo. This report does not certify a production-ready sign-language interpreter.

## Local results

| Check | Result | Evidence / boundary |
| --- | --- | --- |
| Unit logic | 17 tests passed | Complete-phrase matching, unsupported input, hold duration, low confidence, unknown labels, repeat/release behavior |
| Production build | Passed | TypeScript checking and Vite static build |
| Dependency audit | Zero known vulnerabilities | `npm audit --audit-level=moderate` on the committed lockfile |
| Browser integration | 6 tests passed | Playwright Chromium against the production build |
| Real model sample | Passed | Official thumb-up photograph classified by the actual self-hosted MediaPipe model; caption proposal visible |
| Camera loop | Passed with generated source | Canvas-captured sample video passes through real bitmap extraction, worker inference, hold gate, caption proposal, and track cleanup |
| Speech output | App dispatch passed | Edited text reaches `SpeechSynthesisUtterance`; automated test replaces the physical audio boundary |
| Microphone pathway | App integration passed | Separate consent, transcript review, and avatar selection; browser provider is stubbed |
| Unsupported text | Passed | Original message remains visible and avatar returns to rest instead of inventing a gesture |
| Permission recovery | Passed | Camera denial produces an alert and retry/sample paths remain available |
| Accessibility scan | No violations in tested initial studio | axe WCAG 2 A/AA and 2.1 AA rules; native dialog Escape dismissal also tested |
| Responsive layout | Passed at 390 px | No horizontal overflow; mobile showcase captured |
| Evaluation harness | Functional smoke run passed | One official test photo, same worker/model, report generated locally; not a representative accuracy benchmark |
| Screenshots | Five captured and visually inspected | Desktop studio, real recognition, avatar output, library, mobile studio |

Test files: `app/src/domain.test.ts` and `app/tests/studio.spec.ts`. The evaluation harness is `app/scripts/evaluate.mjs`. The sample photo and model sources are recorded in `app/THIRD_PARTY_NOTICES.md` and `app/public/models/provenance.json`.

## Limits

No physical microphone, loudspeaker, camera, or mobile device was independently acceptance-tested in this run. No Deaf-user study, signer-disjoint performance benchmark, natural-language translation evaluation, or avatar comprehension study was conducted. Model confidence and device-specific inference timings shown in screenshots must not be interpreted as translation accuracy or promised real-time latency.

The automated accessibility scan covers the tested studio state; it is not an independent accessibility certification. The CI workflow runs the same build and browser checks on GitHub; remote CI status must be read separately.
