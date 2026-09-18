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

// The first delta is the initial import of a codebase that already existed, so
// it is not a month of development and is kept out of the trend charts.
const flowMonths = monthly.months.filter((m) => !m.seeded);

const series = (scope, name, color) => ({
  name,
  color,
  points: flowMonths.map((m) => [periodMid(m), m.flow[scope].commentRatio]),
});

// Plotted at the boundary the snapshot stands for (the 1st of the month), not
// at the date of the last commit before it, which can be a couple of days off.
const stock = monthly.snapshots
  .filter((s) => s.totals.all.files > 0)
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

const annotations = releases.releases.map((r) => ({
  t: Date.parse(r.date + 'T00:00:00Z'),
  label: r.model.replace('Claude ', ''),
  major: r.major,
}));

// Every bucket that carries enough lines to mean anything, including the two
// that are not a model: hiding them is how an attribution bug stays invisible.
const IS_MODEL = /^Claude (Opus|Sonnet|Haiku|Fable|Mythos) /;
const modelItems = Object.entries(models.byModel)
  .filter(([, bucket]) => bucket.addedTotal >= 1000)
  .map(([name, bucket]) => ({
    label: name
      .replace('Claude ', '')
      .replace('no Claude trailer', 'sans trailer'),
    muted: !IS_MODEL.test(name),
    value: bucket.commentRatio,
    median: bucket.commitDistribution.median,
    p25: bucket.commitDistribution.p25,
    p75: bucket.commitDistribution.p75,
    commits: bucket.commits,
    added: bucket.addedTotal,
  }));
modelItems.sort((a, b) => b.value - a.value);

const fmtPct = (v, d = 1) =>
  v === null ? '—' : (v * 100).toFixed(d).replace('.', ',') + ' %';
const fmtInt = (v) => v.toLocaleString('fr-FR');
const dayFr = (isoDay) =>
  new Date(isoDay + 'T00:00:00Z').toLocaleDateString('fr-FR', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
  });
const periodFr = (m) =>
  `${dayFr(m.period)} → ${dayFr(m.periodEnd)} ${m.periodEnd.slice(2, 4)}`;

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

// Range of the periods before the shift, so the lede cannot go stale.
const beforeShift = flowMonths
  .filter((m) => m.period < '2026-08-01')
  .map((m) => m.flow.all.commentRatio);
