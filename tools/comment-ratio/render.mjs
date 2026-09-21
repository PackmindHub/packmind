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
const daily = read(path.join(options.out, 'daily.json'));

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

// Only the buckets that name a model are plotted. The rest — no trailer, no
// version recorded, several models named — are real data but answer nothing
// about a model, so they stay in the table rather than on the chart.
const IS_MODEL = /^Claude (Opus|Sonnet|Haiku|Fable|Mythos) /;
const modelBuckets = Object.entries(models.byModel)
  .filter(([name, bucket]) => IS_MODEL.test(name) && bucket.addedTotal >= 1000)
  .sort((a, b) => b[1].commentRatio - a[1].commentRatio);

// One bar, one number. The per-commit median and spread used to be drawn over
// the bars and could not be read; they live in the table below the chart.
const modelItems = modelBuckets.map(([name, bucket]) => ({
  label: name.replace('Claude ', ''),
  value: bucket.commentRatio,
  commits: bucket.commits,
  added: bucket.addedTotal,
}));

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

// The Opus line, oldest first. Both the daily window and the per-developer
// comparison walk it.
const OPUS_ORDER = [
  'Claude Opus 4.5',
  'Claude Opus 4.6',
  'Claude Opus 4.7',
  'Claude Opus 4.8',
  'Claude Opus 5',
];

// The daily window around the Opus 5 release. Only the Opus models are
// plotted: the window also holds Fable 5, Sonnet 5 and days with no version
// recorded, and mixing them in answers a different question than "what did the
// Opus line do when Opus 5 landed".
//
// Colour goes to the three most recent Opus models the window actually holds,
// newest first, because three is what the palette separates safely. Anything
// older folds into one muted class rather than inventing a fourth hue.
const OPUS_BY_AGE = [...OPUS_ORDER].reverse();
const DAILY_SLOTS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'];

const presentOpus = OPUS_BY_AGE.filter((model) =>
  daily.days.some((d) => d.model === model),
);
const dailyColour = new Map(
  presentOpus
    .slice(0, DAILY_SLOTS.length)
    .map((model, i) => [model, DAILY_SLOTS[i]]),
);
const dailyLabel = (model) =>
  dailyColour.has(model) ? model.replace('Claude ', '') : 'Earlier Opus';
const colourFor = (model) => dailyColour.get(model) ?? 'var(--text-muted)';

const dailyDays = daily.days.filter((d) => presentOpus.includes(d.model));
const dailyPoints = dailyDays.map((d) => ({
  t: day(d.date),
  ratio: d.commentRatio,
  added: d.added,
  label: dayEn(d.date) + ' ' + d.date.slice(2, 4),
  model: dailyLabel(d.model),
  color: colourFor(d.model),
}));
const dailyLegend = [...new Set(dailyPoints.map((p) => p.model))].map(
  (model) => ({
    model,
    color: dailyPoints.find((p) => p.model === model).color,
  }),
);

// Days too small to mean anything at this resolution are left out of the
// figures quoted in the prose, on both sides of the release.
const DAILY_FLOOR = 300;
const releaseDay = daily.around;
const sized = dailyDays.filter((d) => d.added >= DAILY_FLOOR);
const before = sized.filter((d) => d.date < releaseDay);
const after = sized.filter((d) => d.date > releaseDay);
const median = (rows) => {
  const values = rows.map((d) => d.commentRatio).sort((a, b) => a - b);
  const mid = (values.length - 1) / 2;
  return (values[Math.floor(mid)] + values[Math.ceil(mid)]) / 2;
};
// The wider window shows the rise continuing rather than settling, so the two
// halves of the post-release stretch are quoted separately.
const afterHalf = (early) => {
  const days = after.map((d) => d.date).sort();
  const cut = days[Math.floor(days.length / 2)];
  return after.filter((d) => (early ? d.date < cut : d.date >= cut));
};

const highest = (rows) =>
  rows.reduce((a, b) => (b.commentRatio > a.commentRatio ? b : a));
const lowest = (rows) =>
  rows.reduce((a, b) => (b.commentRatio < a.commentRatio ? b : a));

const dailyTable = dailyDays.map((d) => [
  dayEn(d.date) + ' ' + d.date.slice(2, 4),
  fmtInt(d.commits),
  fmtInt(d.added),
  fmtPct(d.commentRatio),
  dailyLabel(d.model),
]);

