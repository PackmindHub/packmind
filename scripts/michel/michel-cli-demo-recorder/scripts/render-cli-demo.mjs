#!/usr/bin/env node
// render-cli-demo.mjs — zero-dependency CLI → terminal-styled SVG renderer.
//
// Runs a command under a real PTY (so CLIs that gate color on `isTTY` still
// emit ANSI), captures the raw colored output, parses SGR escape codes, and
// emits a static SVG that looks like a terminal window. The SVG is the master
// artifact: crisp at any zoom, tiny, exact colors, and it renders inline on
// GitHub when committed to the repo and referenced by relative path.
//
// Usage:
//   node render-cli-demo.mjs --out demo.svg [--prompt-cmd "packmind-cli standards list"] \
//        [--title "packmind-cli"] [--cwd .] [--theme dark] -- node dist/apps/cli/main.cjs <subcommand...>
//
// Everything after `--` is the command actually executed (for this repo, the
// built CLI: `node dist/apps/cli/main.cjs ...`). --prompt-cmd is the text drawn
// on the fake prompt line (defaults to the executed command); pass the friendly
// `packmind-cli ...` form so the demo reads like an installed invocation.
//
// Runs on `node render-cli-demo.mjs ...`.

import { spawnSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { hostname, userInfo, platform, tmpdir } from 'node:os';
import { basename, resolve, join } from 'node:path';

// ---------------------------------------------------------------------------
// 1. arg parsing
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const o = {
    out: null,
    textOut: null,
    promptCmd: null,
    title: null,
    cwd: process.cwd(),
    theme: 'dark',
    cmd: [],
  };
  let i = 0;
  for (; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') {
      o.cmd = argv.slice(i + 1);
      break;
    } else if (a === '--out') o.out = argv[++i];
    else if (a === '--text-out')
      o.textOut = argv[++i]; // plain-text sidecar (ANSI stripped)
    else if (a === '--prompt-cmd') o.promptCmd = argv[++i];
    else if (a === '--title') o.title = argv[++i];
    else if (a === '--cwd') o.cwd = argv[++i];
    else if (a === '--theme') o.theme = argv[++i];
    else {
      console.error(`unknown arg: ${a}`);
      process.exit(2);
    }
  }
  if (!o.out) {
    console.error('--out <file.svg> is required');
    process.exit(2);
  }
  if (o.cmd.length === 0) {
    console.error('missing command after `--`');
    process.exit(2);
  }
  return o;
}

// ---------------------------------------------------------------------------
// 2. capture command output under a PTY
//    macOS (BSD script):   script -q <file> <cmd...>
//    Linux (util-linux):   script -qec "<cmd>" /dev/null   (writes to stdout)
//    We capture stdout directly; -q suppresses the "Script started" banner.
// ---------------------------------------------------------------------------
function capture(cmd, cwd) {
  const joined = cmd.map(shellQuote).join(' ');
  const env = { ...process.env, TERM: 'xterm-256color', FORCE_COLOR: '3' };
  delete env.NO_COLOR; // NO_COLOR would suppress the very thing we want to show

  // `script` reliably writes the full PTY session (ANSI included) to its
  // typescript FILE, but NOT to a piped stdout (BSD gives an empty pipe). So
  // always capture to a temp file and read it back.
  const tsFile = join(
    tmpdir(),
    `cli-demo-${process.pid}-${Date.now()}.typescript`,
  );
  let res;
  if (platform() === 'darwin') {
    // BSD: typescript file is positional, then the command.
    res = spawnSync('script', ['-q', tsFile, '/bin/sh', '-c', joined], {
      cwd,
      env,
      stdio: ['ignore', 'ignore', 'inherit'],
    });
  } else {
    // util-linux: -c runs the command, -e returns its exit code,
    // -q quiets the banner; trailing positional is the typescript file.
    res = spawnSync('script', ['-qec', joined, tsFile], {
      cwd,
      env,
      stdio: ['ignore', 'ignore', 'inherit'],
    });
  }
  if (res.error) {
    console.error(`failed to spawn under PTY: ${res.error.message}`);
    process.exit(1);
  }
  let out = '';
  try {
    out = readFileSync(tsFile, 'utf8');
  } finally {
    try {
      rmSync(tsFile);
    } catch {}
  }
  return out;
}

