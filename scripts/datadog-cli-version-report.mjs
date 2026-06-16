// scripts/datadog-cli-version-report.mjs
// Downloads the last week of `Packmind CLI request` logs from Datadog
// (service:api-proprietary) and prints a usage breakdown by cliVersion.
//
// Required env vars:
//   DD_API_KEY   Datadog API key
//   DD_APP_KEY   Datadog Application key
// Optional env vars:
//   DD_SITE      Datadog site (default: datadoghq.eu)
//   DD_DAYS      Number of days to look back (default: 7)

const DD_API_KEY = process.env.DD_API_KEY;
const DD_APP_KEY = process.env.DD_APP_KEY;
const DD_SITE = process.env.DD_SITE || 'datadoghq.eu';
const DAYS = Number(process.env.DD_DAYS || 7);

if (!DD_API_KEY || !DD_APP_KEY) {
  console.error(
    'Missing DD_API_KEY or DD_APP_KEY environment variable. Set both to a Datadog API key and Application key.',
  );
  process.exit(1);
}

const now = new Date();
const from = new Date(now.getTime() - DAYS * 24 * 60 * 60 * 1000);
const url = `https://api.${DD_SITE}/api/v2/logs/events/search`;
const QUERY = 'service:api-proprietary "Packmind CLI request"';

async function fetchPage(cursor) {
  const body = {
    filter: {
      from: from.toISOString(),
      to: now.toISOString(),
      query: QUERY,
    },
    page: { limit: 1000, ...(cursor ? { cursor } : {}) },
    sort: 'timestamp',
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'DD-API-KEY': DD_API_KEY,
      'DD-APPLICATION-KEY': DD_APP_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Datadog API ${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

function extractJson(message) {
  if (!message) return null;
  const start = message.indexOf('{');
  const end = message.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(message.slice(start, end + 1));
  } catch {
    return null;
  }
}

function formatPercent(count, total) {
  const pct = (count / total) * 100;
  if (pct < 1) return '< 1%';
  return `${Math.round(pct)}%`;
}

function renderTable(rows) {
  const versionWidth = Math.max(
    'version'.length,
    ...rows.map((r) => r.version.length),
  );
  const usageWidth = Math.max(
    'usage'.length,
    ...rows.map((r) => r.usage.length),
  );
  const sep = '-'.repeat(versionWidth + usageWidth + 7);

  const lines = [];
  lines.push(sep);
  lines.push(
    `| ${'version'.padEnd(versionWidth)} | ${'usage'.padEnd(usageWidth)} |`,
  );
  lines.push(sep);
  for (const r of rows) {
    lines.push(
      `| ${r.version.padEnd(versionWidth)} | ${r.usage.padEnd(usageWidth)} |`,
    );
  }
  lines.push(sep);
  return lines.join('\n');
}

async function main() {
  const counts = new Map();
  let total = 0;
  let pages = 0;
  let cursor;

  process.stderr.write(
    `Fetching Datadog logs from ${from.toISOString()} to ${now.toISOString()} (site=${DD_SITE})...\n`,
  );

  do {
    const data = await fetchPage(cursor);
    pages += 1;
    const events = data.data || [];
    for (const evt of events) {
      const json = extractJson(evt.attributes?.message);
      const version = json?.cliVersion;
      if (!version) continue;
      counts.set(version, (counts.get(version) || 0) + 1);
      total += 1;
    }
    cursor = data.meta?.page?.after;
    process.stderr.write(
      `  page ${pages}: ${events.length} events (running total: ${total})\n`,
    );
  } while (cursor);

  if (total === 0) {
    console.log('No matching logs found.');
    return;
  }

  const rows = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([version, count]) => ({
      version,
      usage: formatPercent(count, total),
    }));

  console.log(renderTable(rows));
  console.log(
    `\nTotal requests: ${total} across ${counts.size} distinct version(s) over the last ${DAYS} day(s).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
