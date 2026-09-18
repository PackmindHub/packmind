#!/usr/bin/env node
/**
 * Build the self-contained HTML report from the collected data.
 *
 *   node tools/comment-ratio/render.mjs [--out <dir>]
 *
 * Reads output/comment-ratio.json and output/by-model.json (produced by
 * collect.mjs and by-model.mjs) plus model-releases.json, and writes
 * output/comment-ratio.html with no external dependency.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const options = { out: path.join(here, 'output'), target: 'standalone' };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 2)
  options[argv[i].replace(/^--/, '')] = argv[i + 1];

const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const monthly = read(path.join(options.out, 'comment-ratio.json'));
const models = read(path.join(options.out, 'by-model.json'));
const releases = read(path.join(here, 'model-releases.json'));

const day = (isoDay) => Date.parse(isoDay + 'T00:00:00Z');

/** A period is plotted at its midpoint, which is where its average sits. */
const periodMid = (m) => (day(m.period) + day(m.periodEnd)) / 2;

// The charts open on this date. Before it the repository was still being
// imported and its volumes are not comparable with a normal fortnight.
const CHART_START = '2025-11-01';

// The first delta is the initial import of a codebase that already existed, so
// it is not a period of development and is kept out of the trend charts.
const flowMonths = monthly.months.filter(
  (m) => !m.seeded && m.period >= CHART_START,
);

const series = (scope, name, color) => ({
  name,
  color,
  points: flowMonths.map((m) => [periodMid(m), m.flow[scope].commentRatio]),
});

// Plotted at the boundary the snapshot stands for (the 1st of the month), not
// at the date of the last commit before it, which can be a couple of days off.
const stock = monthly.snapshots
  .filter((s) => s.totals.all.files > 0 && s.label >= CHART_START)
  .map((s) => ({
    t: Date.parse(s.label + 'T00:00:00Z'),
    label: s.label,
    totals: s.totals,
  }));

// Bounds come from the data, so no plotted point can fall outside the plot.
const MARGIN = 6 * 24 * 3600 * 1000;
const plotted = [...flowMonths.map(periodMid), ...stock.map((s) => s.t)];
const tMin = Math.min(...plotted) - MARGIN;
const tMax = Math.max(...plotted) + MARGIN;

// Only the Opus releases are drawn. An unlabelled tick for the other models
// reads as an arbitrary mark; the full list lives in the reference table.
const annotations = releases.releases
  .filter((r) => r.major)
  .map((r) => ({
    t: Date.parse(r.date + 'T00:00:00Z'),
    label: r.model.replace('Claude ', ''),
  }));

// Every bucket that carries enough lines to mean anything, including the two
// that are not a model: hiding them is how an attribution bug stays invisible.
const IS_MODEL = /^Claude (Opus|Sonnet|Haiku|Fable|Mythos) /;
const modelItems = Object.entries(models.byModel)
  .filter(([, bucket]) => bucket.addedTotal >= 1000)
  .map(([name, bucket]) => ({
    label: name
      .replace('Claude ', '')
      .replace('no Claude trailer', 'no trailer'),
    muted: !IS_MODEL.test(name),
    value: bucket.commentRatio,
    median: bucket.commitDistribution.median,
    p25: bucket.commitDistribution.p25,
    p75: bucket.commitDistribution.p75,
    commits: bucket.commits,
    added: bucket.addedTotal,
  }));
modelItems.sort((a, b) => b.value - a.value);

const fmtPct = (v, d = 1) => (v === null ? '—' : (v * 100).toFixed(d) + '%');
const fmtInt = (v) => v.toLocaleString('en-US');
const dayEn = (isoDay) =>
  new Date(isoDay + 'T00:00:00Z').toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
  });
const monthEn = (isoDay) =>
  new Date(isoDay + 'T00:00:00Z').toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  });
const periodFr = (m) =>
  `${dayEn(m.period)} → ${dayEn(m.periodEnd)} ${m.periodEnd.slice(2, 4)}`;

const opus5 = models.byModel['Claude Opus 5'];
const opus4x = [
  'Claude Opus 4.5',
  'Claude Opus 4.6',
  'Claude Opus 4.7',
  'Claude Opus 4.8',
].map((k) => models.byModel[k]);
const opus4xPooled =
  opus4x.reduce((s, b) => s + b.addedComment, 0) /
  opus4x.reduce((s, b) => s + b.addedComment + b.addedCode, 0);
