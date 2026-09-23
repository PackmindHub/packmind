#!/usr/bin/env node
/**
 * Build a small standalone page for one day-by-day window around a change.
 *
 *   node tools/comment-ratio/render-window.mjs
 *     [--out <dir>] [--data daily-september.json] [--mark YYYY-MM-DD]
 *     [--label "Instructions updated"] [--title "..."] [--name <file>]
 *     [--exclude YYYY-MM-DD,...] [--target artifact]
 *
 * Separate from render.mjs on purpose: that report answers "what did the model
 * change", this one answers "did our own change do anything", and the two want
 * different framing even though they share a measure and a chart.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const options = {
  out: path.join(here, 'output'),
  data: 'daily-september.json',
  mark: '2026-09-22',
  label: 'Instructions updated',
  title: 'Comment ratio since the instruction change',
  name: 'window.html',
  // Days that measure something other than day-to-day authoring — a bulk
  // rewrite, say. They are off the chart, because one 47% day sets the axis
  // and squashes the few points of movement this page exists to show, but
  // they stay in the table and are named in the prose.
  exclude: '2026-09-18',
  target: 'standalone',
};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 2)
  options[argv[i].replace(/^--/, '')] = argv[i + 1];

const daily = JSON.parse(
  fs.readFileSync(path.join(options.out, options.data), 'utf8'),
);
const excluded = new Set(options.exclude ? options.exclude.split(',') : []);

const day = (isoDay) => Date.parse(isoDay + 'T00:00:00Z');
const fmtPct = (v, d = 1) => (v === null ? '—' : (v * 100).toFixed(d) + '%');
const fmtInt = (v) => v.toLocaleString('en-US');
const dayEn = (isoDay) =>
  new Date(isoDay + 'T00:00:00Z').toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
  });

const rows = daily.days.filter((d) => d.commentRatio !== null);
const before = rows.filter((d) => d.date < options.mark && !excluded.has(d.date));
const after = rows.filter((d) => d.date >= options.mark && !excluded.has(d.date));

const median = (list) => {
  if (list.length === 0) return null;
  const values = list.map((d) => d.commentRatio).sort((a, b) => a - b);
  const mid = (values.length - 1) / 2;
  return (values[Math.floor(mid)] + values[Math.ceil(mid)]) / 2;
};
const pooled = (list) => {
  const comment = list.reduce((s, d) => s + d.addedComment, 0);
  const total = list.reduce((s, d) => s + d.added, 0);
  return total === 0 ? null : comment / total;
};

const baseline = median(before);
const spread = [
  Math.min(...before.map((d) => d.commentRatio)),
  Math.max(...before.map((d) => d.commentRatio)),
];

const points = rows
  .filter((d) => !excluded.has(d.date))
  .map((d) => ({
    t: day(d.date),
    ratio: d.commentRatio,
    added: d.added,
    label: dayEn(d.date),
    model: d.date >= options.mark ? 'After the change' : 'Before the change',
    color: d.date >= options.mark ? 'var(--series-1)' : 'var(--series-3)',
  }));

const legend = [...new Set(points.map((p) => p.model))].map((model) => ({
  model,
  color: points.find((p) => p.model === model).color,
}));

const payload = {
  points,
  legend,
  tMin: day(rows[0].date) - 12 * 3600 * 1000,
  tMax: day(rows.at(-1).date) + 12 * 3600 * 1000,
  mark: day(options.mark),
  markLabel: options.label,
  baseline,
  baselineLabel: `Median before: ${fmtPct(baseline)}`,
  table: rows.map((d) => [
    dayEn(d.date),
    fmtInt(d.commits),
    fmtInt(d.added),
    fmtPct(d.commentRatio),
    excluded.has(d.date)
      ? 'bulk rewrite'
      : d.date >= options.mark
        ? 'after'
        : 'before',
  ]),
};

const css = fs.readFileSync(path.join(here, 'page/styles.css'), 'utf8');
const runtime = fs.readFileSync(path.join(here, 'page/runtime.js'), 'utf8');
const generated = new Date(daily.generatedAt).toLocaleDateString('en-GB', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const verdict =
  after.length < 4
    ? `Too early to read. ${after.length === 1 ? 'One day' : `${fmtInt(after.length)} days`} of authoring
      ${after.length === 1 ? 'has' : 'have'} landed since the change, and the days before it already range from
      ${fmtPct(spread[0])} to ${fmtPct(spread[1])} on their own. Anything inside that range is noise, whichever way
      it points. Refresh in a week or two.`
    : `Over the ${fmtInt(after.length)} days since the change the median day sits at ${fmtPct(median(after))},
      against ${fmtPct(baseline)} before it. The days before the change range from ${fmtPct(spread[0])} to
      ${fmtPct(spread[1])} on their own, so read the level, not any single dot.`;

const body = `<main>

<header>
  <h1>${options.title}</h1>
  <p class="lede">${verdict}</p>
  <p class="meta">Collected ${generated} · ${dayEn(rows[0].date)} to ${dayEn(rows.at(-1).date)} ·
  TypeScript only (<code>.ts</code>, <code>.tsx</code>, <code>.spec.*</code>).</p>
</header>

<div class="card">
  <div class="card-head">
    <h3>Comment ratio of newly written lines, day by day</h3>
    <p>One dot per day. Its height is the share of that day's added TypeScript lines that are comments; its size is
    how many lines the day added. The dashed vertical line is ${dayEn(options.mark)}, when the instruction landed;
    the horizontal one is the median day before it.</p>
  </div>
  <div class="chart" id="c-window"></div>
  <div class="legend" id="l-window"></div>
  <details><summary>See the data</summary><div id="t-window"></div></details>
</div>

<p>Daily figures are noisy: a day is one or two merged pull requests, and a single documentation-heavy file moves it
several points. Read the level over a week, not the last dot. The two figures to watch are the median day
(${fmtPct(baseline)} before the change) and the pooled ratio over all the days
(${fmtPct(pooled(before))} before), which weights each day by how much it wrote.</p>

${
  excluded.size > 0
    ? `<p>${[...excluded].map((d) => dayEn(d)).join(', ')} ${excluded.size === 1 ? 'is' : 'are'} off the chart and out
  of both figures: a deliberate pass over existing comments, not a day of ordinary authoring. It reached
  ${[...excluded].map((d) => fmtPct(rows.find((r) => r.date === d)?.commentRatio ?? null)).join(', ')} and is in the
  table above, tagged as such &mdash; one day at that height sets the axis and flattens the few points of movement
  this page exists to show.</p>`
    : ''
}

</main>
<script>${runtime}</script>
<script>
(function () {
  var D = ${JSON.stringify(payload)};
  var V = window.VIZ;

  V.dotChart(document.getElementById('c-window'), {
    points: D.points, tMin: D.tMin, tMax: D.tMax,
    annotations: [{ t: D.mark, label: D.markLabel }],
    baseline: { value: D.baseline, label: D.baselineLabel },
    tickAnchor: D.mark, tickDays: 2,
    yLabel: "Comment ratio of the day's added lines",
    ariaLabel: "Daily comment ratio around the instruction change"
  });
  document.getElementById('l-window').innerHTML = D.legend.map(function (e) {
    return '<span><i class="swatch" style="background:' + e.color +
      ';width:10px;height:10px;border-radius:50%"></i>' + e.model + '</span>';
  }).join('');
  V.table(document.getElementById('t-window'),
    ['Day', 'Commits', 'Lines added', 'Comment ratio', 'Side'], D.table);
})();
</script>`;

const head = `<title>${options.title}</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>${css}</style>`;

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
    ? options.name.replace(/\.html$/, '.artifact.html')
    : options.name,
);
fs.writeFileSync(target, html);
process.stderr.write(
  `Wrote ${target} (${(html.length / 1024).toFixed(0)} KB)\n`,
);
