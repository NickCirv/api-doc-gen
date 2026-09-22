# api-doc-gen — implementation reference

Source revision: `6b51088532813af53a4b642ac35a7529a0a12d7a`. This reference records source declarations; it is not a transcript of a successful run.

## Entrypoint and runtime

[package.json](https://github.com/NickCirv/api-doc-gen/blob/6b51088532813af53a4b642ac35a7529a0a12d7a/package.json) declares `index.js`. Node.js `>=18.0.0` and npm.

Executable mapping: `api-doc-gen` → `./index.js`, `adg` → `./index.js`.

## Supported workflow

File or directory input; private-entry filtering; output files/directories; watch mode.

Parsing is based on source text and nearby declarations, not a TypeScript compiler. Generated docs can omit dynamic exports or complex syntax; review the result before publishing.

## Command reference

The commands below use the installed executable name. From the pinned checkout, replace it with the `node` entrypoint shown above. Options and command branches were cross-checked against captured source; examples are not execution transcripts.

| Flag | Description |
|------|-------------|
| `--format, -f` | `markdown` (default), `html`, `json` |
| `--output, -o` | Output file or directory (default: stdout) |
| `--watch, -w` | Watch for changes and regenerate |
| `--private` | Include `@private` tagged entries |
| `--help, -h` | Show help |
| `--version, -v` | Show version |

## Package scripts

| Script | Exact command |
| --- | --- |
| `test` | `node --test` |

## Implementation sources

[index.js](https://github.com/NickCirv/api-doc-gen/blob/6b51088532813af53a4b642ac35a7529a0a12d7a/index.js).

## Verification boundary

No repository code, tests, network operation, hook installer or migration was executed for this review. Source inspection supports the documented interface; runtime correctness and external-service compatibility remain unverified.
