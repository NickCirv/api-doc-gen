#!/usr/bin/env node
/**
 * api-doc-gen — Generate API documentation from JSDoc/TSDoc comments.
 * Zero external dependencies. Pure Node.js ES modules.
 *
 * @description Scans JS/TS files for JSDoc comment blocks and produces
 *   Markdown, HTML, or JSON documentation with no compiler required.
 * @example
 * // Generate Markdown docs for a directory
 * adg ./src
 * // Generate HTML docs to a specific output path
 * adg ./src --format html --output docs/
 * @author NickCirv
 * @version 1.0.0
 */

import fs from 'fs';
import path from 'path';

// ─── Constants ───────────────────────────────────────────────────────────────

const VERSION = '1.0.0';
const SUPPORTED_EXTENSIONS = ['.js', '.ts', '.mjs', '.cjs', '.tsx', '.jsx'];

// ─── Argument Parser ──────────────────────────────────────────────────────────

/**
 * Parses command-line arguments into a structured config object.
 * @param {string[]} argv - Raw process.argv slice
 * @returns {{ input: string|null, format: string, output: string|null, watch: boolean, includePrivate: boolean, help: boolean, version: boolean }} Parsed config
 */
function parseArgs(argv) {
  const args = argv.slice(2);
  const config = {
    input: null,
    format: 'markdown',
    output: null,
    watch: false,
    includePrivate: false,
    help: false,
    version: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      config.help = true;
    } else if (arg === '--version' || arg === '-v') {
      config.version = true;
    } else if (arg === '--watch' || arg === '-w') {
      config.watch = true;
    } else if (arg === '--private') {
      config.includePrivate = true;
    } else if (arg === '--format' || arg === '-f') {
      const next = args[i + 1];
      if (next && ['markdown', 'html', 'json', 'md'].includes(next)) {
        config.format = next === 'md' ? 'markdown' : next;
        i++;
      } else {
        process.stderr.write('Error: --format requires one of: markdown, html, json\n');
        process.exit(1);
      }
    } else if (arg === '--output' || arg === '-o') {
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        config.output = next;
        i++;
      } else {
        process.stderr.write('Error: --output requires a path\n');
        process.exit(1);
      }
    } else if (!arg.startsWith('-')) {
      config.input = arg;
    }
  }

  return config;
}

// ─── File Discovery ───────────────────────────────────────────────────────────

/**
 * Recursively discovers all JS/TS files in a directory.
 * @param {string} dirPath - Directory to scan
 * @param {string[]} [results=[]] - Accumulator for file paths
 * @returns {string[]} Array of absolute file paths
 */