function shellQuote(s) {
  return /^[A-Za-z0-9_\/.:=-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`;
}

// ---------------------------------------------------------------------------
// 3. clean PTY artifacts
// ---------------------------------------------------------------------------
function clean(raw) {
  let s = raw
    .replace(/^Script started.*\n/m, '')
    .replace(/\nScript done.*$/m, '');
  // Resolve backspaces: BSD `script` echoes "^D\b\b" (literal caret-D then two
  // backspaces) at EOF; a real terminal erases it. Each \x08 deletes the
  // preceding char. Loop until stable (bounded), then drop any leftover BS.
  for (let i = 0; i < 8 && /[^\n]\x08/.test(s); i++)
    s = s.replace(/[^\n]\x08/g, '');
  return s
    .replace(/\x08/g, '')
    .replace(/\x04/g, '') // stray EOT some PTYs emit
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '') // bare CR (cursor-to-col-0); we don't model overwrite
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '') // OSC (titles etc.)
    .replace(/\x1b[=>]/g, '') // keypad mode
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1a\x1c-\x1f]/g, '') // C0 except \t(09) \n(0a) ESC(1b)
    .replace(/\n+$/, ''); // trailing blank lines
}

// ---------------------------------------------------------------------------
// 4. ANSI SGR parser → array of lines, each an array of {text, style}
// ---------------------------------------------------------------------------
const ANSI16 = {
  30: '#2e3436',
  31: '#cc0000',
  32: '#4e9a06',
  33: '#c4a000',
  34: '#3465a4',
  35: '#75507b',
  36: '#06989a',
  37: '#d3d7cf',
  90: '#8a8a8a',
  91: '#ef2929',
  92: '#8ae234',
  93: '#fce94f',
  94: '#729fcf',
  95: '#ad7fa8',
  96: '#34e2e2',
  97: '#eeeeec',
};
function cube(n) {
  return n < 16
    ? Object.values(ANSI16)[n]
    : (() => {
        if (n < 232) {
          const x = n - 16,
            r = Math.floor(x / 36),
            g = Math.floor((x % 36) / 6),
            b = x % 6;
          const c = (v) => (v ? v * 40 + 55 : 0);
          return rgb(c(r), c(g), c(b));
        }
        const v = (n - 232) * 10 + 8;
        return rgb(v, v, v);
      })();
}
function rgb(r, g, b) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function parse(text, defaultFg) {
  const lines = [[]];
  let cur = {
    fg: null,
    bold: false,
    dim: false,
    italic: false,
    underline: false,
  };
  let buf = '';
  const flush = () => {
    if (buf) {
      lines[lines.length - 1].push({ text: buf, style: { ...cur } });
      buf = '';
    }
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\x1b' && text[i + 1] === '[') {
      flush();
      let j = i + 2,
        code = '';
      while (j < text.length && !/[A-Za-z]/.test(text[j])) code += text[j++];
      const final = text[j];
      i = j;
      if (final === 'm') applySGR(cur, code);
      continue; // non-SGR CSI already stripped in clean(); ignore any stragglers
    }
    if (ch === '\n') {
      flush();
      lines.push([]);
      continue;
    }
    if (ch === '\t') {
      buf += '        ';
      continue;
    }
    buf += ch;
  }
  flush();
  return lines;
}

function applySGR(cur, code) {
  const parts = code.split(';').map((s) => (s === '' ? 0 : parseInt(s, 10)));
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p === 0) {
      cur.fg = null;
      cur.bold = cur.dim = cur.italic = cur.underline = false;
    } else if (p === 1) cur.bold = true;
    else if (p === 2) cur.dim = true;
    else if (p === 3) cur.italic = true;
    else if (p === 4) cur.underline = true;
    else if (p === 22) cur.bold = cur.dim = false;
    else if (p === 23) cur.italic = false;
    else if (p === 24) cur.underline = false;
    else if (p === 39) cur.fg = null;
    else if ((p >= 30 && p <= 37) || (p >= 90 && p <= 97)) cur.fg = ANSI16[p];
    else if (p === 38) {
      if (parts[i + 1] === 5) {
        cur.fg = cube(parts[i + 2]);
        i += 2;
      } else if (parts[i + 1] === 2) {
        cur.fg = rgb(parts[i + 2] || 0, parts[i + 3] || 0, parts[i + 4] || 0);
        i += 4;
      }
    }
    // bg codes (40-49, 48) intentionally ignored: terminal-output demos read
    // best on a single window background; per-run bg boxes add noise.
  }
}

// ---------------------------------------------------------------------------
// 5. SVG rendering
// ---------------------------------------------------------------------------
const THEMES = {
  dark: {
    bg: '#1b1b1d',
    chrome: '#2a2a2d',
    fg: '#d6d6d6',
    title: '#9a9a9a',
    winShadow: true,
  },
  light: {
    bg: '#ffffff',
    chrome: '#e6e6e6',
    fg: '#1a1a1a',
    title: '#555555',
    winShadow: true,
  },
};

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function render(lines, opts) {
  const theme = THEMES[opts.theme] || THEMES.dark;
  const FS = 15,
    LH = 22,
    CW = 9.02; // monospace metrics @ 15px
  const padX = 22,
    padTop = 44,
    padBottom = 18; // padTop leaves room for title bar
  const maxCols = Math.max(
    1,
    ...lines.map((l) => l.reduce((n, r) => n + r.text.length, 0)),
  );
  const W = Math.ceil(padX * 2 + maxCols * CW);
  const H = Math.ceil(padTop + lines.length * LH + padBottom);
  const radius = 10;

  // One <text> per line with flowing <tspan>s (no per-run x). Whitespace is
  // preserved via xml:space, so columns align by the font's own monospace
  // advance — independent of our CW estimate, which only sizes the canvas.
  const body = lines
    .map((runs, row) => {
      const y = padTop + row * LH + FS;
      if (runs.length === 0) return '';
      const tspans = runs
        .map((r) => {
          const st = r.style;
          const fill = st.fg || theme.fg;
          const attrs = [`fill="${fill}"`];
          if (st.bold) attrs.push(`font-weight="700"`);
          if (st.italic) attrs.push(`font-style="italic"`);
          if (st.dim) attrs.push(`opacity="0.55"`);
          if (st.underline) attrs.push(`text-decoration="underline"`);
          return `<tspan ${attrs.join(' ')}>${esc(r.text)}</tspan>`;
        })
        .join('');
      return `<text x="${padX}" y="${y}" xml:space="preserve">${tspans}</text>`;
    })
    .join('\n');

  // window chrome: dark surface, rounded, title bar with traffic-light dots
  const dots = ['#ff5f56', '#ffbd2e', '#27c93f']
    .map((c, k) => `<circle cx="${20 + k * 18}" cy="22" r="6" fill="${c}"/>`)
    .join('');
  const titleText = opts.title
    ? `<text x="${W / 2}" y="27" fill="${theme.title}" font-size="12.5" text-anchor="middle" font-family="${FONT}">${esc(opts.title)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}" font-size="${FS}">
  <rect x="0" y="0" width="${W}" height="${H}" rx="${radius}" fill="${theme.bg}"/>
  <rect x="0" y="0" width="${W}" height="38" rx="${radius}" fill="${theme.chrome}"/>
  <rect x="0" y="20" width="${W}" height="18" fill="${theme.chrome}"/>
  ${dots}
  ${titleText}
  <g xml:space="preserve">
${body}
  </g>
</svg>
`;
}

const FONT =
  "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, 'DejaVu Sans Mono', Consolas, 'Liberation Mono', monospace";

// ---------------------------------------------------------------------------
// 6. main
// ---------------------------------------------------------------------------
const opts = parseArgs(process.argv.slice(2));
const cwdAbs = resolve(opts.cwd);
if (!existsSync(cwdAbs)) {
  console.error(`cwd does not exist: ${cwdAbs}`);
  process.exit(1);
}

const promptCmd = opts.promptCmd || opts.cmd.join(' ');
let user = 'user',
  host = 'host';
try {
  user = userInfo().username;
} catch {}
try {
  host = hostname().split('.')[0];
} catch {}
const promptLine = `\x1b[32m${user}@${host}\x1b[39m \x1b[34m${basename(cwdAbs)}\x1b[39m \x1b[90m%\x1b[39m \x1b[1m${promptCmd}\x1b[22m`;

const output = clean(capture(opts.cmd, cwdAbs));
const full = promptLine + '\n' + output;
const lines = parse(full, THEMES[opts.theme]?.fg);
const svg = render(lines, opts);
writeFileSync(opts.out, svg);
console.error(`wrote ${opts.out} (${lines.length} lines, ${svg.length} bytes)`);

// Plain-text sidecar: ANSI-stripped flattening of every line. Useful on hosts
// with no SVG rasterizer (verify the captured content by reading it) and as a
// copy-paste fallback for a PR's collapsed code block.
const plain = lines.map((l) => l.map((r) => r.text).join('')).join('\n') + '\n';
if (opts.textOut) writeFileSync(opts.textOut, plain);