const headScope = stock.at(-1).totals.all;

// The flow series has its own before/after figures. They must not be mixed
// with the per-model ones: the flow is a net diff per period, the per-model
// numbers are a sum of per-commit diffs bucketed by trailer, and the two
// measures do not produce the same multiplier.
const SHIFT = '2026-08-01';
const pooledFlow = (periods) => {
  const comment = periods.reduce((s, m) => s + m.flow.all.addedComment, 0);
  const code = periods.reduce((s, m) => s + m.flow.all.addedCode, 0);
  return comment / (comment + code);
};
const beforeShift = flowMonths
  .filter((m) => m.period < SHIFT)
  .map((m) => m.flow.all.commentRatio);
const flowBefore = pooledFlow(flowMonths.filter((m) => m.period < SHIFT));
const flowAfter = pooledFlow(flowMonths.filter((m) => m.period >= SHIFT));
const opus4xRange = opus4x.map((b) => b.commentRatio).sort((a, b) => a - b);

// The formula is shown with a real period plugged into it: the busiest one
// after the shift, so the reader can check the arithmetic against the table.
const worked = flowMonths
  .filter((m) => m.period >= SHIFT && !m.partial)
  .reduce((a, b) =>
    b.flow.all.addedComment > a.flow.all.addedComment ? b : a,
  );

// The within-developer comparison: the same person, one generation apart.
const COMPARED = ['Claude Opus 4.6', 'Claude Opus 4.7', 'Claude Opus 5'];
const personTotals = new Map();
for (const row of models.byPersonAndModel) {
  personTotals.set(
    row.person,
    (personTotals.get(row.person) ?? 0) + row.commits,
  );
}
const comparable = [...personTotals.keys()].filter((person) => {
  const rows = models.byPersonAndModel.filter(
    (r) =>
      r.person === person && COMPARED.includes(r.model) && r.addedTotal >= 1000,
  );
  return rows.some((r) => r.model === 'Claude Opus 5') && rows.length >= 2;
});
comparable.sort(
  (a, b) =>
    (models.byPersonAndModel.find(
      (r) => r.person === b && r.model === 'Claude Opus 5',
    )?.commentRatio ?? 0) -
    (models.byPersonAndModel.find(
      (r) => r.person === a && r.model === 'Claude Opus 5',
    )?.commentRatio ?? 0),
);
const authorItems = [];
for (const person of comparable) {
  for (const model of COMPARED) {
    const row = models.byPersonAndModel.find(
      (r) => r.person === person && r.model === model,
    );
    if (!row || row.addedTotal < 1000) continue;
    authorItems.push({
      label: `${person} · ${model.replace('Claude ', '')}`,
      value: row.commentRatio,
      muted: model !== 'Claude Opus 5',
      commits: row.commits,
      added: row.addedTotal,
      median: null,
    });
  }
}

const personModelTable = [...personTotals.entries()]
  .sort((a, b) => b[1] - a[1])
  .flatMap(([person, total]) =>
    models.byPersonAndModel
      .filter((r) => r.person === person)
      .sort((a, b) => b.commits - a.commits)
      .map((r) => [
        person,
        r.model
          .replace('Claude ', '')
          .replace('no Claude trailer', 'no trailer'),
        fmtInt(r.commits),
        fmtPct(r.commits / total, 0),
        fmtInt(r.addedTotal),
        fmtPct(r.commentRatio),
      ]),
  );

