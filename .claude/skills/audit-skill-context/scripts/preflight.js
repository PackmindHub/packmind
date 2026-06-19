#!/usr/bin/env node
/*
 * Preflight for `audit-skill-context`. Walks the target skill folder, collects
 * inventory, classifies citations as eager vs lazy, pre-fires the mechanical
 * detectors (P4, P6, P7, P9, P11, P13, P14, P15), and computes a preliminary
 * efficiency score. The agent then validates candidates and writes the report.
 *
 * Output JSON: see SKILL.md "Phase 1 — Run the preflight" for the fields the
 * agent consumes. Pattern definitions and the score formula are canonical in
 * references/patterns.md.
 *
 * Citation forms recognized in SKILL.md (the only canonical list):
 *   references/foo.md           — relative path in prose
 *   @references/foo.md          — at-path reference
 *   `assets/template.md`        — backticked inline path
 *   path=references/foo.md      — code-fence annotation
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BINARY_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.pdf', '.zip', '.tar', '.gz',
  '.mp4', '.mp3', '.wav',
]);

const REFERENCE_REGEX = /(?:references|agents|steps|scripts|assets|inputs)\/[A-Za-z0-9_\-./]+\.(?:md|txt|json|ts|js|py|sh|html)/g;

const ROLE_BY_DIR = {
  references: 'reference',
  agents: 'agent',
  steps: 'step',
  assets: 'asset',
  scripts: 'script',
  inputs: 'input',
};

const IGNORED_FILES = new Set(['.DS_Store']);

const REDUNDANT_PHRASES = [
  /\buse when\b/gi,
  /\btriggers? on\b/gi,
  /\balso triggers?\b/gi,
  /\bshould be used\b/gi,
  /\buse this skill\b/gi,
];

const CONDITIONAL_KEYWORDS = [
  /\bif\s+\w+/i,
  /\bonly when\b/i,
  /\bbefore composing\b/i,
  /\bon demand\b/i,
  /\bif uncertain\b/i,
  /\bwhen uncertain\b/i,
  /\bto validate\b/i,
  /\bfor calibration\b/i,
  /\bsanity[- ]check\b/i,
  /\blazy[- ]?load/i,
];

const IMPERATIVE_VERB = /^(?:[*\-]\s+|\d+\.\s+)?(run|read|write|call|update|create|check|verify|walk|fetch|parse|extract|grep|edit|apply|emit|move|delete|remove|list|build|configure|install|launch|invoke|trigger|generate|compute|scan|inspect|review|analyze|audit|load|open|append|prepend|set|configure|push|pull|tag|commit|deploy)\b/i;

const TOKEN_RATIO = 4; // chars per token (approximation)

function tokenEstimate(charCount) {
  return Math.round(charCount / TOKEN_RATIO);
}

function truncateExcerpt(text, maxWords = 20) {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const words = cleaned.split(' ');
  if (words.length <= maxWords) return cleaned;
  return words.slice(0, maxWords).join(' ') + '…';
}

function walk(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_FILES.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full, base));
    } else if (entry.isFile()) {
      out.push(path.relative(base, full));
    }
  }
  return out;
}

function getRole(rel) {
  if (rel === 'SKILL.md') return 'SKILL.md';
  const first = rel.split('/')[0];
  return ROLE_BY_DIR[first] || 'other';
}

function isBinary(rel) {
  return BINARY_EXTS.has(path.extname(rel).toLowerCase());
}

function safeRead(abs) {
  try {
    return fs.readFileSync(abs, 'utf8');
  } catch {
    return '';
  }
}

function countLines(content) {
  return content.length === 0 ? 0 : content.split('\n').length;
}

function readSkillName(frontmatter) {
  const name = frontmatter.match(/^name:\s*['"]?([^'"\n]+?)['"]?\s*$/m);
  return name ? name[1].trim() : null;
}

function parseFrontmatter(skillMdContent) {
  const fm = skillMdContent.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return { block: '', endLine: 0 };
  const endLine = fm[0].split('\n').length;
  return { block: fm[1], endLine };
}

// Extract the SKILL.md `description:` field and compute the metrics P9 needs:
// word count, character count, token estimate, and a count of redundant
// trigger-clause phrases ("Use when …", "Triggers on …", etc.). Returns null
// if no description is present.
function parseDescription(frontmatterBlock) {
  if (!frontmatterBlock) return null;
  // Capture from "description:" up to the next "<key>:" line or end.
  const m = frontmatterBlock.match(/^description:\s*([\s\S]*?)(?=\n[a-zA-Z_][\w-]*:\s|$)/m);
  if (!m) return null;
  let value = m[1].trim();
  if (value.startsWith("'") && value.endsWith("'")) {
    value = value.slice(1, -1).replace(/''/g, "'");
  } else if (value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1).replace(/\\"/g, '"');
  }
  value = value.replace(/\s+/g, ' ').trim();
  if (!value) return null;
  const wordCount = value.split(/\s+/).length;
  const charCount = value.length;
  let redundantPhraseCount = 0;
  for (const re of REDUNDANT_PHRASES) {
    const matches = value.match(re);
    if (matches) redundantPhraseCount += matches.length;
  }
  return {
    text: value,
    wordCount,
    charCount,
    tokenEstimate: tokenEstimate(charCount),
    redundantPhraseCount,
  };
}

// Pair triple-backtick fences into [startLine, endLine] blocks (1-indexed).
// Used by P4 (large inline blocks) and to mask code fences out of prose-only
// detectors (P6, P11, P14).
function findFencedBlocks(lines) {
  const blocks = [];
  let openLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) {
      if (openLine === -1) openLine = i + 1;
      else {
        blocks.push({ startLine: openLine, endLine: i + 1 });
        openLine = -1;
      }
    }
  }
  return blocks;
}

// Flatten a list of fenced blocks into the set of all line numbers they cover,
// for O(1) "is this line inside a fence?" checks.
function buildFenceLineSet(blocks) {
  const set = new Set();
  for (const b of blocks) {
    for (let i = b.startLine; i <= b.endLine; i++) set.add(i);
  }
  return set;
}

// Returns true if `matchStart` falls inside a double-quoted span on `line`.
// Used to drop citations that appear in illustrative quoted prose (e.g.
// "references/foo.md is the path") rather than real instructions.
function isInDoubleQuotes(line, matchStart) {
  const before = line.slice(0, matchStart);
  let inQuote = false;
  for (let i = 0; i < before.length; i++) {
    if (before[i] === '"' && before[i - 1] !== '\\') inQuote = !inQuote;
  }
  return inQuote;
}

function findRepoRoot(start) {
  let cur = path.resolve(start);
  while (cur !== path.dirname(cur)) {
    if (fs.existsSync(path.join(cur, '.git'))) return cur;
    cur = path.dirname(cur);
  }
  return process.cwd();
}

// Heuristic: pick the script flavour the host repo already uses, so a P1/P3/P5
// "extract to a script" recommendation lands in something that matches local
// tooling. Falls back to bash when no manifest is recognized.
function inferScriptLanguage(repoRoot) {
  if (fs.existsSync(path.join(repoRoot, 'package.json'))) return 'node';
  if (
    fs.existsSync(path.join(repoRoot, 'pyproject.toml')) ||
    fs.existsSync(path.join(repoRoot, 'requirements.txt')) ||
    fs.existsSync(path.join(repoRoot, 'setup.py'))
  ) return 'python';
  return 'bash';
}

// First non-decoration line below the frontmatter that begins with an action
// verb. Drives the P15 "preamble lag" metric — how many lines the agent reads
// before reaching anything actionable.
function findFirstImperativeLine(lines, frontmatterEndLine) {
  for (let i = frontmatterEndLine; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('```')) continue;
    if (trimmed.startsWith('|')) continue;
    if (trimmed.startsWith('>')) continue;
    if (trimmed.startsWith('<!--')) continue;
    const stripped = trimmed.replace(/^\*+/, '').replace(/^_+/, '').trim();
    if (IMPERATIVE_VERB.test(stripped)) return i + 1;
  }
  return -1;
}

// Classify a citation as lazy (loaded on demand) or eager (loaded every
// trigger) by inspecting the 3 preceding lines for guard verbs like "if
// uncertain", "only when", "lazy-load", etc. Eager refs count toward the
// always-loaded footprint penalty in the score formula.
function classifyCitationUsage(lines, citationLine) {
  const start = Math.max(0, citationLine - 3);
  const ctx = lines.slice(start, citationLine).join(' ').toLowerCase();
  for (const re of CONDITIONAL_KEYWORDS) {
    if (re.test(ctx)) return 'lazy';
  }
  return 'eager';
}

function collectCitations(skillMdLines) {
  // Note: we DO accept matches inside code fences — skills cite their own
  // scripts via `node .../scripts/foo.js` blocks. Only matches inside
  // double-quoted prose are dropped (those are illustrative examples).
  const byPath = new Map();
  for (let i = 0; i < skillMdLines.length; i++) {
    const line = skillMdLines[i];
    const re = new RegExp(REFERENCE_REGEX.source, 'g');
    let m;
    while ((m = re.exec(line)) !== null) {
      if (isInDoubleQuotes(line, m.index)) continue;
      const list = byPath.get(m[0]) || [];
      list.push(i + 1);
      byPath.set(m[0], list);
    }
  }
  return byPath;
}

// P4 — large inline blocks. Flags fenced code/markdown blocks ≥40 lines in
// SKILL.md that should likely move to assets/ or references/.
function emitP4(skillMdLines, fences) {
  const out = [];
  for (const f of fences) {
    const span = f.endLine - f.startLine + 1;
    if (span < 40) continue;
    const block = skillMdLines.slice(f.startLine - 1, f.endLine).join('\n');
    out.push({
      pattern: 'P4',
      location: `SKILL.md:L${f.startLine}-L${f.endLine}`,
      span: {
        startLine: f.startLine,
        endLine: f.endLine,
        lines: span,
        chars: block.length,
        tokenEstimate: tokenEstimate(block.length),
      },
      excerpt: truncateExcerpt((skillMdLines[f.startLine] || skillMdLines[f.startLine - 1])),
      confidence: 'high',
      blockType: 'code',
    });
  }
  return out;
}

// P6 — verbose prose. Flags contiguous runs of plain prose ≥40 lines (i.e.
// no headings, list bullets, tables, blockquotes, fences, or HTML comments
// breaking the run). Long narrative blocks usually belong in references/.
function emitP6(skillMdLines, fenceLineSet) {
  const out = [];
  let runStart = -1;
  const flush = (start, end) => {
    if (start === -1) return;
    const lines = end - start + 1;
    if (lines < 40) return;
    const block = skillMdLines.slice(start - 1, end).join('\n');
    out.push({
      pattern: 'P6',
      location: `SKILL.md:L${start}-L${end}`,
      span: {
        startLine: start,
        endLine: end,
        lines,
        chars: block.length,
        tokenEstimate: tokenEstimate(block.length),
      },
      excerpt: truncateExcerpt(skillMdLines[start - 1]),
      confidence: 'medium',
      blockType: 'prose',
    });
  };
  for (let i = 0; i < skillMdLines.length; i++) {
    const line = skillMdLines[i];
    const lineNum = i + 1;
    const trimmed = line.trim();
    const isProse =
      trimmed.length > 0 &&
      !fenceLineSet.has(lineNum) &&
      !/^#+\s/.test(trimmed) &&
      !/^[-*]\s/.test(trimmed) &&
      !/^\d+\.\s/.test(trimmed) &&
      !/^\|/.test(trimmed) &&
      !/^>/.test(trimmed) &&
      !/^<!--/.test(trimmed);
    if (isProse) {
      if (runStart === -1) runStart = lineNum;
    } else {
      flush(runStart, lineNum - 1);
      runStart = -1;
    }
  }
  flush(runStart, skillMdLines.length);
  return out;
}

// P7 + P13 — duplication detection via 5-line shingle hashing.
// A shingle is a normalized rolling window of 5 consecutive lines; if the
// same hash appears ≥3 times across the corpus, the content is repeated.
// Single-file repeats fire P7 (boilerplate); cross-file repeats fire P13
// (cross-file duplication). Each pattern is capped at 20 candidates so the
// agent does not drown in incidental matches.
function emitP7AndP13(fileContents, fenceLineSetByFile, inventory) {
  // Limit detection to files that actually drive eager-load token cost:
  // markdown / text content in roles the agent loads (SKILL.md, references,
  // assets, steps, inputs). Skip agents, scripts, source code, binaries.
  const LOADED_ROLES = new Set(['SKILL.md', 'reference', 'asset', 'step', 'input']);
  const SHINGLE_EXTS = new Set(['.md', '.txt']);
  const inScope = new Set(
    inventory
      .filter((i) => LOADED_ROLES.has(i.role) && SHINGLE_EXTS.has(path.extname(i.path).toLowerCase()))
      .map((i) => i.path)
  );

  const out = [];
  const shingles = new Map(); // hash -> [{file, startLine}]
  const WINDOW = 5;
  for (const [file, content] of Object.entries(fileContents)) {
    if (!inScope.has(file)) continue;
    const fenceSet = fenceLineSetByFile[file] || new Set();
    const rawLines = content.split('\n');
    const norm = rawLines.map((l) => l.trim().toLowerCase().replace(/\s+/g, ' '));
    for (let i = 0; i + WINDOW <= norm.length; i++) {
      let fenceCount = 0;
      for (let k = 0; k < WINDOW; k++) if (fenceSet.has(i + k + 1)) fenceCount++;
      if (fenceCount > 2) continue;
      const window = norm.slice(i, i + WINDOW).join('\n');
      if (window.replace(/\s/g, '').length < 40) continue;
      const h = crypto.createHash('sha1').update(window).digest('hex');
      if (!shingles.has(h)) shingles.set(h, []);
      shingles.get(h).push({ file, startLine: i + 1 });
    }
  }

  // De-duplicate overlapping shingles within a single file: if two shingle
  // occurrences in the same file are <WINDOW lines apart, drop the later one
  // (it's the sliding-window neighbour, not a real second occurrence).
  for (const [h, occs] of shingles.entries()) {
    occs.sort((a, b) => (a.file === b.file ? a.startLine - b.startLine : a.file < b.file ? -1 : 1));
    const filtered = [];
    let lastByFile = new Map();
    for (const o of occs) {
      const last = lastByFile.get(o.file);
      if (last !== undefined && o.startLine - last < WINDOW) continue;
      filtered.push(o);
      lastByFile.set(o.file, o.startLine);
    }
    shingles.set(h, filtered);
  }

  for (const [h, occs] of shingles.entries()) {
    if (occs.length < 3) continue;
    const distinctFiles = new Set(occs.map((o) => o.file));
    const isCrossFile = distinctFiles.size >= 2;
    const pattern = isCrossFile ? 'P13' : 'P7';
    const first = occs[0];
    const sourceLines = fileContents[first.file].split('\n');
    const block = sourceLines.slice(first.startLine - 1, first.startLine + WINDOW - 1).join('\n');
    out.push({
      pattern,
      location: `${first.file}:L${first.startLine}-L${first.startLine + WINDOW - 1}`,
      span: {
        startLine: first.startLine,
        endLine: first.startLine + WINDOW - 1,
        lines: WINDOW,
        chars: block.length,
        tokenEstimate: tokenEstimate(block.length),
      },
      excerpt: truncateExcerpt(sourceLines[first.startLine - 1]),
      confidence: occs.length >= 4 ? 'high' : 'medium',
      occurrences: occs,
    });
  }
  // Cap each pattern at 20 candidates to avoid context flood.
  const cap = (pat) =>
    out
      .filter((c) => c.pattern === pat)
      .sort((a, b) => b.occurrences.length - a.occurrences.length)
      .slice(0, 20);
  return [...cap('P7'), ...cap('P13')];
}

// P9 — bloated description. Word-count thresholds align with patterns.md:
// HIGH > 150, MEDIUM 100–150, LOW 80–100 (only when redundant phrasing
// appears ≥3 times). Description bloat hits every Claude Code session
// globally, so this is one of the highest-leverage findings.
function emitP9(descriptionMeta) {
  if (!descriptionMeta) return [];
  const wc = descriptionMeta.wordCount;
  if (wc <= 80) return [];
  // Thresholds aligned with references/patterns.md:
  //   HIGH > 150, MEDIUM 100–150, LOW 80–100 (with redundant-phrase signal)
  let suggestedPriority;
  if (wc > 150) suggestedPriority = 'HIGH';
  else if (wc > 100) suggestedPriority = 'MEDIUM';
  else suggestedPriority = descriptionMeta.redundantPhraseCount >= 3 ? 'LOW' : null;
  if (!suggestedPriority) return [];
  return [{
    pattern: 'P9',
    location: 'SKILL.md:frontmatter',
    span: {
      startLine: 1,
      endLine: 1,
      lines: 1,
      chars: descriptionMeta.charCount,
      tokenEstimate: descriptionMeta.tokenEstimate,
    },
    excerpt: truncateExcerpt(descriptionMeta.text),
    confidence: 'high',
    wordCount: wc,
    redundantPhraseCount: descriptionMeta.redundantPhraseCount,
    suggestedPriority,
  }];
}

// P11 — verbose tool-invocation prose. Flags lines that ceremonially name
// the tool the agent should call ("Use the Read tool to open …", "with
// parameter cmd=…"). The harness already describes tools to the agent, so
// this prose adds tokens with no behavioral effect.
function emitP11(skillMdLines, fenceLineSet) {
  const out = [];
  const re1 = /(Use|Invoke|Call)\s+(the\s+)?\w+\s+tool\b/i;
  const re2 = /with\s+parameter\s+\w+\s*=/i;
  for (let i = 0; i < skillMdLines.length; i++) {
    if (fenceLineSet.has(i + 1)) continue;
    const line = skillMdLines[i];
    const m = line.match(re1) || line.match(re2);
    if (!m) continue;
    out.push({
      pattern: 'P11',
      location: `SKILL.md:L${i + 1}`,
      span: {
        startLine: i + 1,
        endLine: i + 1,
        lines: 1,
        chars: line.length,
        tokenEstimate: tokenEstimate(line.length),
      },
      excerpt: truncateExcerpt(line),
      confidence: 'medium',
      phrase: m[0],
    });
  }
  return out;
}

// P14 — eager-load anti-pattern. Flags lines that instruct the agent to fan
// over references unconditionally ("read every reference", "load all files",
// "before phase N read…"). Such instructions defeat progressive disclosure.
function emitP14(skillMdLines, fenceLineSet) {
  const out = [];
  const patterns = [
    /\bread\s+(?:all|every|each)\s+.*?(reference|file|step|phase|artifact|section|path|citation|item|entry)/i,
    /\bload\s+(?:all|every|each)\b/i,
    /\bbefore\s+phase\s+\d/i,
    /\bread\s+each\s+\w+(?:\s+\w+){0,3}\s+(?:and|then)/i,
    /\bbatch\s+reads?\b/i,
  ];
  for (let i = 0; i < skillMdLines.length; i++) {
    if (fenceLineSet.has(i + 1)) continue;
    const line = skillMdLines[i];
    for (const re of patterns) {
      if (re.test(line)) {
        out.push({
          pattern: 'P14',
          location: `SKILL.md:L${i + 1}`,
          span: {
            startLine: i + 1,
            endLine: i + 1,
            lines: 1,
            chars: line.length,
            tokenEstimate: tokenEstimate(line.length),
          },
          excerpt: truncateExcerpt(line),
          confidence: 'medium',
        });
        break;
      }
    }
  }
  return out;
}

// P15 — preamble lag. Emits a single candidate when more than 25 lines of
// SKILL.md sit between the frontmatter and the first imperative verb.
// Long preambles delay the agent reaching anything actionable.
function emitP15(skillMdMetrics) {
  if (!skillMdMetrics || skillMdMetrics.preambleLines <= 25) return [];
  return [{
    pattern: 'P15',
    location: `SKILL.md:L${skillMdMetrics.frontmatterEndLine + 1}-L${skillMdMetrics.firstImperativeLine - 1}`,
    span: {
      startLine: skillMdMetrics.frontmatterEndLine + 1,
      endLine: Math.max(skillMdMetrics.frontmatterEndLine + 1, skillMdMetrics.firstImperativeLine - 1),
      lines: skillMdMetrics.preambleLines,
      chars: skillMdMetrics.preambleLines * 60, // rough heuristic, agent re-checks
      tokenEstimate: tokenEstimate(skillMdMetrics.preambleLines * 60),
    },
    excerpt: `${skillMdMetrics.preambleLines} lines of context before first imperative`,
    confidence: 'high',
    preambleLines: skillMdMetrics.preambleLines,
  }];
}

// Heuristic: guess how often a skill fires based on description verbs.
// Rare-trigger skills (releases, scaffolding, onboarding) deserve more
// tolerance for inline content — the per-trigger cost amortizes over months.
function inferFrequency(descriptionMeta) {
  if (!descriptionMeta) return { tier: 'regular', multiplier: 1.0, reason: 'no description' };
  const text = descriptionMeta.text.toLowerCase();
  const RARE = /\b(release|publish|deploy|scaffold|onboard|bootstrap|create a new|create the|set up|migrate|new package|new skill)\b/;
  const PERIODIC = /\b(audit|review|report|digest|inventory|weekly|monthly|periodic|cadence)\b/;
  if (RARE.test(text)) return { tier: 'rare', multiplier: 0.5, reason: 'description suggests one-off / per-release usage' };
  if (PERIODIC.test(text)) return { tier: 'periodic', multiplier: 0.75, reason: 'description suggests periodic (weekly/monthly) usage' };
  return { tier: 'regular', multiplier: 1.0, reason: 'description suggests regular / per-task usage' };
}

// Compute a 1–10 preliminary efficiency score. The full formula (penalty
// brackets, frequency multipliers, final adjustment for validated findings)
// is canonical in references/patterns.md → "Score formula appendix" — keep
// any rule changes there to avoid drift.
function computeEfficiencyScore(skillMdMetrics, descriptionMeta, loadedFootprint) {
  let score = 10;
  const breakdown = {};
  const frequency = inferFrequency(descriptionMeta);

  // Headline: how many tokens load eagerly per trigger (SKILL.md + description + eager refs).
  // Brackets are deliberately tolerant — a rare-trigger skill with 8k of
  // inline templates still scores reasonably.
  const eager = loadedFootprint.eagerTotal;
  let rawPenalty = 0;
  if (eager > 25000) rawPenalty = 4;
  else if (eager > 15000) rawPenalty = 3;
  else if (eager > 8000) rawPenalty = 2;
  else if (eager > 4000) rawPenalty = 1;
  else if (eager > 2000) rawPenalty = 0.5;
  const eagerPenalty = rawPenalty * frequency.multiplier;
  if (eagerPenalty) {
    score -= eagerPenalty;
    breakdown.eagerFootprint = -Number(eagerPenalty.toFixed(2));
    breakdown.eagerFootprintRaw = -rawPenalty;
    breakdown.frequencyMultiplier = frequency.multiplier;
  }

  // Description is loaded globally per session — penalize on top, but only
  // for genuinely bloated descriptions (>100 words).
  if (descriptionMeta && descriptionMeta.wordCount > 150) {
    score -= 1;
    breakdown.descriptionBloat = -1;
  } else if (descriptionMeta && descriptionMeta.wordCount > 100) {
    score -= 0.5;
    breakdown.descriptionBloat = -0.5;
  }

  if (skillMdMetrics.preambleLines > 30) {
    score -= 0.5;
    breakdown.preambleLag = -0.5;
  }

  return {
    preliminary: Math.max(1, Math.round(score)),
    raw: Number(score.toFixed(2)),
    breakdown,
    frequency,
    note:
      'Frequency multiplier is heuristic — override it in Phase 4 if the ' +
      'actual usage cadence differs (e.g. a "create" skill that fires every ' +
      'commit). Apply the final adjustment per references/patterns.md → ' +
      '"Score formula appendix".',
  };
}

// Orchestrator: parse argv, walk the skill folder, build inventory and
// citation graph, run every detector, then print the assembled JSON to
// stdout for the agent to consume.
function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: preflight.js <skill-folder-path>');
    process.exit(2);
  }

  const skillPath = path.resolve(arg);
  const skillMdPath = path.join(skillPath, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) {
    console.error(`No SKILL.md at ${skillMdPath} — not a skill folder.`);
    process.exit(2);
  }

  const skillMdContent = fs.readFileSync(skillMdPath, 'utf8');
  const skillMdLines = skillMdContent.split('\n');
  const fences = findFencedBlocks(skillMdLines);
  const fenceLineSet = buildFenceLineSet(fences);

  const fm = parseFrontmatter(skillMdContent);
  const skillName = readSkillName(fm.block) || path.basename(skillPath);
  const descriptionMeta = parseDescription(fm.block);

  const allFiles = walk(skillPath).sort();
  const inventory = allFiles.map((rel) => {
    const abs = path.join(skillPath, rel);
    const binary = isBinary(rel);
    const content = binary ? '' : safeRead(abs);
    return {
      path: rel,
      lines: binary ? 0 : countLines(content),
      chars: binary ? 0 : content.length,
      tokenEstimate: binary ? 0 : tokenEstimate(content.length),
      role: getRole(rel),
      binary,
    };
  });

  // Build a contents map for shingle/duplication detection.
  const fileContents = {};
  const fenceLineSetByFile = {};
  for (const item of inventory) {
    if (item.binary) continue;
    const abs = path.join(skillPath, item.path);
    const content = safeRead(abs);
    fileContents[item.path] = content;
    if (item.path === 'SKILL.md') {
      fenceLineSetByFile[item.path] = fenceLineSet;
    } else {
      fenceLineSetByFile[item.path] = buildFenceLineSet(findFencedBlocks(content.split('\n')));
    }
  }

  // Citation collection (drops only matches inside double-quoted prose).
  const citationsByPath = collectCitations(skillMdLines);
  const referenced = [...citationsByPath.keys()].sort();
  const citations = referenced.map((p) => {
    const lines = citationsByPath.get(p);
    const usages = lines.map((ln) => classifyCitationUsage(skillMdLines, ln));
    const usage = usages.includes('eager') ? 'eager' : 'lazy';
    return { path: p, lines, usage };
  });

  const onDisk = new Set(allFiles);
  const broken = citations.filter((c) => !onDisk.has(c.path));
  const unreferenced = allFiles.filter((rel) => rel !== 'SKILL.md' && !citationsByPath.has(rel));

  const filesToRead = inventory
    .filter((item) => item.path !== 'SKILL.md' && !item.binary)
    .map((item) => item.path);

  const repoRoot = findRepoRoot(skillPath);
  const inferredScriptLanguage = inferScriptLanguage(repoRoot);
  const fileCount = inventory.filter((i) => !i.binary).length;

  // Skill.md metrics.
  const firstImperativeLine = findFirstImperativeLine(skillMdLines, fm.endLine);
  const skillMdInventory = inventory.find((i) => i.path === 'SKILL.md');
  const skillMdMetrics = {
    lines: skillMdInventory ? skillMdInventory.lines : 0,
    chars: skillMdInventory ? skillMdInventory.chars : 0,
    tokenEstimate: skillMdInventory ? skillMdInventory.tokenEstimate : 0,
    frontmatterEndLine: fm.endLine,
    firstImperativeLine,
    preambleLines: firstImperativeLine > 0 ? Math.max(0, firstImperativeLine - fm.endLine - 1) : 0,
  };

  // Reference usage rollup.
  const referenceUsage = citations.reduce(
    (acc, c) => {
      if (onDisk.has(c.path)) acc[c.usage]++;
      return acc;
    },
    { eager: 0, lazy: 0 }
  );

  // Always-loaded footprint.
  // Scripts and agent prompts are invoked, not loaded — exclude their source
  // size from eager/lazy ref totals. The agent only sees their stdout (script)
  // or their summary (agent), not the file contents.
  const isLoadable = (p) => {
    const role = getRole(p);
    return role !== 'script' && role !== 'agent';
  };
  const eagerRefPaths = citations
    .filter((c) => c.usage === 'eager' && onDisk.has(c.path) && isLoadable(c.path))
    .map((c) => c.path);
  const lazyRefPaths = citations
    .filter((c) => c.usage === 'lazy' && onDisk.has(c.path) && isLoadable(c.path))
    .map((c) => c.path);
  const sumRefs = (paths) =>
    paths.reduce(
      (acc, p) => {
        const item = inventory.find((i) => i.path === p);
        if (!item) return acc;
        acc.lines += item.lines;
        acc.chars += item.chars;
        acc.tokens += item.tokenEstimate;
        return acc;
      },
      { lines: 0, chars: 0, tokens: 0 }
    );
  const eagerSum = sumRefs(eagerRefPaths);
  const lazySum = sumRefs(lazyRefPaths);
  const loadedFootprint = {
    skillMdLines: skillMdMetrics.lines,
    skillMdTokens: skillMdMetrics.tokenEstimate,
    descriptionTokens: descriptionMeta ? descriptionMeta.tokenEstimate : 0,
    eagerRefLines: eagerSum.lines,
    eagerRefTokens: eagerSum.tokens,
    lazyRefLines: lazySum.lines,
    lazyRefTokens: lazySum.tokens,
    eagerTotal: skillMdMetrics.tokenEstimate + (descriptionMeta ? descriptionMeta.tokenEstimate : 0) + eagerSum.tokens,
    lazyTotal: lazySum.tokens,
  };

  // Candidate findings.
  const candidates = [
    ...emitP4(skillMdLines, fences),
    ...emitP6(skillMdLines, fenceLineSet),
    ...emitP7AndP13(fileContents, fenceLineSetByFile, inventory),
    ...emitP9(descriptionMeta),
    ...emitP11(skillMdLines, fenceLineSet),
    ...emitP14(skillMdLines, fenceLineSet),
    ...emitP15(skillMdMetrics),
  ];

  const efficiencyScore = computeEfficiencyScore(skillMdMetrics, descriptionMeta, loadedFootprint);

  const result = {
    skillName,
    skillPath: path.relative(repoRoot, skillPath) + '/',
    inferredScriptLanguage,
    fileCount,
    inventory,
    description: descriptionMeta,
    skillMdMetrics,
    citations,
    referenceUsage,
    unreferenced,
    broken,
    filesToRead,
    loadedFootprint,
    candidates,
    efficiencyScore,
  };

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

main();