// The within-developer comparison: the same person, across every Opus model
// they used. Picking a subset of the models would hide a developer's own
// history — an earlier version of this chart showed 4.6, 4.7 and 5 only, and
// every developer's Opus 4.5 and 4.8 work disappeared from it.
const MIN_LINES = 1000;
const rowFor = (person, model) =>
  models.byPersonAndModel.find(
    (r) =>
      r.person === person && r.model === model && r.addedTotal >= MIN_LINES,
  );

const personTotals = new Map();
for (const row of models.byPersonAndModel) {
  personTotals.set(
    row.person,
    (personTotals.get(row.person) ?? 0) + row.commits,
  );
}

// A developer is comparable when they have enough Opus 5 work and enough work
// on at least one earlier Opus to put beside it.
const comparisons = [...personTotals.keys()]
  .map((person) => {
    const opus5 = rowFor(person, 'Claude Opus 5');
    const earlier = OPUS_ORDER.slice(0, -1)
      .map((model) => rowFor(person, model))
      .filter(Boolean);
    if (!opus5 || earlier.length === 0) return null;
    // Compared against their own highest earlier figure, which is the
    // hardest bar and the one that cannot flatter the result.
    const best = earlier.reduce((a, b) =>
      b.commentRatio > a.commentRatio ? b : a,
    );
    return {
      person,
      opus5,
      earlier,
      best,
      factor: opus5.commentRatio / best.commentRatio,
    };
  })
  .filter(Boolean)
  .sort((a, b) => b.opus5.commentRatio - a.opus5.commentRatio);

// A developer whose Opus 5 figure does not clearly clear their own earlier
// best is named rather than averaged away.
const LEVEL = 1.1;
const rises = comparisons.filter((c) => c.factor >= LEVEL);
const level = comparisons.filter((c) => c.factor < LEVEL);
const factors = rises.map((c) => c.factor).sort((a, b) => a - b);

const authorItems = comparisons.flatMap((c) =>
  OPUS_ORDER.map((model) => {
    const row = rowFor(c.person, model);
    if (!row) return null;
    return {
      label: `${c.person} · ${model.replace('Claude ', '')}`,
      value: row.commentRatio,
      muted: model !== 'Claude Opus 5',
      commits: row.commits,
      added: row.addedTotal,
      median: null,
    };
  }).filter(Boolean),
);

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

// Every point names the span it covers, so the tooltip can be exact where the
// axis only carries a monthly scale.
const flowLabels = flowMonths.map(
  (m) => periodFr(m) + (m.partial ? ' (partial)' : ''),
);
const stockLabels = stock.map((s) =>
  new Date(s.label + 'T00:00:00Z').toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }),
);

// The percentage alone invites two misreadings — a change since the previous
// point, or a share of the whole codebase. The counts behind it prevent both.
const flowNotes = flowMonths.map((m) => {
  const a = m.flow.all;
  const total = a.addedCode + a.addedComment;
  return `${fmtInt(a.addedComment)} comment lines out of ${fmtInt(total)} added`;
});

// One point, spelled out in full, saves the reader from reverse-engineering the
// definition from the axis. The last complete fortnight is the least arbitrary
// choice and the closest to what a reader hovers first.
const sample = flowMonths.filter((m) => !m.partial).at(-1);
const sampleFlow = sample.flow.all;
const sampleTotal = sampleFlow.addedCode + sampleFlow.addedComment;
const sampleStock = stock.find((s) => s.label === sample.periodEnd);