const opus4xRange = opus4x.map((b) => b.commentRatio).sort((a, b) => a - b);

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
          .replace('no Claude trailer', 'sans trailer'),
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
  headline: [series('all', 'Tous fichiers', 'var(--series-1)')],
  byCategory: [
    series('ts', 'Code .ts', 'var(--series-1)'),
    series('tsx', 'Code .tsx', 'var(--series-2)'),
    series('spec', 'Tests .spec.*', 'var(--series-3)'),
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
      name: 'Lignes de code',
      color: 'var(--series-1)',
      points: stock.map((s) => [s.t, s.totals.all.code]),
    },
  ],
  modelItems,
  authorItems,
  personModelTable,
  monthTable: flowMonths.map((m) => [
    periodFr(m) + (m.partial ? ' (partiel)' : ''),
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
    new Date(r.date + 'T00:00:00Z').toLocaleDateString('fr-FR', {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    r.source === 'announcement'
      ? 'annonce Anthropic'
      : 'déduit de la date de retrait',
  ]),
};

const css = fs.readFileSync(path.join(here, 'page/styles.css'), 'utf8');
const runtime = fs.readFileSync(path.join(here, 'page/runtime.js'), 'utf8');
const generated = new Date(monthly.generatedAt).toLocaleDateString('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const head = `<title>Taux de commentaires Packmind</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>${css}</style>`;

const body = `<main>

<header>
  <h1>Le taux de commentaires dans le code, quinzaine par quinzaine</h1>
  <p class="lede">Le taux est resté entre ${fmtPct(Math.min(...beforeShift))} et ${fmtPct(Math.max(...beforeShift))}
  sur les dix premiers mois, puis a été multiplié par ${(opus5.commentRatio / opus4xPooled).toFixed(0)} à partir d'août 2026.
  Le basculement ne suit aucune consigne interne — aucune n'a changé — mais la sortie d'Opus 5 le 24 juillet : en
  attribuant chaque ligne au modèle qui l'a produite, la famille Opus 4.5 → 4.8 se tient entre
  ${fmtPct(opus4xRange[0])} et ${fmtPct(opus4xRange.at(-1))}, Opus 5 est à ${fmtPct(opus5.commentRatio)}.</p>
  <p>Codebase Packmind, fichiers TypeScript (<code>.ts</code>, <code>.tsx</code> et tests <code>.spec.*</code>),
  d'octobre 2025 à septembre 2026.</p>
  <p class="meta">Généré le ${generated} · ${fmtInt(models.commitsScanned)} commits analysés ·
  ${fmtInt(headScope.files)} fichiers et ${fmtInt(headScope.code)} lignes de code au dernier relevé.</p>
</header>

<div class="tiles">
  <div class="tile"><span class="value">${fmtPct(opus5.commentRatio)}</span><span class="label">des lignes ajoutées par <b>Opus 5</b> sont des commentaires</span></div>
  <div class="tile"><span class="value">${fmtPct(opus4xPooled)}</span><span class="label">pour toute la famille <b>Opus 4.5 → 4.8</b></span></div>
  <div class="tile"><span class="value">×${(opus5.commentRatio / opus4xPooled).toFixed(1).replace('.', ',')}</span><span class="label">écart entre les deux générations</span></div>
  <div class="tile"><span class="value">${fmtPct(headScope.commentRatio)}</span><span class="label">taux sur l'ensemble du code existant aujourd'hui</span></div>
</div>

<span class="eyebrow">Le flux</span>
<h2>1. Ce qui est écrit chaque mois</h2>
<p>Pour chaque quinzaine — les modèles sortent en milieu de mois, un pas mensuel ne séparerait pas l'avant de l'après — le diff net entre les deux bornes : sur les lignes
<em>ajoutées</em>, quelle part est du commentaire. C'est la mesure qui reflète la façon dont le code est écrit — le taux
sur l'ensemble de la codebase, lui, bouge lentement parce qu'il est dominé par l'existant.</p>

<div class="card">
  <div class="card-head">
    <h3>Taux de commentaires des lignes ajoutées</h3>
    <p>Les traits verticaux marquent les sorties de modèles Opus ; les repères en bas de l'axe, les autres modèles (survolez-les).</p>
  </div>
  <div class="chart" id="c-headline"></div>
  <details><summary>Voir les données</summary><div id="t-headline"></div></details>
</div>

<div class="card">
  <div class="card-head">
    <h3>Par type de fichier</h3>
    <p>Le code applicatif backend, le front React, et les fichiers de test suivent la même trajectoire.</p>
  </div>
  <div class="chart" id="c-category"></div>
  <div class="legend" id="l-category"></div>
  <details><summary>Voir les données</summary><div id="t-category"></div></details>
</div>

<span class="eyebrow">L'attribution</span>
<h2>2. Par modèle, directement</h2>
<p>Les commits produits via Claude Code portent un trailer <code>Co-Authored-By: Claude &lt;modèle&gt;</code>. On peut donc
attribuer chaque ligne ajoutée au modèle de la session qui l'a produite, au lieu de se contenter d'une corrélation
avec le calendrier. La barre donne le taux poolé ; le point et le trait donnent la médiane et l'écart
interquartile <em>par commit</em>, pour vérifier que le résultat n'est pas porté par quelques gros commits.</p>

<div class="card">
  <div class="card-head">
    <h3>Taux de commentaires des lignes ajoutées, par modèle</h3>
    <p>Modèles avec au moins 1 000 lignes ajoutées sur la période.</p>
  </div>
  <div class="chart" id="c-models"></div>
  <div class="legend">
    <span><i class="swatch" style="background:var(--series-1);height:9px;border-radius:3px"></i>Taux poolé sur toutes les lignes</span>
    <span><i class="swatch" style="background:var(--text-primary);width:9px;height:9px;border-radius:50%"></i>Médiane par commit</span>
    <span><i class="swatch" style="background:var(--text-primary);opacity:.55"></i>P25 – P75 par commit</span>
  </div>
  <details><summary>Voir les données</summary><div id="t-models"></div></details>
</div>

<span class="eyebrow">Par développeur</span>
<h2>3. Le même développeur, d'une génération à l'autre</h2>
<p>Les commits Opus 5 ne sont pas répartis uniformément dans l'équipe, donc la comparaison entre modèles pourrait
n'être qu'une comparaison entre personnes. Elle ne l'est pas : chaque développeur qui a utilisé les deux générations
monte, d'un facteur 4 à 20. L'amplitude, elle, varie beaucoup d'une personne à l'autre.</p>

<div class="card">
  <div class="card-head">
    <h3>Taux de commentaires par développeur et par modèle</h3>
    <p>Développeurs ayant au moins 1 000 lignes ajoutées avec Opus 5 et avec au moins un modèle de la génération précédente.</p>
  </div>
  <div class="chart" id="c-authors"></div>
  <details><summary>Voir la répartition complète des modèles par développeur</summary><div id="t-authors"></div></details>
</div>

<span class="eyebrow">Le stock</span>
<h2>4. Le stock, pour mémoire</h2>
<p>La taille de la codebase et le taux de commentaires calculé sur l'ensemble des fichiers existants à chaque relevé.</p>

<div class="card">
  <div class="card-head"><h3>Lignes de code TypeScript (hors commentaires et lignes vides)</h3></div>
  <div class="chart" id="c-size"></div>
  <details><summary>Voir les données</summary><div id="t-size"></div></details>
</div>

<div class="card">
  <div class="card-head">
    <h3>Taux de commentaires sur l'ensemble de la codebase</h3>
    <p>Beaucoup plus inerte que le flux : un mois de code très commenté ne déplace le stock que de quelques dixièmes de point.</p>
  </div>
  <div class="chart" id="c-stockratio"></div>
</div>

<span class="eyebrow">Référentiel</span>
<h2>Dates de sortie retenues</h2>
<div class="card"><div id="t-releases"></div></div>

<span class="eyebrow">Comment c'est mesuré</span>
<h2>Méthode et limites</h2>
<ul>
  <li>Une ligne est comptée <em>commentaire</em> quand tous ses caractères non blancs appartiennent à un commentaire —
  convention de <code>cloc</code>. <code>const a = 1; // pourquoi</code> compte donc comme du code.</li>
  <li>Les commentaires sont repérés avec le parser TypeScript officiel, pas avec une expression régulière : les
  chaînes, les littéraux de gabarit, les expressions régulières et le texte JSX contenant <code>//</code> ne sont pas
  pris pour des commentaires. L'idiome JSX <code>{'{/* ... */}'}</code> est compté comme commentaire.</li>
  <li>Les fichiers <code>.d.ts</code> sont exclus. Les renommages sont détectés, donc déplacer un fichier ne compte pas
  comme du code neuf.</li>
  <li>L'historique public du dépôt commence le 5 septembre 2025 par un import d'une base déjà existante. Ce premier
  delta n'est pas un mois de développement et est exclu des courbes.</li>
  <li>Le trailer indique le modèle de la session qui a produit le commit, pas nécessairement l'auteur de chaque ligne.
  Les pull requests étant écrasées à la fusion, un trailer couvre une PR.</li>
  <li>Septembre 2026 est un mois partiel (arrêté au dernier commit analysé).</li>
  <li>Les commits sans trailer (l'essentiel de 2025) sont d'attribution inconnue, pas « humains ».</li>
</ul>

</main>
<script>${runtime}</script>
<script>
(function () {
  var D = ${JSON.stringify(payload)};
  var V = window.VIZ;

  V.lineChart(document.getElementById('c-headline'), {
    series: D.headline, annotations: D.annotations, tMin: D.tMin, tMax: D.tMax,
    ariaLabel: "Taux de commentaires des lignes ajoutees par mois"
  });
  V.table(document.getElementById('t-headline'),
    ['Période', 'Lignes ajoutées', 'Tous', '.ts', '.tsx', 'Tests', 'Taux des lignes supprimées'], D.monthTable);

  V.lineChart(document.getElementById('c-category'), {
    series: D.byCategory, annotations: D.annotations, tMin: D.tMin, tMax: D.tMax,
    ariaLabel: "Taux de commentaires par type de fichier"
  });
  document.getElementById('l-category').innerHTML = D.byCategory.map(function (s) {
    return '<span><i class="swatch" style="background:' + s.color + '"></i>' + s.name + '</span>';
  }).join('');
  V.table(document.getElementById('t-category'),
    ['Période', 'Lignes ajoutées', 'Tous', '.ts', '.tsx', 'Tests', 'Taux des lignes supprimées'], D.monthTable);

  V.barChart(document.getElementById('c-models'), {
    items: D.modelItems, ariaLabel: "Taux de commentaires par modele"
  });
  V.table(document.getElementById('t-models'),
    ['Modèle', 'Commits', 'Lignes ajoutées', 'Taux poolé', 'Médiane/commit', 'P25 – P75'], D.modelTable);

  V.barChart(document.getElementById('c-authors'), {
    items: D.authorItems, ariaLabel: "Taux de commentaires par developpeur et par modele"
  });
  V.table(document.getElementById('t-authors'),
    ['Développeur', 'Modèle', 'Commits', 'Part de ses commits', 'Lignes ajoutées', 'Taux de commentaires'],
    D.personModelTable);

  V.lineChart(document.getElementById('c-size'), {
    series: D.stockSize, annotations: D.annotations, tMin: D.tMin, tMax: D.tMax,
    yTick: function (v) { return V.int(Math.round(v)); },
    ariaLabel: "Lignes de code TypeScript par mois"
  });
  V.table(document.getElementById('t-size'),
    ['Relevé', 'Fichiers', 'Lignes de code', 'Lignes de commentaire', 'Taux'], D.stockTable);

  V.lineChart(document.getElementById('c-stockratio'), {
    series: D.stockRatio, tMin: D.tMin, tMax: D.tMax,
    ariaLabel: "Taux de commentaires de l ensemble de la codebase"
  });

  V.table(document.getElementById('t-releases'), ['Modèle', 'Date de sortie', 'Source'], D.releaseTable);
})();
</script>`;

// Two shapes of the same page. The standalone file is a complete document that
// opens from disk; the artifact fragment leaves out the document skeleton,
// which the Artifact runtime supplies.
const html =
  options.target === 'artifact'
    ? `${head}\n${body}\n`
    : `<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n` +
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