function discoverFiles(dirPath, results = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      discoverFiles(fullPath, results);
    } else if (entry.isFile() && SUPPORTED_EXTENSIONS.includes(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Resolves the input path to a list of files to process.
 * @param {string} inputPath - File or directory path
 * @returns {string[]} Resolved list of file paths
 * @throws {Error} If the path does not exist
 */
function resolveInputFiles(inputPath) {
  const resolved = path.resolve(inputPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Path not found: ${resolved}`);
  }
  const stat = fs.statSync(resolved);
  if (stat.isDirectory()) {
    return discoverFiles(resolved);
  }
  return [resolved];
}

// ─── JSDoc Parser ─────────────────────────────────────────────────────────────

/**
 * Parses a single JSDoc block string into a structured object.
 * @param {string} block - Raw JSDoc block including delimiters
 * @returns {{ description: string, tags: Object.<string, string[]> }} Parsed doc object
 */
function parseJsDocBlock(block) {
  const lines = block
    .replace(/^\/\*\*/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map(line => line.replace(/^\s*\*\s?/, '').trim());

  const doc = { description: '', tags: {} };
  let descLines = [];
  let currentTag = null;
  let currentTagContent = [];

  const flushTag = () => {
    if (currentTag) {
      if (!doc.tags[currentTag]) doc.tags[currentTag] = [];
      doc.tags[currentTag].push(currentTagContent.join(' ').trim());
      currentTag = null;
      currentTagContent = [];
    }
  };

  for (const line of lines) {
    const tagMatch = line.match(/^@(\w+)\s*(.*)/);
    if (tagMatch) {
      flushTag();
      currentTag = tagMatch[1];
      currentTagContent = [tagMatch[2]];
    } else if (currentTag) {
      currentTagContent.push(line);
    } else if (line) {
      descLines.push(line);
    }
  }
  flushTag();
  doc.description = descLines.join(' ').trim();
  return doc;
}

/**
 * Finds the code declaration immediately following a JSDoc block.
 * @param {string} source - Full source file content
 * @param {number} blockEndIndex - Index where the JSDoc block ends
 * @returns {{ name: string|null, kind: string|null }} Declaration name and kind
 */
function findDeclaration(source, blockEndIndex) {
  const afterBlock = source.slice(blockEndIndex, blockEndIndex + 300);
  const declRegex = /(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\s*\*?\s*|class\s+|const\s+|let\s+|var\s+)(\w+)/;
  const match = afterBlock.match(declRegex);
  if (!match) return { name: null, kind: null };
  const kindMatch = afterBlock.match(/(?:export\s+)?(?:default\s+)?(?:async\s+)?(function\*?|class|const|let|var)/);
  const kind = kindMatch ? kindMatch[1].replace('*', '').trim() : 'unknown';
  return { name: match[1], kind };
}

/**
 * Parses @param tag strings into structured parameter objects.
 * @param {string[]} params - Array of raw @param tag values
 * @returns {Array.<{ name: string, type: string, description: string }>} Parsed params
 * @example
 * parseParams(['{string} name - The user name'])
 * // => [{ name: 'name', type: 'string', description: 'The user name' }]
 */
function parseParams(params) {
  return (params || []).map(p => {
    const typeMatch = p.match(/^\{([^}]+)\}/);
    const type = typeMatch ? typeMatch[1] : '';
    const rest = typeMatch ? p.slice(typeMatch[0].length).trim() : p;
    const dashIdx = rest.search(/\s[-\u2014]\s/);
    const name = dashIdx !== -1 ? rest.slice(0, dashIdx).trim() : rest.split(' ')[0];
    const description = dashIdx !== -1 ? rest.slice(dashIdx).replace(/^\s*[-\u2014]\s*/, '').trim() : '';
    return { name, type, description };
  });
}

/**
 * Parses a @returns tag string into a structured object.
 * @param {string[]} returns - Array of raw @returns tag values
 * @returns {{ type: string, description: string }|null} Parsed return info or null
 */
function parseReturns(returns) {
  if (!returns || returns.length === 0) return null;
  const r = returns[0];
  const typeMatch = r.match(/^\{([^}]+)\}/);
  const type = typeMatch ? typeMatch[1] : '';
  const rest = typeMatch ? r.slice(typeMatch[0].length).trim() : r;
  const description = rest.replace(/^[-\u2014]\s*/, '').trim();
  return { type, description };
}

/**
 * Parses @throws tag strings into structured objects.
 * @param {string[]} throws - Array of raw @throws tag values
 * @returns {Array.<{ type: string, description: string }>} Parsed throws
 */
function parseThrows(throws) {
  return (throws || []).map(t => {
    const typeMatch = t.match(/^\{([^}]+)\}/);
    const type = typeMatch ? typeMatch[1] : 'Error';
    const rest = typeMatch ? t.slice(typeMatch[0].length).trim() : t;
    return { type, description: rest.replace(/^[-\u2014]\s*/, '').trim() };
  });
}

/**
 * Processes a source file and extracts all documented API entries.
 * @param {string} filePath - Absolute path to the source file
 * @param {boolean} includePrivate - Whether to include @private entries
 * @returns {Array.<{ name: string, kind: string, description: string, params: Array, returns: Object|null, examples: string[], throws: Array, deprecated: string|null, private: boolean, file: string }>} Extracted API entries
 */
function processFile(filePath, includePrivate) {
  const source = fs.readFileSync(filePath, 'utf-8');
  const blockRegex = /\/\*\*[\s\S]*?\*\//g;
  const entries = [];
  let match;

  while ((match = blockRegex.exec(source)) !== null) {
    const block = match[0];
    const blockEndIndex = match.index + block.length;
    const doc = parseJsDocBlock(block);
    const isPrivate = !!(doc.tags.private || doc.tags.ignore);

    if (isPrivate && !includePrivate) continue;
    if (!doc.description && Object.keys(doc.tags).length === 0) continue;

    const { name, kind } = findDeclaration(source, blockEndIndex);

    entries.push({
      name: name || 'unknown',
      kind,
      description: doc.description,
      params: parseParams(doc.tags.param),
      returns: parseReturns(doc.tags.returns || doc.tags.return),
      examples: doc.tags.example || [],
      throws: parseThrows(doc.tags.throws || doc.tags.exception),
      deprecated: doc.tags.deprecated ? doc.tags.deprecated[0] : null,
      private: isPrivate,
      file: filePath,
      author: doc.tags.author ? doc.tags.author[0] : null,
      version: doc.tags.version ? doc.tags.version[0] : null,
      since: doc.tags.since ? doc.tags.since[0] : null,
    });
  }

  return entries;
}

// ─── Markdown Renderer ────────────────────────────────────────────────────────

/**
 * Renders a collection of API entries as a Markdown document.
 * @param {Array} entries - All parsed API entries
 * @param {string[]} files - List of source files processed
 * @returns {string} Complete Markdown document string
 */
function renderMarkdown(entries, files) {
  const lines = [
    '# API Documentation',
    '',
    `> Generated by [api-doc-gen](https://github.com/NickCirv/api-doc-gen) v${VERSION} on ${new Date().toISOString().split('T')[0]}`,
    '',
  ];

  const byFile = {};
  for (const entry of entries) {
    if (!byFile[entry.file]) byFile[entry.file] = [];
    byFile[entry.file].push(entry);
  }

  for (const [file, fileEntries] of Object.entries(byFile)) {
    const relPath = path.relative(process.cwd(), file);
    lines.push(`## \`${relPath}\``, '');

    for (const entry of fileEntries) {
      const paramList = entry.params.map(p => p.name).join(', ');
      const signature = entry.kind === 'class'
        ? `## class ${entry.name}`
        : `## ${entry.name}(${paramList})`;

      lines.push(signature);

      if (entry.deprecated) {
        lines.push('', `> **Deprecated:** ${entry.deprecated}`);
      }
      if (entry.private) {
        lines.push('', '_This is a private API._');
      }
      if (entry.description) {
        lines.push('', entry.description);
      }
      if (entry.params.length > 0) {
        lines.push('', '**Parameters:**', '');
        for (const p of entry.params) {
          const type = p.type ? `\`${p.type}\`` : '';
          const desc = p.description ? ` — ${p.description}` : '';
          lines.push(`- \`${p.name}\` ${type}${desc}`);
        }
      }
      if (entry.returns) {
        const type = entry.returns.type ? `\`${entry.returns.type}\`` : '';
        const desc = entry.returns.description ? ` — ${entry.returns.description}` : '';
        lines.push('', `**Returns:** ${type}${desc}`);
      }
      if (entry.throws.length > 0) {
        lines.push('', '**Throws:**', '');
        for (const t of entry.throws) {
          lines.push(`- \`${t.type}\` — ${t.description}`);
        }
      }
      if (entry.examples.length > 0) {
        for (const ex of entry.examples) {
          lines.push('', '**Example:**', '', '```js', ex.trim(), '```');
        }
      }
      if (entry.since) lines.push('', `**Since:** ${entry.since}`);
      if (entry.author) lines.push('', `**Author:** ${entry.author}`);
      lines.push('', '---', '');
    }
  }

  return lines.join('\n');
}

// ─── HTML Renderer ────────────────────────────────────────────────────────────

/**
 * Renders a collection of API entries as a standalone HTML document.
 * @param {Array} entries - All parsed API entries
 * @param {string[]} files - List of source files processed
 * @returns {string} Complete HTML document string
 */
function renderHtml(entries, files) {
  const esc = s => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const byFile = {};
  for (const entry of entries) {
    if (!byFile[entry.file]) byFile[entry.file] = [];
    byFile[entry.file].push(entry);
  }

  const sections = Object.entries(byFile).map(([file, fileEntries]) => {
    const relPath = path.relative(process.cwd(), file);
    const items = fileEntries.map(entry => {
      const paramList = entry.params.map(p => p.name).join(', ');
      const signature = entry.kind === 'class'
        ? `class ${entry.name}`
        : `${entry.name}(${paramList})`;

      const paramRows = entry.params.map(p =>
        `<tr><td><code>${esc(p.name)}</code></td><td>${p.type ? `<code>${esc(p.type)}</code>` : ''}</td><td>${esc(p.description)}</td></tr>`
      ).join('');

      const paramsHtml = entry.params.length > 0 ? `
        <div class="section"><h4>Parameters</h4>
        <table><thead><tr><th>Name</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>${paramRows}</tbody></table></div>` : '';

      const returnsHtml = entry.returns ? `
        <div class="section"><h4>Returns</h4>
        <p>${entry.returns.type ? `<code>${esc(entry.returns.type)}</code>` : ''} ${esc(entry.returns.description)}</p></div>` : '';

      const throwsHtml = entry.throws.length > 0 ? `
        <div class="section"><h4>Throws</h4>
        <ul>${entry.throws.map(t => `<li><code>${esc(t.type)}</code> — ${esc(t.description)}</li>`).join('')}</ul></div>` : '';

      const examplesHtml = entry.examples.map(ex => `
        <div class="section"><h4>Example</h4>
        <pre><code>${esc(ex.trim())}</code></pre></div>`).join('');

      const deprecatedBadge = entry.deprecated ? `<span class="badge deprecated">Deprecated</span>` : '';
      const privateBadge = entry.private ? `<span class="badge private">Private</span>` : '';

      return `<div class="entry">
        <h3>${esc(signature)} ${deprecatedBadge}${privateBadge}</h3>
        ${entry.description ? `<p class="description">${esc(entry.description)}</p>` : ''}
        ${paramsHtml}${returnsHtml}${throwsHtml}${examplesHtml}
      </div>`;
    }).join('');

    return `<section><h2><code>${esc(relPath)}</code></h2>${items}</section>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>API Documentation</title>
<style>
  :root{--bg:#0f1117;--surface:#1a1d27;--border:#2d3148;--accent:#6366f1;--text:#e2e8f0;--muted:#94a3b8;--code-bg:#0d1117}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--bg);color:var(--text);line-height:1.6}
  .container{max-width:960px;margin:0 auto;padding:2rem 1.5rem}
  header{border-bottom:1px solid var(--border);padding-bottom:1.5rem;margin-bottom:2rem}
  h1{font-size:2rem;color:var(--accent)}
  .meta{color:var(--muted);font-size:.875rem;margin-top:.5rem}
  section{margin-bottom:3rem}
  h2{font-size:1.1rem;color:var(--muted);border-bottom:1px solid var(--border);padding-bottom:.5rem;margin-bottom:1.5rem}
  .entry{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:1.5rem;margin-bottom:1.5rem}
  .entry h3{font-size:1rem;font-family:'SF Mono','Fira Code',monospace;color:var(--accent);margin-bottom:.75rem}
  .description{color:var(--text);margin-bottom:1rem}
  .section{margin-top:1rem}
  .section h4{font-size:.8rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:.5rem}
  table{width:100%;border-collapse:collapse;font-size:.875rem}
  th,td{text-align:left;padding:.5rem .75rem;border:1px solid var(--border)}
  th{background:var(--bg);color:var(--muted);font-weight:600}
  code{background:var(--code-bg);padding:.15em .4em;border-radius:3px;font-family:'SF Mono','Fira Code',monospace;font-size:.875em}
  pre{background:var(--code-bg);border:1px solid var(--border);border-radius:6px;padding:1rem;overflow-x:auto}
  pre code{background:none;padding:0}
  .badge{display:inline-block;font-size:.7rem;padding:.15em .5em;border-radius:4px;margin-left:.5rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em}
  .badge.deprecated{background:#7c2d12;color:#fca5a5}
  .badge.private{background:#1e3a5f;color:#93c5fd}
  ul{padding-left:1.25rem}
  li{margin-bottom:.25rem}
  a{color:var(--accent)}
  footer{border-top:1px solid var(--border);margin-top:3rem;padding-top:1.5rem;color:var(--muted);font-size:.875rem;text-align:center}
</style>
</head>
<body>
<div class="container">
  <header>
    <h1>API Documentation</h1>
    <p class="meta">Generated by <a href="https://github.com/NickCirv/api-doc-gen">api-doc-gen</a> v${esc(VERSION)} &mdash; ${new Date().toISOString().split('T')[0]}</p>
  </header>
  ${sections}
  <footer>Generated by <a href="https://github.com/NickCirv/api-doc-gen">api-doc-gen</a> v${esc(VERSION)}</footer>
</div>
</body>
</html>`;
}

// ─── JSON Renderer ────────────────────────────────────────────────────────────

/**
 * Serialises API entries as a structured JSON document.
 * @param {Array} entries - All parsed API entries
 * @param {string[]} files - List of source files processed
 * @returns {string} Formatted JSON string
 */
function renderJson(entries, files) {
  const output = {
    generated: new Date().toISOString(),
    generator: `api-doc-gen v${VERSION}`,
    files: files.map(f => path.relative(process.cwd(), f)),
    entries: entries.map(e => ({
      ...e,
      file: path.relative(process.cwd(), e.file),
    })),
  };
  return JSON.stringify(output, null, 2);
}

// ─── Output Writer ────────────────────────────────────────────────────────────

/**
 * Determines the output file path based on format and output flag.
 * @param {string|null} outputArg - The --output argument value
 * @param {string} format - Output format: markdown|html|json
 * @returns {string|null} File path to write, or null for stdout
 */
function resolveOutputPath(outputArg, format) {
  if (!outputArg) return null;
  const extMap = { markdown: '.md', html: '.html', json: '.json' };
  const ext = extMap[format];

  if (fs.existsSync(outputArg) && fs.statSync(outputArg).isDirectory()) {
    return path.join(outputArg, `api-docs${ext}`);
  }
  if (outputArg.endsWith('/') || outputArg.endsWith('\\')) {
    fs.mkdirSync(outputArg, { recursive: true });
    return path.join(outputArg, `api-docs${ext}`);
  }
  const dir = path.dirname(outputArg);
  if (dir !== '.') fs.mkdirSync(dir, { recursive: true });
  return outputArg;
}

/**
 * Writes rendered content to a file or stdout.
 * @param {string} content - The rendered documentation string
 * @param {string|null} outputPath - File path or null for stdout
 * @returns {void}
 */
function writeOutput(content, outputPath) {
  if (outputPath) {
    fs.writeFileSync(outputPath, content, 'utf-8');
    process.stderr.write(`Wrote to ${outputPath}\n`);
  } else {
    process.stdout.write(content + '\n');
  }
}

// ─── Core Pipeline ────────────────────────────────────────────────────────────

/**
 * Runs the full documentation generation pipeline.
 * @param {string} inputPath - Source file or directory
 * @param {{ format: string, output: string|null, includePrivate: boolean }} opts - Options
 * @returns {{ entries: Array, files: string[], content: string }} Generation result
 */
function generate(inputPath, opts) {
  const files = resolveInputFiles(inputPath);
  const entries = [];
  for (const file of files) {
    entries.push(...processFile(file, opts.includePrivate));
  }

  let content;
  if (opts.format === 'html') {
    content = renderHtml(entries, files);
  } else if (opts.format === 'json') {
    content = renderJson(entries, files);
  } else {
    content = renderMarkdown(entries, files);
  }

  return { entries, files, content };
}

// ─── Watch Mode ───────────────────────────────────────────────────────────────

/**
 * Starts watch mode, regenerating docs on file changes.
 * @param {string} inputPath - Source file or directory
 * @param {{ format: string, output: string|null, includePrivate: boolean }} opts - Options
 * @returns {void}
 */
function startWatch(inputPath, opts) {
  const resolved = path.resolve(inputPath);
  let debounceTimer = null;

  const run = () => {
    try {
      const result = generate(inputPath, opts);
      const outputPath = resolveOutputPath(opts.output, opts.format);
      writeOutput(result.content, outputPath);
      process.stderr.write(`[${new Date().toLocaleTimeString()}] Regenerated: ${result.entries.length} entries from ${result.files.length} file(s)\n`);
    } catch (err) {
      process.stderr.write(`Watch error: ${err.message}\n`);
    }
  };

  run();

  fs.watch(resolved, { recursive: true }, (event, filename) => {
    if (!filename) return;
    const ext = path.extname(filename);
    if (!SUPPORTED_EXTENSIONS.includes(ext)) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(run, 200);
  });

  process.stderr.write(`Watching ${resolved} for changes... (Ctrl+C to stop)\n`);
}

// ─── Help ─────────────────────────────────────────────────────────────────────

/**
 * Prints the help message to stdout.
 * @returns {void}
 */
function printHelp() {
  process.stdout.write(`api-doc-gen v${VERSION} — Generate API docs from JSDoc/TSDoc comments

USAGE
  adg [file|dir] [options]
  api-doc-gen [file|dir] [options]

OPTIONS
  --format, -f <format>   Output format: markdown (default), html, json
  --output, -o <path>     Output file or directory. Default: stdout
  --watch, -w             Watch for changes and regenerate
  --private               Include @private tagged entries
  --help, -h              Show this help message
  --version, -v           Show version

EXAMPLES
  adg ./src
  adg ./src --format html --output docs/
  adg index.js --format json --output api.json
  adg ./src --watch --output docs/api.md
  adg ./src --private

SUPPORTED EXTENSIONS
  .js .ts .mjs .cjs .tsx .jsx

SUPPORTED TAGS
  @description @param @returns @example @throws @deprecated @private @since @author @version
`);
}

// ─── Entrypoint ───────────────────────────────────────────────────────────────

/**
 * Main entry point — parses args and dispatches to appropriate mode.
 * @returns {void}
 */
function main() {
  const config = parseArgs(process.argv);

  if (config.version) {
    process.stdout.write(`api-doc-gen v${VERSION}\n`);
    process.exit(0);
  }

  if (config.help || !config.input) {
    printHelp();
    process.exit(config.help ? 0 : 1);
  }

  const opts = {
    format: config.format,
    output: config.output,
    includePrivate: config.includePrivate,
  };

  if (config.watch) {
    startWatch(config.input, opts);
    return;
  }

  try {
    const { content, files, entries } = generate(config.input, opts);
    const outputPath = resolveOutputPath(config.output, config.format);
    writeOutput(content, outputPath);
    if (outputPath) {
      process.stderr.write(`Done. ${entries.length} entries from ${files.length} file(s).\n`);
    }
  } catch (err) {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exit(1);
  }
}

main();
