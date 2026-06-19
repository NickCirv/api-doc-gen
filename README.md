<div align="center">

# api-doc-gen

**Turn JSDoc/TSDoc comments into Markdown, HTML, or JSON docs — no compiler, no config, no dependencies**

[![License: MIT](https://img.shields.io/badge/License-MIT-0B0A09?style=flat-square&labelColor=0B0A09&color=6366f1)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-0B0A09?style=flat-square&labelColor=0B0A09&color=6366f1)](package.json)
[![Zero dependencies](https://img.shields.io/badge/dependencies-0-0B0A09?style=flat-square&labelColor=0B0A09&color=6366f1)](package.json)

</div>

## Install

```bash
npx github:NickCirv/api-doc-gen ./src
```

Or install globally:

```bash
npm install -g github:NickCirv/api-doc-gen
```

## Usage

```bash
# Markdown to stdout (default)
adg ./src

# Standalone dark-themed HTML
adg ./src --format html --output docs/

# JSON for CI pipelines or custom renderers
adg index.js --format json --output api.json

# Watch mode — regenerates on save
adg ./src --watch --output docs/api.md
```

| Flag | Description |
|------|-------------|
| `--format, -f` | `markdown` (default), `html`, `json` |
| `--output, -o` | Output file or directory (default: stdout) |
| `--watch, -w` | Watch for changes and regenerate |
| `--private` | Include `@private` tagged entries |
| `--help, -h` | Show help |
| `--version, -v` | Show version |

## What it does

Scans `.js`, `.ts`, `.mjs`, `.cjs`, `.tsx`, and `.jsx` files recursively and extracts JSDoc comment blocks — `@param`, `@returns`, `@example`, `@throws`, `@deprecated`, `@private`, `@since`, `@author`, `@version` — into structured documentation. No TypeScript compiler, no `node_modules`, no config file required.

HTML output is a self-contained single-file page with a dark theme. JSON output is structured for downstream tooling or custom renderers.

---

<sub>Zero dependencies · Node ≥18 · MIT · by <a href="https://github.com/NickCirv">NickCirv</a></sub>