const payload = {
  tMin,
  tMax,
  annotations,
  flowLabels,
  flowNotes,
  stockLabels,
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
  daily: {
    points: dailyPoints,
    legend: dailyLegend,
    table: dailyTable,
    tMin: day(daily.from) - 12 * 3600 * 1000,
    tMax: day(daily.to) + 12 * 3600 * 1000,
    release: day(daily.around),
  },
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
  modelTable: Object.entries(models.byModel)
    .filter(([, bucket]) => bucket.addedTotal >= 1000)
    .sort((a, b) => b[1].commentRatio - a[1].commentRatio)
    .map(([name, bucket]) => [
      name.replace('Claude ', '').replace('no Claude trailer', 'no trailer'),
      fmtInt(bucket.commits),
      fmtInt(bucket.addedTotal),
      fmtPct(bucket.commentRatio),
      fmtPct(bucket.commitDistribution.median),
      fmtPct(bucket.commitDistribution.p25) +
        ' – ' +
        fmtPct(bucket.commitDistribution.p75),
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
<p>This section asks one question, fortnight by fortnight: <b>of the TypeScript written during that fortnight, what
share of it is comment?</b> Fortnights rather than months, because models ship mid-month and a monthly step would
blur the weeks before a release into the weeks after it. Measuring what gets <em>written</em>, rather than what
exists, is what makes the series responsive — the ratio over the whole codebase is dominated by code from months ago
and barely moves.</p>

<div class="card">
  <div class="card-head">
    <h3>Share of newly written lines that are comments</h3>
    <p class="readout"><b>One point, spelled out.</b> Between ${dayEn(sample.period)} and
    ${dayEn(sample.periodEnd)} ${sample.periodEnd.slice(0, 4)}, <b>${fmtInt(sampleTotal)} lines</b> of TypeScript were
    added to the repository. <b>${fmtInt(sampleFlow.addedComment)}</b> of them were comment lines. The point therefore
    sits at ${fmtInt(sampleFlow.addedComment)} ÷ ${fmtInt(sampleTotal)} =
    <b>${fmtPct(sampleFlow.commentRatio)}</b>. Hover any point to see its own two numbers.</p>
    <ul class="caveats">
      <li>It is <b>not</b> a change against the previous point. Each fortnight is measured on its own; two
      neighbouring points are two independent measurements, not a before and an after.</li>
      <li>It is <b>not</b> the share of the whole codebase. That figure moves far more slowly &mdash; it was
      ${fmtPct(sampleStock.totals.all.commentRatio)} on ${dayEn(sample.periodEnd)}, and it has its own chart in
      section&nbsp;4.</li>
    </ul>
    <p>The dashed lines mark the Opus releases; every release is listed in the reference table below.</p>
  </div>
  <div class="chart" id="c-headline"></div>
  <details><summary>See the data</summary><div id="t-headline"></div></details>
  <details><summary>How a period is measured</summary>
    <p class="note">Blank lines are ignored on both sides of the division. Each point is a single
    <code>git diff</code> between the last commit before the period opens and the last commit before it closes, not a
    sum over the period's commits: a line written on the 3rd and rewritten on the 9th of the same fortnight counts
    once, in its final form, and a line added then removed inside the period does not count at all. On this repository
    the net and the per-commit sum differ by 5 to 37% in volume but by less than half a point in ratio, because churn
    lands on comment and code lines alike.</p>
  </details>
</div>

<div class="card">
  <div class="card-head">
    <h3>By file type</h3>
    <p>The same measure, split by file type: backend code, the React front end and the test files all follow the
    same path.</p>
  </div>
  <div class="chart" id="c-category"></div>
  <div class="legend" id="l-category"></div>
  <details><summary>See the data</summary><div id="t-category"></div></details>
</div>

<div class="card">
  <div class="card-head">
    <h3>Day by day, ${fmtInt(Math.round((day(daily.to) - day(daily.around)) / 86400000) - 1)} days either side of the Opus 5 release</h3>
    <p>One dot per day, for days whose TypeScript came mostly from an Opus model.</p>
    <ul class="keys">
      <li><b>Height</b> — the same ratio as above, over one day instead of a fortnight.</li>
      <li><b>Size</b> — how many lines that day added.</li>
      <li><b>Colour</b> — which Opus model wrote most of them.</li>
    </ul>
    <p>No connecting line: the days are not evenly spaced.</p>
  </div>
  <div class="chart" id="c-daily"></div>
  <div class="legend" id="l-daily"></div>
  <details><summary>See the data</summary><div id="t-daily"></div></details>
</div>

<p>The fortnightly series cannot separate the week before a release from the week after it. Day by day, the switch and
the change land together. Counting only days that carry more than ${fmtInt(DAILY_FLOOR)} lines, the median
Opus day before the release is at ${fmtPct(median(before))} and the median after it at ${fmtPct(median(after))}. The
two sets do overlap at their edges — ${dayEn(highest(before).date)} reaches ${fmtPct(highest(before).commentRatio)} on
the old model and ${dayEn(lowest(after).date)} sits at ${fmtPct(lowest(after).commentRatio)} on the new one — so no
single day proves anything; it is the bulk that moves. And it keeps moving: over the first half of the post-release
stretch the median Opus 5 day is at ${fmtPct(median(afterHalf(true)))}, over the second half
${fmtPct(median(afterHalf(false)))}. Whatever changed did not settle on the day the model shipped. Opus 5 shipped on a Friday, so its first working days
are the Monday and Tuesday that follow — and the two instruction changes that might otherwise explain the move landed
on the Wednesday and Thursday after that, once the rise had already started.</p>

<span class="eyebrow">Attribution</span>
<h2>2. By model, directly</h2>
<p>Commits produced through Claude Code carry a <code>Co-Authored-By: Claude &lt;model&gt;</code> trailer, so every
added line can be attributed to the model of the session that produced it, rather than left to a correlation with the
calendar. Each bar pools all of a model's added lines. Whether that pooled figure is carried by a few large commits
is checked in the table: for Opus 5 the median commit sits at ${fmtPct(models.byModel['Claude Opus 5'].commitDistribution.median)},
next to a pooled ${fmtPct(opus5.commentRatio)}, so the whole distribution has moved rather than its tail.</p>

<div class="card">
  <div class="card-head">
    <h3>Comment ratio of added lines, by model &mdash; summed over commits</h3>
    <p>This one has to sum each commit's own diff rather than take a net diff, because only a commit carries the
    trailer that names its model. Each bar pools every line the model added, over models with at least 1,000 of them. The median commit and the
    spread between them are in the table, along with the buckets that name no model.</p>
  </div>
  <div class="chart" id="c-models"></div>
  <details><summary>See the data, including the unattributed buckets</summary><div id="t-models"></div></details>
</div>

<span class="eyebrow">By developer</span>
<h2>3. The same developer, one generation apart</h2>
<p>Opus 5 commits are not spread evenly across the team, so a comparison between models could have been a comparison
between people. It mostly is not one. Each developer is shown against <em>every</em> Opus model they used, and for
${rises.length} of the ${comparisons.length} the Opus 5 figure clears their own highest earlier figure — by a factor of
${factors[0].toFixed(1)} to ${factors.at(-1).toFixed(1)}.${
  level.length === 0
    ? ''
    : ` The exception${level.length > 1 ? 's are' : ' is'} ${level
        .map(
          (c) =>
            `${c.person}, whose ${c.best.model.replace('Claude ', '')} figure (${fmtPct(c.best.commentRatio)} on ${fmtInt(c.best.addedTotal)} lines) already matches it`,
        )
        .join(', and ')}.`
}</p>

<div class="card">
  <div class="card-head">
    <h3>Comment ratio by developer and model</h3>
    <p>Every Opus model each developer used with at least ${fmtInt(MIN_LINES)} added lines. Opus 5 in colour, the earlier models muted.</p>
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
    pointLabels: D.flowLabels, note: D.flowNotes,
    ariaLabel: "Comment ratio of added lines over time"
  });
  V.table(document.getElementById('t-headline'), FLOW_COLUMNS, D.monthTable);

  V.lineChart(document.getElementById('c-category'), {
    series: D.byCategory, annotations: D.annotations, tMin: D.tMin, tMax: D.tMax,
    pointLabels: D.flowLabels,
    ariaLabel: "Comment ratio by file type"
  });
  document.getElementById('l-category').innerHTML = D.byCategory.map(function (s) {
    return '<span><i class="swatch" style="background:' + s.color + '"></i>' + s.name + '</span>';
  }).join('');
  V.table(document.getElementById('t-category'), FLOW_COLUMNS, D.monthTable);

  V.dotChart(document.getElementById('c-daily'), {
    points: D.daily.points, tMin: D.daily.tMin, tMax: D.daily.tMax,
    annotations: [{ t: D.daily.release, label: 'Opus 5 released' }],
    tickAnchor: D.daily.release, tickDays: 7,
    yLabel: "Comment ratio of the day's added lines",
    ariaLabel: "Daily comment ratio around the Opus 5 release"
  });
  document.getElementById('l-daily').innerHTML = D.daily.legend.map(function (e) {
    return '<span><i class="swatch" style="background:' + e.color +
      ';width:10px;height:10px;border-radius:50%"></i>' + e.model + '</span>';
  }).join('');
  V.table(document.getElementById('t-daily'),
    ['Day', 'Commits', 'Lines added', 'Comment ratio', 'Model'], D.daily.table);

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
    pointLabels: D.stockLabels,
    yTick: function (v) { return V.int(Math.round(v)); },
    ariaLabel: "TypeScript lines of code over time"
  });
  V.table(document.getElementById('t-size'),
    ['Snapshot', 'Files', 'Code lines', 'Comment lines', 'Ratio'], D.stockTable);

  V.lineChart(document.getElementById('c-stockratio'), {
    series: D.stockRatio, tMin: D.tMin, tMax: D.tMax,
    pointLabels: D.stockLabels,
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
