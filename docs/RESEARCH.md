# api-doc-gen — documentation research

Reviewed 21 September 2026. Public GitHub source only.

## Revision and scope

- Commit: [`6b51088532813af53a4b642ac35a7529a0a12d7a`](https://github.com/NickCirv/api-doc-gen/commit/6b51088532813af53a4b642ac35a7529a0a12d7a).
- Tree: `173dbddd11188b0a3d4820addfac4dbc948808eb`; truncated: `false`.
- Capture: 6 of 6 eligible text files; all eligible text files.
- Method: package and entrypoint inspection, implementation-interface review, targeted behavior/limitation inspection, and test-source review. This is not an exhaustive correctness or security audit.
- Commands run against repository code: **none**. External services, deployment and npm publication were not verified.

## Claim and evidence map

| Documentation claim | Pinned evidence | Assessment |
| --- | --- | --- |
| Runtime, executable and development commands | [package.json](https://github.com/NickCirv/api-doc-gen/blob/6b51088532813af53a4b642ac35a7529a0a12d7a/package.json) | Source declaration inspected; runtime unverified |
| Builds Markdown, HTML or JSON API documentation from JSDoc-style comments in JavaScript and TypeScript files. | [index.js](https://github.com/NickCirv/api-doc-gen/blob/6b51088532813af53a4b642ac35a7529a0a12d7a/index.js) | Implementation interfaces inspected; behavior not executed |
| File or directory input; private-entry filtering; output files/directories; watch mode. | [index.js](https://github.com/NickCirv/api-doc-gen/blob/6b51088532813af53a4b642ac35a7529a0a12d7a/index.js) | Source-backed scope, not a test result |
| Parsing is based on source text and nearby declarations, not a TypeScript compiler. Generated docs can omit dynamic exports or complex syntax; review the result before publishing. | [index.js](https://github.com/NickCirv/api-doc-gen/blob/6b51088532813af53a4b642ac35a7529a0a12d7a/index.js) | Material limits documented; service compatibility remains open |
| Existing checks | [test/smoke.test.js](https://github.com/NickCirv/api-doc-gen/blob/6b51088532813af53a4b642ac35a7529a0a12d7a/test/smoke.test.js) | Test source read; no passing-run claim |

## Documentation inventory and disposition

| Existing document | Decision |
| --- | --- |
| [README.md](https://github.com/NickCirv/api-doc-gen/blob/6b51088532813af53a4b642ac35a7529a0a12d7a/README.md) | Rewritten with source-specific purpose, direct checkout setup, limitations and verification status. Old section fragments retained where practical. |

Added `docs/REFERENCE.md` for the observed implementation and command surface, and this research record. Protected license and attribution files remain in their original locations without edits. No source or product UI was changed.

## Quality dimensions

| Dimension | Status | Evidence / next step |
| --- | --- | --- |
| Pinned provenance | Verified | Captured commit, tree and per-file hashes recorded below |
| Interface documentation | Partially verified | Source inspection only; run clean-checkout quickstart |
| Runtime behavior | Unverified | No repository execution in this review |
| Test results | Unverified | Existing tests were not run |
| Deployment / package availability | Unverified | No remote publish or live-service check |
| Visual / link checks | Unverified | Portfolio renderer and independent QA are separate from this authoring step |

## Unresolved issues

Parsing is based on source text and nearby declarations, not a TypeScript compiler. Generated docs can omit dynamic exports or complex syntax; review the result before publishing.

## Captured source inventory

This lists captured provenance, not a claim that every line received a full audit. Binary/generated/excluded files are outside the eligible text capture.

| File | SHA-256 | Bytes |
| --- | --- | --- |
| [LICENSE](https://github.com/NickCirv/api-doc-gen/blob/6b51088532813af53a4b642ac35a7529a0a12d7a/LICENSE) | `8edf13ba2a2e443fa49e42493414f6952a4a14b6c407983a7c95162ab37f6265` | 1065 |
| [README.md](https://github.com/NickCirv/api-doc-gen/blob/6b51088532813af53a4b642ac35a7529a0a12d7a/README.md) | `df9c2f179f54b1095063d3f9ae8b84c37d85b39a9e89faa39e67813a827cfac8` | 1909 |
| [package.json](https://github.com/NickCirv/api-doc-gen/blob/6b51088532813af53a4b642ac35a7529a0a12d7a/package.json) | `9bf5f58956ba7e5d3ead4b0dcda613717cfa06f097264cb6143d4be67d9deb28` | 939 |
| [.github/workflows/ci.yml](https://github.com/NickCirv/api-doc-gen/blob/6b51088532813af53a4b642ac35a7529a0a12d7a/.github/workflows/ci.yml) | `433fbf65635a767ef5cd787147104c248d0cea6bbd6523c6c862f915e0e3206a` | 384 |
| [index.js](https://github.com/NickCirv/api-doc-gen/blob/6b51088532813af53a4b642ac35a7529a0a12d7a/index.js) | `5c42b4324bf3f4f04684ad13267bb1038a3a5471a6749ca78b35a0aac6318292` | 25267 |
| [test/smoke.test.js](https://github.com/NickCirv/api-doc-gen/blob/6b51088532813af53a4b642ac35a7529a0a12d7a/test/smoke.test.js) | `4e107fe059a90eaaa70dc98e0563d1c6f6e66e9e692b7525f16ce8dcb3755ffa` | 453 |