const payload = {
  tMin,
  tMax,
  annotations,
  headline: [series('all', 'All files', 'var(--series-1)')],
  byCategory: [
    series('ts', '.ts code', 'var(--series-1)'),
    series('tsx', '.tsx code', 'var(--series-2)'),
    series('spec', '.spec.* tests', 'var(--series-3)'),
  ],
  stockRatio: [
    {
      name: 'Stock',
      color: 'var(--series-1)',
      points: stock.map((s) => [s.t, s.totals.all.commentRatio]),
    },
  ],
  stockSize: [
    {
      name: 'Lines of code',
      color: 'var(--series-1)',
      points: stock.map((s) => [s.t, s.totals.all.code]),
    },
  ],
  modelItems,
  authorItems,
  personModelTable,
  monthTable: flowMonths.map((m) => [
    periodFr(m) + (m.partial ? ' (partial)' : ''),
    fmtInt(m.flow.all.addedCode + m.flow.all.addedComment),
    fmtPct(m.flow.all.commentRatio),
    fmtPct(m.flow.ts.commentRatio),
    fmtPct(m.flow.tsx.commentRatio),
    fmtPct(m.flow.spec.commentRatio),
    fmtPct(
      m.flow.all.removedComment /
        (m.flow.all.removedCode + m.flow.all.removedComment),
    ),
  ]),
  stockTable: stock.map((s) => [
    s.label,
    fmtInt(s.totals.all.files),
    fmtInt(s.totals.all.code),
    fmtInt(s.totals.all.comment),
    fmtPct(s.totals.all.commentRatio),
  ]),
  modelTable: modelItems.map((d) => [
    d.label,
    fmtInt(d.commits),
    fmtInt(d.added),
    fmtPct(d.value),
    fmtPct(d.median),
    fmtPct(d.p25) + ' – ' + fmtPct(d.p75),
  ]),
  releaseTable: releases.releases.map((r) => [
    r.model,
    new Date(r.date + 'T00:00:00Z').toLocaleDateString('en-GB', {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    'Anthropic release notes',
  ]),
};

const css = fs.readFileSync(path.join(here, 'page/styles.css'), 'utf8');
const runtime = fs.readFileSync(path.join(here, 'page/runtime.js'), 'utf8');
const generated = new Date(monthly.generatedAt).toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const head = `<title>Packmind comment ratio</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>${css}</style>`;

const body = `<main>

<header>
  <h1>Comment ratio in the code, fortnight by fortnight</h1>
  <p class="lede">Until August 2026 every fortnight sits between ${fmtPct(Math.min(...beforeShift))} and
  ${fmtPct(Math.max(...beforeShift))}; from August 2026 the flow moves from ${fmtPct(flowBefore)} to
  ${fmtPct(flowAfter)}, a factor of ${(flowAfter / flowBefore).toFixed(1)}. No internal instruction about comments
  changed over the period.</p>
  <p class="lede">A second measure, independent of the first — every added line attributed, commit by commit, to the
  model of the session that produced it — points at the release of Opus 5 on 24 July: the Opus 4.5 → 4.8 family sits
  between ${fmtPct(opus4xRange[0])} and ${fmtPct(opus4xRange.at(-1))}, Opus 5 is at ${fmtPct(opus5.commentRatio)}, a
  factor of ${(opus5.commentRatio / opus4xPooled).toFixed(1)}.</p>
  <p>Packmind codebase, TypeScript files (<code>.ts</code>, <code>.tsx</code> and <code>.spec.*</code> tests), from
  ${monthEn(flowMonths[0].period)} to ${monthEn(flowMonths.at(-1).periodEnd)}. The repository's first two months are
  left out: it was still being imported and its volumes are not comparable.</p>
  <p class="meta">Generated ${generated} · ${fmtInt(models.commitsScanned)} commits scanned ·
  ${fmtInt(headScope.files)} files and ${fmtInt(headScope.code)} lines of code at the last snapshot.</p>
</header>

<div class="tiles">
  <div class="tile"><span class="value">${fmtPct(opus5.commentRatio)}</span><span class="label">of the lines added by <b>Opus 5</b> are comments</span></div>
  <div class="tile"><span class="value">${fmtPct(opus4xPooled)}</span><span class="label">for the whole <b>Opus 4.5 → 4.8</b> family</span></div>
  <div class="tile"><span class="value">×${(opus5.commentRatio / opus4xPooled).toFixed(1)}</span><span class="label">between the two generations, per attributed line</span></div>
  <div class="tile"><span class="value">${fmtPct(headScope.commentRatio)}</span><span class="label">across all the code that exists today</span></div>
</div>

<span class="eyebrow">The flow</span>
<h2>1. What gets written</h2>
<p>For each fortnight — models ship mid-month, so a monthly step would not separate the weeks before a release from
the weeks after it — the net diff between the two boundaries: of the lines <em>added</em>, what share is comment. This
is the measure that reflects how code is being written. The ratio over the whole codebase moves slowly, because it is
dominated by what was written months ago.</p>

<div class="card">
  <div class="card-head">
    <h3>Comment ratio of added lines</h3>
    <p>The dashed lines mark the Opus releases. Every release, Opus or not, is listed in the reference table below.</p>
  </div>
  <div class="chart" id="c-headline"></div>
  <details><summary>See the data</summary><div id="t-headline"></div></details>
</div>

<div class="card">
  <div class="card-head">
    <h3>By file type</h3>
    <p>Backend code, the React front end and the test files all follow the same path.</p>
  </div>
  <div class="chart" id="c-category"></div>
  <div class="legend" id="l-category"></div>
  <details><summary>See the data</summary><div id="t-category"></div></details>
</div>

<span class="eyebrow">Attribution</span>
<h2>2. By model, directly</h2>
<p>Commits produced through Claude Code carry a <code>Co-Authored-By: Claude &lt;model&gt;</code> trailer, so every
added line can be attributed to the model of the session that produced it, rather than left to a correlation with the
calendar. The bar is the pooled ratio; the dot and the line are the median and the interquartile range
<em>per commit</em>, which is how you check that the result is not carried by a handful of large commits.</p>

<div class="card">
  <div class="card-head">
    <h3>Comment ratio of added lines, by model</h3>
    <p>Buckets with at least 1,000 added lines over the period.</p>
  </div>
  <div class="chart" id="c-models"></div>
  <div class="legend">
    <span><i class="swatch" style="background:var(--series-1);height:9px;border-radius:3px"></i>Pooled over all lines</span>
    <span><i class="swatch" style="background:var(--text-primary);width:9px;height:9px;border-radius:50%"></i>Median per commit</span>
    <span><i class="swatch" style="background:var(--text-primary);opacity:.55"></i>P25 – P75 per commit</span>
  </div>
  <details><summary>See the data</summary><div id="t-models"></div></details>
</div>

<span class="eyebrow">By developer</span>
<h2>3. The same developer, one generation apart</h2>
<p>Opus 5 commits are not spread evenly across the team, so a comparison between models could have been a comparison
between people. It is not one: every developer who used both generations moves the same way, by a factor of 4 to 20.
How far they move, though, varies a great deal from one person to the next.</p>

<div class="card">
  <div class="card-head">
    <h3>Comment ratio by developer and model</h3>
    <p>Developers with at least 1,000 lines added with Opus 5 and with at least one model of the previous generation.</p>
  </div>
  <div class="chart" id="c-authors"></div>
  <details><summary>See the full model breakdown per developer</summary><div id="t-authors"></div></details>
</div>

<span class="eyebrow">The stock</span>
<h2>4. The stock, for reference</h2>
<p>The size of the codebase, and the comment ratio computed over every file that exists at each snapshot.</p>

<div class="card">
  <div class="card-head"><h3>TypeScript lines of code (comments and blank lines excluded)</h3></div>
  <div class="chart" id="c-size"></div>
  <details><summary>See the data</summary><div id="t-size"></div></details>
</div>

<div class="card">
  <div class="card-head">
    <h3>Comment ratio across the whole codebase</h3>
    <p>Far more inert than the flow: a fortnight of heavily commented code moves the stock by a few tenths of a point.</p>
  </div>
  <div class="chart" id="c-stockratio"></div>
</div>

<span class="eyebrow">Reference</span>
<h2>Release dates used</h2>
<div class="card"><div id="t-releases"></div></div>

<span class="eyebrow">How it is measured</span>
<h2>Method and limits</h2>

<p>Every line of a file goes into exactly one bucket — blank, code, or comment — and the ratio is then comments over
non-blank lines:</p>

<div class="formula">
  <div class="frac-row">
    <span>comment ratio =</span>
    <span class="frac">
      <span class="num">comment lines</span>
      <span class="den">comment lines + code lines</span>
    </span>
  </div>
  <p class="note">Blank lines count <b>neither in the numerator nor in the denominator</b>. A line is a comment only
  when <b>every</b> non-whitespace character on it belongs to one: <code>const a = 1; // why</code> is therefore code.
  That is the convention <code>cloc</code> uses.</p>
</div>

<p>Two sets of lines feed into it, and that is the only difference between the report's two measures. The <b>flow</b>
takes the lines <em>added</em> during a period; the <b>stock</b> takes every line of every file at a date. Worked on
the ${periodFr(worked)} period, which you can find in the table above:</p>

<div class="formula">
  <div class="frac-row">
    <span>${fmtPct(worked.flow.all.commentRatio)} =</span>
    <span class="frac">
      <span class="num">${fmtInt(worked.flow.all.addedComment)}</span>
      <span class="den">${fmtInt(worked.flow.all.addedComment)} + ${fmtInt(worked.flow.all.addedCode)}</span>
    </span>
  </div>
</div>

<ul>
  <li>Comments are located with the official TypeScript parser rather than a regular expression, so strings, template
  literals, regex literals and JSX text containing <code>//</code> are not mistaken for comments. The JSX idiom
  <code>{'{/* ... */}'}</code> counts as a comment, on every line it spans.</li>
  <li><code>.d.ts</code> files are excluded. Renames are detected, so moving a file does not look like new code.</li>
  <li>The repository's public history starts on 5 September 2025 with an import of an already existing codebase. That
  first delta is not a period of development and is left out of the charts.</li>
  <li>The trailer records the model of the session that produced a commit, not necessarily the author of every line in
  it. Pull requests are squashed on merge, so one trailer covers one pull request.</li>
  <li>Commits from 18 September 2026 onwards are excluded (<code>--until 2026-09-18</code>): a deliberate
  comment-rewriting pass landed that day, and it would have accounted for nearly half of the final period's added
  comment lines while removing far more.</li>
  <li>A modified line reaches git as a removal plus an addition, so "added lines" includes rewrites. The ratio answers
  "when this code was written, what share was comment", not "how much net documentation was produced".</li>
  <li>Commits with no trailer (most of 2025) are of unknown attribution, not "human".</li>
</ul>

</main>
<script>${runtime}</script>
<script>
(function () {
  var D = ${JSON.stringify(payload)};
  var V = window.VIZ;
  var FLOW_COLUMNS = ['Period', 'Lines added', 'All', '.ts', '.tsx', 'Tests', 'Ratio of removed lines'];

  V.lineChart(document.getElementById('c-headline'), {
    series: D.headline, annotations: D.annotations, tMin: D.tMin, tMax: D.tMax,
    ariaLabel: "Comment ratio of added lines over time"
  });
  V.table(document.getElementById('t-headline'), FLOW_COLUMNS, D.monthTable);

  V.lineChart(document.getElementById('c-category'), {
    series: D.byCategory, annotations: D.annotations, tMin: D.tMin, tMax: D.tMax,
    ariaLabel: "Comment ratio by file type"
  });
  document.getElementById('l-category').innerHTML = D.byCategory.map(function (s) {
    return '<span><i class="swatch" style="background:' + s.color + '"></i>' + s.name + '</span>';
  }).join('');
  V.table(document.getElementById('t-category'), FLOW_COLUMNS, D.monthTable);

  V.barChart(document.getElementById('c-models'), {
    items: D.modelItems, ariaLabel: "Comment ratio by model"
  });
  V.table(document.getElementById('t-models'),
    ['Model', 'Commits', 'Lines added', 'Pooled ratio', 'Median/commit', 'P25 – P75'], D.modelTable);

  V.barChart(document.getElementById('c-authors'), {
    items: D.authorItems, ariaLabel: "Comment ratio by developer and model"
  });
  V.table(document.getElementById('t-authors'),
    ['Developer', 'Model', 'Commits', 'Share of their commits', 'Lines added', 'Comment ratio'],
    D.personModelTable);

  V.lineChart(document.getElementById('c-size'), {
    series: D.stockSize, annotations: D.annotations, tMin: D.tMin, tMax: D.tMax,
    yTick: function (v) { return V.int(Math.round(v)); },
    ariaLabel: "TypeScript lines of code over time"
  });
  V.table(document.getElementById('t-size'),
    ['Snapshot', 'Files', 'Code lines', 'Comment lines', 'Ratio'], D.stockTable);

  V.lineChart(document.getElementById('c-stockratio'), {
    series: D.stockRatio, tMin: D.tMin, tMax: D.tMax,
    ariaLabel: "Comment ratio across the whole codebase"
  });

  V.table(document.getElementById('t-releases'), ['Model', 'Release date', 'Source'], D.releaseTable);
})();
</script>`;

// Two shapes of the same page. The standalone file is a complete document that
// opens from disk; the artifact fragment leaves out the document skeleton,
// which the Artifact runtime supplies.
const html =
  options.target === 'artifact'
    ? `${head}\n${body}\n`
    : `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n` +
      `<meta name="viewport" content="width=device-width, initial-scale=1">\n` +
      `${head}\n</head>\n<body>\n${body}\n</body>\n</html>\n`;

fs.mkdirSync(options.out, { recursive: true });
const target = path.join(
  options.out,
  options.target === 'artifact'
    ? 'comment-ratio.artifact.html'
    : 'comment-ratio.html',
);
fs.writeFileSync(target, html);
process.stderr.write(
  `Wrote ${target} (${(html.length / 1024).toFixed(0)} KB)\n`,
);
