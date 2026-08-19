import {
  LuBookCheck,
  LuBot,
  LuPalette,
  LuPlug,
  LuTerminal,
  LuWandSparkles,
  LuWebhook,
} from 'react-icons/lu';

import type {
  Component,
  ComponentTypeDescriptor,
  DistributionMode,
  DistributionTarget,
  PluginSummary,
  Scenario,
  TypeHorizon,
} from './types';

// ── The type registry ────────────────────────────────────────────────────────
// Everything type-related in this prototype reads from this array. Nothing else
// enumerates types. Deleting a row removes it from the creation menu, from the
// plugin content grouping and from the filter row, with no other edit.

export const COMPONENT_TYPES: ComponentTypeDescriptor[] = [
  {
    type: 'standard',
    labelSingular: 'Standard',
    labelPlural: 'Standards',
    icon: <LuBookCheck />,
    body: 'prose+rules',
    agents: ['Claude', 'Cursor', 'Copilot', 'Continue'],
    marketplaceRenderable: false,
    status: 'live',
  },
  {
    type: 'command',
    labelSingular: 'Command',
    labelPlural: 'Commands',
    icon: <LuTerminal />,
    body: 'prose',
    agents: ['Claude', 'Cursor', 'Copilot', 'Continue', 'OpenCode'],
    marketplaceRenderable: true,
    status: 'live',
  },
  {
    type: 'skill',
    labelSingular: 'Skill',
    labelPlural: 'Skills',
    icon: <LuWandSparkles />,
    body: 'prose+frontmatter+files',
    agents: ['Claude', 'Cursor', 'Copilot', 'GitLab Duo', 'OpenCode', 'Codex'],
    marketplaceRenderable: true,
    status: 'live',
  },
  {
    type: 'hook',
    labelSingular: 'Hook',
    labelPlural: 'Hooks',
    icon: <LuWebhook />,
    body: 'config-form',
    agents: ['Claude'],
    marketplaceRenderable: true,
    status: 'planned',
  },
  {
    type: 'agent',
    labelSingular: 'Agent',
    labelPlural: 'Agents',
    icon: <LuBot />,
    body: 'prose+frontmatter',
    agents: ['Claude', 'Copilot'],
    marketplaceRenderable: true,
    status: 'planned',
  },
  {
    type: 'output-style',
    labelSingular: 'Output style',
    labelPlural: 'Output styles',
    icon: <LuPalette />,
    body: 'prose+frontmatter',
    agents: ['Claude'],
    marketplaceRenderable: true,
    status: 'planned',
  },
  {
    type: 'mcp-server',
    labelSingular: 'MCP server',
    labelPlural: 'MCP servers',
    icon: <LuPlug />,
    body: 'config-form',
    agents: ['Claude', 'Cursor', 'Copilot'],
    marketplaceRenderable: true,
    status: 'planned',
  },
];

export function typesForHorizon(
  horizon: TypeHorizon,
): ComponentTypeDescriptor[] {
  return horizon === 'today'
    ? COMPONENT_TYPES.filter((t) => t.status === 'live')
    : COMPONENT_TYPES;
}

export function descriptorFor(type: string): ComponentTypeDescriptor {
  const found = COMPONENT_TYPES.find((t) => t.type === type);
  if (!found) throw new Error(`Unknown component type: ${type}`);
  return found;
}

// ── Component bodies ──────────────────────────────────────────────────────────

const STRICT_MODE_PROSE = `Every package compiles under \`strict: true\`. No exceptions, no per-file
opt-outs, no \`@ts-ignore\` without an adjacent comment naming the ticket that
will remove it.

The cost of strict mode is paid once, when a package is created. The cost of
opting out is paid on every subsequent change, by whoever did not write the
original code.

## Why this is not negotiable

Type errors caught at build time are the cheapest defects a team will ever fix.
A codebase where \`strict\` is partially enabled trains its contributors to
distrust the compiler, which is worse than not having one.`;

const REVIEW_PR_PROSE = `Review the working diff, not the branch. Report findings ranked by severity
and stop at the first one that blocks a merge.

1. Read the diff in full before commenting on any line.
2. Separate defects from preferences. Name which one you are raising.
3. For every defect, give the input that produces the wrong output.
4. Skip style: the formatter owns it.`;

const MIGRATION_PROSE = `Generate a reversible TypeORM migration from a described schema change, with
the logging and helper conventions this codebase already uses.

Read an existing migration before writing a new one. The naming, the logger
calls and the \`down\` implementation are not optional.`;

const pluginComponentsBackend = (): Component[] => [
  {
    id: 'a-strict',
    name: 'typescript-strict-mode',
    type: 'standard',
    version: 4,
    updatedLabel: '2 days ago',
    author: 'Salima N.',
    summary: 'No partial strict, no unexplained ts-ignore.',
    prose: STRICT_MODE_PROSE,
    rules: [
      {
        id: 'r1',
        text: 'Enable strict mode in every package tsconfig',
        detection: 'automated',
      },
      {
        id: 'r2',
        text: 'Never use @ts-ignore without an adjacent ticket reference',
        detection: 'automated',
      },
      {
        id: 'r3',
        text: 'Prefer unknown over any at trust boundaries',
        detection: 'manual',
      },
    ],
  },
  {
    id: 'a-errors',
    name: 'error-handling-conventions',
    type: 'standard',
    version: 7,
    updatedLabel: '1 week ago',
    author: 'Salima N.',
    summary: 'Typed errors at the boundary, never in the domain.',
    prose: `Domain code throws domain errors. Only the HTTP layer knows about status
codes. An error that crosses a boundary is translated, never re-thrown raw.`,
    rules: [
      {
        id: 'r1',
        text: 'Do not use Object.setPrototypeOf when defining errors',
        detection: 'automated',
      },
      {
        id: 'r2',
        text: 'Every domain error carries the identifier that caused it',
        detection: 'manual',
      },
    ],
  },
  {
    id: 'a-hexa',
    name: 'hexagonal-architecture-boundaries',
    type: 'standard',
    version: 12,
    updatedLabel: '3 weeks ago',
    author: 'Tomas R.',
    summary: 'What a use case may reach, and what it may not.',
    prose: `A use case reaches other domains through ports. It never instantiates
another domain's use case, and it never touches another domain's repository.`,
    rules: [
      {
        id: 'r1',
        text: 'Never call repositories from an adapter',
        detection: 'automated',
      },
      {
        id: 'r2',
        text: 'Reuse other domains through ports, never by instantiation',
        detection: 'manual',
      },
    ],
  },
  {
    id: 'a-pii',
    name: 'logging-and-pii-masking',
    type: 'standard',
    version: 3,
    pendingReview: true,
    updatedLabel: '4 hours ago',
    author: 'Jun P.',
    summary: 'Logs leave the building. Mask before they do.',
    prose: `Logs are forwarded to external processors. Treat every log line as
public. Emails are masked to their first six characters.`,
    rules: [
      {
        id: 'r1',
        text: 'Never log an email, phone number or IP address in clear text',
        detection: 'automated',
      },
    ],
  },
  {
    id: 'a-review',
    name: 'review-pull-request',
    type: 'command',
    version: 9,
    updatedLabel: '5 days ago',
    author: 'Tomas R.',
    summary: 'Severity-ranked review of the working diff.',
    prose: REVIEW_PR_PROSE,
  },
  {
    id: 'a-usecase',
    name: 'create-use-case',
    type: 'command',
    version: 5,
    updatedLabel: '2 weeks ago',
    author: 'Salima N.',
    summary: 'Scaffold a use case with its contract and its tests.',
    prose: `Create a use case, its command and response contract, its adapter method
and its spec. Ask which abstract base applies before writing anything.`,
  },
  {
    id: 'a-event',
    name: 'add-domain-event',
    type: 'command',
    version: 2,
    updatedLabel: '1 hour ago',
    author: 'You',
    summary: 'Emit and subscribe to a new domain event.',
    prose: `Declare the event class, its payload interface, the barrel export, the
emit call and the listener subscription. Four files, in this order.`,
  },
  {
    id: 'a-migration',
    name: 'write-typeorm-migration',
    type: 'skill',
    version: 6,
    updatedLabel: '3 days ago',
    author: 'Jun P.',
    summary: 'Reversible migrations with the shared logging helpers.',
    prose: MIGRATION_PROSE,
    frontmatter: [
      { label: 'name', value: 'write-typeorm-migration' },
      {
        label: 'description',
        value: 'Write reversible TypeORM migrations with shared helpers',
      },
      {
        label: 'allowed-tools',
        value: 'Read, Write, Edit, Bash(npx typeorm:*)',
      },
      { label: 'license', value: 'Proprietary' },
    ],
    files: [
      { path: 'SKILL.md', size: '4.2 kB', content: MIGRATION_PROSE },
      {
        path: 'references/naming.md',
        size: '1.1 kB',
        content: `Migration class names are \`<Verb><Subject><Timestamp>\`. The timestamp is the
one TypeORM generates, never a hand-written one.`,
      },
      {
        path: 'references/rollback-checklist.md',
        size: '870 B',
        content: `Before merging, run the migration down and back up against a copy of
staging. A \`down\` that throws is worse than no \`down\` at all.`,
      },
      {
        path: 'scripts/generate.sh',
        size: '1.4 kB',
        executable: true,
        content: `#!/usr/bin/env sh
set -eu
npx typeorm migration:create "packages/migrations/src/\${1}"`,
      },
    ],
  },
  {
    id: 'a-flags',
    name: 'audit-feature-flags',
    type: 'skill',
    version: 2,
    updatedLabel: '1 month ago',
    author: 'Tomas R.',
    summary: 'Inventory every flag, its audience and its orphan status.',
    prose: `Walk the shared registry, the frontend gate and the backend helper, then
produce one table: flag key, audience, what it gates, active or orphan.`,
    frontmatter: [
      { label: 'name', value: 'audit-feature-flags' },
      {
        label: 'description',
        value: 'Inventory and audit every declared feature flag',
      },
      { label: 'allowed-tools', value: 'Read, Grep, Glob' },
    ],
    files: [
      { path: 'SKILL.md', size: '3.6 kB' },
      { path: 'references/registry-shape.md', size: '2.0 kB' },
    ],
  },
  {
    // The tail of the distribution: this repo's own `xlsx` skill is 54 files
    // deep at 6 levels. The rail has to survive it.
    id: 'a-spreadsheets',
    name: 'analyze-spreadsheet-exports',
    type: 'skill',
    version: 9,
    updatedLabel: '5 days ago',
    author: 'Jun P.',
    summary: 'Read, clean and chart the exports finance sends us.',
    prose: `Open the export, find the real header row, and normalise before doing anything
else. Finance exports carry merged cells, footnote rows and totals inline with
data. Never trust the first row.`,
    frontmatter: [
      { label: 'name', value: 'analyze-spreadsheet-exports' },
      {
        label: 'description',
        value: 'Read, clean and chart finance spreadsheet exports',
      },
      {
        label: 'allowed-tools',
        value: 'Read, Write, Bash(python3:*), Bash(uv:*)',
      },
      { label: 'compatibility', value: 'Claude Code, Cursor, Codex' },
    ],
    files: [
      { path: 'SKILL.md', size: '6.1 kB' },
      { path: 'references/reading-xlsx.md', size: '3.4 kB' },
      { path: 'references/formulas.md', size: '2.8 kB' },
      { path: 'references/charts.md', size: '4.0 kB' },
      { path: 'references/recipes/pivot-tables.md', size: '1.9 kB' },
      { path: 'references/recipes/conditional-formats.md', size: '1.2 kB' },
      { path: 'references/recipes/merged-cells.md', size: '980 B' },
      { path: 'scripts/normalise.py', size: '5.2 kB' },
      { path: 'scripts/detect_header_row.py', size: '2.4 kB' },
      { path: 'scripts/chart.py', size: '3.8 kB' },
      { path: 'scripts/run.sh', size: '640 B', executable: true },
      { path: 'scripts/lib/io.py', size: '2.1 kB' },
      { path: 'scripts/lib/cleaning.py', size: '4.6 kB' },
      { path: 'scripts/lib/validators/schema.py', size: '1.8 kB' },
      { path: 'scripts/lib/validators/currency.py', size: '1.1 kB' },
      {
        path: 'schemas/ooxml/spreadsheetml/sheet-2006.xsd',
        size: '41 kB',
      },
      {
        path: 'schemas/ooxml/spreadsheetml/shared-strings-2006.xsd',
        size: '12 kB',
      },
      { path: 'schemas/internal/finance-export.json', size: '3.2 kB' },
      { path: 'assets/template.xlsx', size: '18 kB', binary: true },
      { path: 'assets/logo.png', size: '7.4 kB', binary: true },
    ],
  },
  {
    id: 'a-precommit',
    name: 'block-console-log-on-commit',
    type: 'hook',
    version: 1,
    updatedLabel: '6 days ago',
    author: 'Jun P.',
    summary: 'Refuses a commit that adds a bare console.log.',
    config: [
      {
        label: 'Event',
        value: 'PreToolUse',
        kind: 'choice',
        hint: 'Runs before the agent uses a tool',
      },
      {
        label: 'Matcher',
        value: 'Bash(git commit:*)',
        kind: 'text',
        hint: 'Leave empty to match every tool call',
      },
      {
        label: 'Command',
        value:
          'sh "${CLAUDE_PROJECT_DIR}/.packmind/hooks/no-console-log.sh" || exit 2',
        kind: 'code',
      },
      { label: 'Timeout', value: '5s', kind: 'text' },
    ],
  },
  {
    id: 'a-reviewer',
    name: 'backend-reviewer',
    type: 'agent',
    version: 3,
    updatedLabel: '2 days ago',
    author: 'Salima N.',
    summary: 'Reviews backend diffs against this space’s standards.',
    prose: `You review backend changes in a hexagonal TypeScript codebase. Read the
standards in this plugin before the diff. Report defects, not preferences, and
give the input that produces the wrong output for each one.`,
    frontmatter: [
      { label: 'name', value: 'backend-reviewer' },
      {
        label: 'description',
        value: 'Reviews backend diffs against the space standards',
      },
      { label: 'tools', value: 'Read, Grep, Glob, Bash(git diff:*)' },
      { label: 'model', value: 'inherit' },
    ],
  },
];

const pluginComponentsTesting = (): Component[] => [
  {
    id: 't-pyramid',
    name: 'test-pyramid-and-boundaries',
    type: 'standard',
    version: 5,
    updatedLabel: '1 week ago',
    author: 'Jun P.',
    summary: 'What belongs in a unit test, and what does not.',
    prose: `A unit test never touches a database. An integration test never asserts on
a rendered string. If a test needs three mocks, the seam is in the wrong place.`,
    rules: [
      {
        id: 'r1',
        text: 'Unit tests never open a connection',
        detection: 'automated',
      },
      {
        id: 'r2',
        text: 'One behaviour per test, named after the behaviour',
        detection: 'manual',
      },
    ],
  },
  {
    id: 't-factories',
    name: 'use-entity-factories',
    type: 'standard',
    version: 2,
    updatedLabel: '2 months ago',
    author: 'Tomas R.',
    summary: 'Spec files build entities from factories, never by hand.',
    prose: `Factories live in the package's \`test/\` subpath. Production code must not
import them.`,
    rules: [
      {
        id: 'r1',
        text: 'Never construct a persisted entity literal in a spec',
        detection: 'automated',
      },
    ],
  },
  {
    id: 't-e2e',
    name: 'write-e2e-test',
    type: 'command',
    version: 8,
    updatedLabel: '4 days ago',
    author: 'Jun P.',
    summary: 'Playwright spec using the mandatory fixtures.',
    prose: `Use the shipped fixtures and the page object model. A raw \`test()\` call
with hand-rolled selectors will be rejected in review.`,
  },
  {
    id: 't-flaky',
    name: 'find-flaky-tests',
    type: 'skill',
    version: 4,
    updatedLabel: '3 weeks ago',
    author: 'Salima N.',
    summary: 'Grep CI logs for retry markers and rank by frequency.',
    prose: `Read the last 200 CI runs, group failures by test name, and rank by the
ratio of retried to total runs.`,
    frontmatter: [
      { label: 'name', value: 'find-flaky-tests' },
      { label: 'description', value: 'Find and rank flaky tests from CI logs' },
      { label: 'allowed-tools', value: 'Bash(gh run:*), Read, Grep' },
    ],
    files: [
      { path: 'SKILL.md', size: '2.8 kB' },
      { path: 'scripts/collect-runs.sh', size: '2.1 kB', executable: true },
    ],
  },
  {
    id: 't-coverage',
    name: 'fail-under-coverage-floor',
    type: 'hook',
    version: 1,
    updatedLabel: '20 minutes ago',
    author: 'You',
    summary: 'Stops the session when coverage drops below the floor.',
    config: [
      { label: 'Event', value: 'PostToolUse', kind: 'choice' },
      { label: 'Matcher', value: 'Bash(nx test:*)', kind: 'text' },
      {
        label: 'Command',
        value: 'node .packmind/hooks/check-coverage.mjs --floor 80',
        kind: 'code',
      },
      { label: 'Timeout', value: '30s', kind: 'text' },
    ],
  },
];

const pluginComponentsOnboarding = (): Component[] => [
  {
    id: 'o-setup',
    name: 'set-up-local-environment',
    type: 'command',
    version: 3,
    updatedLabel: '1 month ago',
    author: 'Tomas R.',
    summary: 'From clone to a running stack, with the version checks.',
    prose: `Read \`.nvmrc\` first. Docker Compose provisions Postgres and Redis, so do
not install them. If the API 404s on an edition route, clear the webpack cache.`,
  },
  {
    id: 'o-tour',
    name: 'codebase-tour',
    type: 'skill',
    version: 2,
    updatedLabel: '2 months ago',
    author: 'Salima N.',
    summary: 'Walks a newcomer through the monorepo, domain by domain.',
    prose: `Start from the apps, then the packages they depend on. Never start from
the types package: it reads as an inventory, not an architecture.`,
    frontmatter: [
      { label: 'name', value: 'codebase-tour' },
      {
        label: 'description',
        value: 'Guided tour of the monorepo for newcomers',
      },
      { label: 'allowed-tools', value: 'Read, Glob, Grep' },
    ],
    files: [{ path: 'SKILL.md', size: '5.4 kB' }],
  },
  {
    id: 'o-voice',
    name: 'house-review-voice',
    type: 'output-style',
    version: 1,
    updatedLabel: '3 days ago',
    author: 'Jun P.',
    summary: 'Terse, no hedging, no praise before the finding.',
    prose: `Lead with the finding. No preamble, no summary of what was read, no
compliments. One sentence of context at most, then the defect.`,
    frontmatter: [
      { label: 'name', value: 'house-review-voice' },
      { label: 'description', value: 'Terse review voice, finding first' },
    ],
  },
];

/**
 * One component belongs to exactly one plugin, so no plugin can borrow another
 * one's content. These exist to give the operational plugins their own
 * components instead of re-listing the backend and testing pools.
 */
const pluginComponentsApi = (): Component[] => [
  {
    id: 'q-versioning',
    name: 'api-versioning-policy',
    type: 'standard',
    version: 4,
    updatedLabel: '3 weeks ago',
    author: 'Salima N.',
    summary: 'One major version in the path, never in a header.',
    prose: `The version lives in the path. A breaking change ships a new major and the
previous one keeps working for two quarters.`,
    rules: [
      {
        id: 'q1',
        text: 'Version in the path, never negotiated through a header',
        detection: 'automated',
      },
      {
        id: 'q2',
        text: 'Removing a field is a breaking change, even if it is always null',
        detection: 'manual',
      },
    ],
  },
  {
    id: 'q-pagination',
    name: 'pagination-and-cursors',
    type: 'standard',
    version: 2,
    updatedLabel: '2 months ago',
    author: 'Tomas R.',
    summary: 'Cursors on every collection, offsets nowhere.',
    prose: `Every collection endpoint paginates, including the ones that return three rows
today. Cursors are opaque and never decoded by a client.`,
    rules: [
      {
        id: 'q3',
        text: 'Every collection endpoint returns a cursor, never a page number',
        detection: 'automated',
      },
    ],
  },
];

const pluginComponentsSecurity = (): Component[] => [
  {
    id: 's-secrets',
    name: 'secrets-never-in-code',
    type: 'standard',
    version: 8,
    updatedLabel: '4 days ago',
    author: 'Jun P.',
    summary: 'Read secrets through the config helper, nowhere else.',
    prose: `Secrets come from the vault through one accessor. A literal in a source file is
a leak even on a branch that never merges.`,
    rules: [
      {
        id: 's1',
        text: 'Read every secret through the configuration helper',
        detection: 'automated',
      },
      {
        id: 's2',
        text: 'Never commit a credential, not even a revoked one',
        detection: 'automated',
      },
    ],
  },
  {
    id: 's-deps',
    name: 'dependency-upgrade-gate',
    type: 'standard',
    version: 3,
    updatedLabel: '1 week ago',
    author: 'Salima N.',
    summary: 'What a dependency bump needs before it can merge.',
    prose: `A minor bump needs a green pipeline. A major needs a changelog read and a named
owner for the migration.`,
    rules: [
      {
        id: 's3',
        text: 'A major version bump names an owner in the pull request',
        detection: 'manual',
      },
    ],
  },
  {
    id: 's-scan',
    name: 'scan-for-leaked-secrets',
    type: 'command',
    version: 6,
    updatedLabel: '5 days ago',
    author: 'Tomas R.',
    summary: 'Sweeps history and the working tree for credentials.',
    prose: `Scan the working tree first, then the reachable history. Report the commit that
introduced each finding, not only the file it survives in.`,
  },
  {
    id: 's-threat',
    name: 'threat-model-a-feature',
    type: 'skill',
    version: 2,
    updatedLabel: '3 weeks ago',
    author: 'Jun P.',
    summary: 'Walks a feature through trust boundaries and abuse cases.',
    prose: `Name the assets first, then who can reach them. An abuse case is a user story
written by someone who wants the data.`,
    frontmatter: [
      { label: 'name', value: 'threat-model-a-feature' },
      {
        label: 'description',
        value: 'Walk a feature through its trust boundaries and abuse cases',
      },
      { label: 'allowed-tools', value: 'Read, Grep, Glob' },
    ],
    files: [
      { path: 'SKILL.md', size: '6.1 kB' },
      { path: 'references/abuse-case-template.md', size: '1.3 kB' },
    ],
  },
];

const pluginComponentsObservability = (): Component[] => [
  {
    id: 'b-alerts',
    name: 'alert-threshold-policy',
    type: 'standard',
    version: 5,
    updatedLabel: '2 weeks ago',
    author: 'Tomas R.',
    summary: 'An alert that nobody acts on gets deleted, not tuned.',
    prose: `Every alert names the person who acts on it and the first thing they should do.
An alert without a runbook link is noise with a pager attached.`,
    rules: [
      {
        id: 'b1',
        text: 'Every alert links to the runbook for its first response',
        detection: 'manual',
      },
    ],
  },
  {
    id: 'b-postmortem',
    name: 'write-postmortem',
    type: 'command',
    version: 4,
    updatedLabel: '1 month ago',
    author: 'Salima N.',
    summary: 'Timeline, contributing factors, and what changes.',
    prose: `Build the timeline from the logs before writing a word of narrative. Contributing
factors are plural and none of them is a person.`,
  },
  {
    id: 'b-incident',
    name: 'investigate-an-incident',
    type: 'skill',
    version: 7,
    updatedLabel: '6 days ago',
    author: 'Jun P.',
    summary: 'From the first alert to a stated cause, in order.',
    prose: `Stop the bleeding, then explain it. Capture what you saw before you change
anything, because the evidence disappears the moment you mitigate.`,
    frontmatter: [
      { label: 'name', value: 'investigate-an-incident' },
      {
        label: 'description',
        value: 'Triage, mitigate and explain a production incident',
      },
      { label: 'allowed-tools', value: 'Read, Grep, Bash(kubectl:*)' },
    ],
    files: [
      { path: 'SKILL.md', size: '7.8 kB' },
      { path: 'references/dashboards.md', size: '2.2 kB' },
      { path: 'references/severity-levels.md', size: '1.1 kB' },
    ],
  },
];

const pluginComponentsCicd = (): Component[] => [
  {
    id: 'c-pipeline',
    name: 'pipeline-template-rules',
    type: 'standard',
    version: 6,
    updatedLabel: '1 week ago',
    author: 'Salima N.',
    summary: 'Shared templates, pinned actions, no inline scripts.',
    prose: `Pipelines compose shared templates. An inline script longer than three lines
belongs in a checked-in file where it can be tested.`,
    rules: [
      {
        id: 'c1',
        text: 'Pin every third-party action to a commit, never to a tag',
        detection: 'automated',
      },
    ],
  },
  {
    id: 'c-release',
    name: 'cut-a-release',
    type: 'command',
    version: 11,
    updatedLabel: '2 days ago',
    author: 'Tomas R.',
    summary: 'Version, changelog, tag, and the smoke check after.',
    prose: `Read the commits since the last tag to decide the bump, never the other way
round. The smoke check runs against the deployed component, not the branch.`,
  },
  {
    id: 'c-redci',
    name: 'block-merge-on-red-ci',
    type: 'hook',
    version: 2,
    updatedLabel: '4 days ago',
    author: 'Jun P.',
    summary: 'Refuses a merge while the pipeline is failing.',
    config: [
      {
        label: 'Event',
        value: 'PreToolUse',
        kind: 'choice',
        hint: 'Runs before the agent uses a tool',
      },
      {
        label: 'Matcher',
        value: 'Bash(gh pr merge:*)',
        kind: 'text',
        hint: 'Leave empty to match every tool call',
      },
      {
        label: 'Command',
        value:
          'sh "${CLAUDE_PROJECT_DIR}/.packmind/hooks/ci-green.sh" || exit 2',
        kind: 'code',
      },
      { label: 'Timeout', value: '10s', kind: 'text' },
    ],
  },
];

const pluginComponentsData = (): Component[] => [
  {
    id: 'd-schema',
    name: 'schema-change-policy',
    type: 'standard',
    version: 9,
    updatedLabel: '3 days ago',
    author: 'Salima N.',
    summary: 'Expand, migrate, contract. Never all three in one release.',
    prose: `Add the new shape, move the readers, then remove the old one. Three releases,
because a rollback has to land on a schema that still works.`,
    rules: [
      {
        id: 'd1',
        text: 'Never drop a column in the same release that stops writing it',
        detection: 'manual',
      },
      {
        id: 'd2',
        text: 'Every migration runs down cleanly against a copy of staging',
        detection: 'automated',
      },
    ],
  },
];

// ── Distributions ────────────────────────────────────────────────────────────
// A plugin's reach and its health both come from this one list. The rail, the
// plugin header and the distribution view read it, so none of them can state a
// number the others contradict.

const REPOSITORIES: Array<{
  name: string;
  branch: string;
  directory?: string;
}> = [
  { name: 'acme/payments-api', branch: 'main' },
  { name: 'acme/billing-worker', branch: 'main' },
  { name: 'acme/identity-service', branch: 'develop' },
  {
    name: 'acme/notifications-gateway',
    branch: 'main',
    directory: 'services/notifications',
  },
  { name: 'acme/search-indexer', branch: 'main' },
  { name: 'acme/checkout-web', branch: 'release/2026.3' },
  { name: 'acme/inventory-service', branch: 'main' },
  { name: 'acme/pricing-engine', branch: 'main' },
  { name: 'acme/customer-portal', branch: 'main', directory: 'apps/portal' },
  { name: 'acme/data-platform', branch: 'main' },
  { name: 'acme/legacy-monolith', branch: 'master' },
  { name: 'acme/mobile-backend', branch: 'main' },
  { name: 'acme/reporting-api', branch: 'main' },
  { name: 'acme/webhooks-relay', branch: 'main' },
  { name: 'contoso/partner-api', branch: 'main' },
  { name: 'contoso/edge-functions', branch: 'main' },
];

const ALIGNED_AGES = [
  '2 days ago',
  '6 days ago',
  '3 hours ago',
  '9 days ago',
  'last month',
];

/** `null` means the target was configured but never reached. */
const DRIFT_AGES: Array<string | null> = [
  '3 weeks ago',
  '2 months ago',
  null,
  '5 weeks ago',
];

/**
 * Packmind writes to a repository, the CLI pulls from it, and the two are not
 * the same event. Seen from a plugin the mode is a section header far from the
 * date, but seen from a destination the two sit on the same row, where "CLI
 * install, last pushed 3 weeks ago" contradicts itself.
 */
export function distributionVerb(mode: DistributionMode): string {
  return mode === 'cli-install' ? 'installed' : 'pushed';
}

type DistributionSpec = {
  /** Where to start in the repository pool, so plugins do not all read alike. */
  offset: number;
  gitPush: number;
  cliInstall: number;
  marketplaces?: Array<{
    name: string;
    slug: string;
    version: string;
    behind?: boolean;
  }>;
  /** Positions in the git list that are behind the plugin. */
  drifted?: number[];
  /** Positions whose last attempt failed. */
  failed?: number[];
  /** Positions that cannot be redistributed right now. */
  locked?: number[];
};

function buildDistributions(
  pluginId: string,
  components: Component[],
  spec: DistributionSpec,
): DistributionTarget[] {
  const drifted = new Set(spec.drifted ?? []);
  const failed = new Set(spec.failed ?? []);
  const locked = new Set(spec.locked ?? []);
  const names = components.map((component) => component.name);
  const targets: DistributionTarget[] = [];

  for (let index = 0; index < spec.gitPush + spec.cliInstall; index += 1) {
    const repo = REPOSITORIES[(spec.offset + index) % REPOSITORIES.length];
    const isFailed = failed.has(index);
    const isBehind = isFailed || drifted.has(index);
    const mode = index < spec.gitPush ? 'git-push' : 'cli-install';
    const driftAge = DRIFT_AGES[index % DRIFT_AGES.length];
    targets.push({
      id: `${pluginId}-d${index}`,
      mode,
      name: repo.name,
      branch: repo.branch,
      directory: repo.directory,
      state: isFailed ? 'failed' : isBehind ? 'drift' : 'aligned',
      lastEvent: isBehind
        ? isFailed
          ? 'failed 4 hours ago'
          : driftAge === null
            ? 'never distributed'
            : `last ${distributionVerb(mode)} ${driftAge}`
        : `${distributionVerb(mode)} ${ALIGNED_AGES[index % ALIGNED_AGES.length]}`,
      behind: isBehind ? names.slice(0, 1 + (index % 3)) : [],
      lockedReason: locked.has(index)
        ? 'A distribution is already running on this target.'
        : undefined,
      error: isFailed
        ? 'Push rejected: the branch is protected and Packmind has no write access.'
        : undefined,
    });
  }

  // A marketplace can only fall behind on what it would carry. Drifting on a
  // standard would be a drift that no redistribution could ever resolve.
  const carried = marketplaceCarried(components).map(
    (component) => component.name,
  );

  for (const [index, marketplace] of (spec.marketplaces ?? []).entries()) {
    const behind = marketplace.behind ? carried.slice(0, 2) : [];
    targets.push({
      id: `${pluginId}-m${index}`,
      mode: 'marketplace',
      name: marketplace.name,
      slug: marketplace.slug,
      version: marketplace.version,
      state: behind.length > 0 ? 'drift' : 'aligned',
      lastEvent:
        behind.length > 0
          ? `still on v${marketplace.version}`
          : `published as v${marketplace.version}`,
      behind,
    });
  }

  return targets;
}

// ── Plugins ─────────────────────────────────────────────────────────────────

function makePlugin(
  plugin: Omit<PluginSummary, 'distributions'>,
  spec: DistributionSpec,
): PluginSummary {
  return {
    ...plugin,
    distributions: buildDistributions(plugin.id, plugin.components, spec),
  };
}

const DEFAULT_PLUGINS: PluginSummary[] = [
  makePlugin(
    {
      id: 'p-backend',
      name: 'backend-standards',
      description:
        'Architecture, error handling and logging rules for every Node service.',
      components: pluginComponentsBackend(),
    },
    {
      offset: 0,
      gitPush: 6,
      cliInstall: 3,
      marketplaces: [
        {
          name: 'acme-marketplace',
          slug: 'backend-standards',
          version: '4.2.0',
        },
        { name: 'packmind-hub', slug: 'acme-backend', version: '4.2.0' },
      ],
    },
  ),
  makePlugin(
    {
      id: 'p-testing',
      name: 'testing-playbook',
      description:
        'How this org writes unit, integration and end-to-end tests.',
      components: pluginComponentsTesting(),
    },
    {
      offset: 3,
      gitPush: 8,
      cliInstall: 4,
      drifted: [0, 2, 5, 9, 11],
      locked: [5],
      marketplaces: [
        {
          name: 'acme-marketplace',
          slug: 'testing-playbook',
          version: '2.1.0',
          behind: true,
        },
      ],
    },
  ),
  makePlugin(
    {
      id: 'p-onboarding',
      name: 'onboarding-kit',
      description: 'What a new joiner needs in their first week.',
      components: pluginComponentsOnboarding(),
    },
    { offset: 0, gitPush: 0, cliInstall: 0 },
  ),
  makePlugin(
    {
      id: 'p-api',
      name: 'api-conventions',
      description: 'REST shape, pagination, error envelopes and versioning.',
      components: pluginComponentsApi(),
    },
    { offset: 9, gitPush: 4, cliInstall: 2, drifted: [1, 3], failed: [4] },
  ),
  makePlugin(
    {
      id: 'p-security',
      name: 'security-baseline',
      description: 'Secrets handling, dependency policy and the review gate.',
      components: pluginComponentsSecurity(),
    },
    {
      offset: 2,
      gitPush: 9,
      cliInstall: 5,
      marketplaces: [
        {
          name: 'acme-marketplace',
          slug: 'security-baseline',
          version: '1.9.3',
        },
      ],
    },
  ),
  makePlugin(
    {
      id: 'p-observability',
      name: 'observability-and-incident-response-runbooks',
      description:
        'Dashboards, alert thresholds, on-call rotation and the postmortem template used across every backend service in the organisation.',
      components: pluginComponentsObservability(),
    },
    { offset: 5, gitPush: 5, cliInstall: 2 },
  ),
  makePlugin(
    {
      id: 'p-cicd',
      name: 'ci-cd-toolkit',
      description: 'Pipeline templates and the release checklist.',
      components: pluginComponentsCicd(),
    },
    { offset: 11, gitPush: 3, cliInstall: 1 },
  ),
  makePlugin(
    {
      id: 'p-data',
      name: 'data-migrations',
      description: 'Schema change policy for the shared Postgres cluster.',
      components: pluginComponentsData(),
    },
    { offset: 13, gitPush: 1, cliInstall: 0 },
  ),
];

const STARTER_PLUGINS: PluginSummary[] = [
  makePlugin(
    {
      id: 'p-first',
      name: 'backend-standards',
      description: 'First plugin, created from the CLI onboarding.',
      components: pluginComponentsBackend().slice(0, 3),
    },
    { offset: 0, gitPush: 0, cliInstall: 1, drifted: [0] },
  ),
];

const SCALE_EXTRA_NAMES = [
  'graphql-conventions',
  'kafka-event-contracts',
  'terraform-modules-policy',
  'react-component-rules',
  'design-tokens-usage',
  'accessibility-baseline',
  'i18n-and-copy-rules',
  'mobile-release-checklist',
  'python-data-pipelines',
  'ml-model-cards',
  'sql-review-gate',
  'grpc-service-contracts',
  'feature-flag-hygiene',
  'dependency-upgrade-policy',
  'incident-comms-templates',
  'legacy-monolith-carve-out-and-strangler-migration-runbook',
  'contract-testing-with-pact',
];

function buildScalePlugins(): PluginSummary[] {
  const base = DEFAULT_PLUGINS;
  const extras: PluginSummary[] = SCALE_EXTRA_NAMES.map((name, index) => {
    const pool = [
      pluginComponentsBackend(),
      pluginComponentsTesting(),
      pluginComponentsOnboarding(),
    ][index % 3];
    const take = 2 + (index % 5);
    const rankInType = new Map<string, number>();
    const gitPush = 1 + ((index * 3) % 11);
    return makePlugin(
      {
        id: `p-scale-${index}`,
        name,
        description:
          'Migrated from a shared plugin during the exclusivity switch.',
        // Name as well as id, otherwise the same component would read as living
        // in several plugins at once, which this model forbids.
        components: pool.slice(0, take).map((component, componentIndex) => {
          const rank = (rankInType.get(component.type) ?? 0) + 1;
          rankInType.set(component.type, rank);
          return {
            ...component,
            id: `${component.id}-s${index}-${componentIndex}`,
            name: `${name}-${component.type}-${rank}`,
          };
        }),
      },
      {
        offset: index,
        gitPush,
        cliInstall: index % 3,
        drifted: index % 4 === 0 ? [0, Math.min(2, gitPush - 1)] : [],
        marketplaces:
          index % 5 === 0
            ? [
                {
                  name: 'acme-marketplace',
                  slug: name,
                  version: `1.${index}.0`,
                },
              ]
            : [],
      },
    );
  });
  return [...base, ...extras];
}

export function pluginsForScenario(scenario: Scenario): PluginSummary[] {
  switch (scenario) {
    case 'starter':
      return STARTER_PLUGINS;
    case 'scale':
      return buildScalePlugins();
    case 'empty':
      return [];
    default:
      return DEFAULT_PLUGINS;
  }
}

/**
 * Components of types that are not yet live are hidden on the "today" horizon,
 * so switching the horizon changes the content of a plugin without touching
 * any navigation code.
 */
export function visibleComponents(
  plugin: PluginSummary,
  horizon: TypeHorizon,
): Component[] {
  const allowed = new Set(typesForHorizon(horizon).map((t) => t.type));
  return plugin.components.filter((a) => allowed.has(a.type));
}

/**
 * One plugin the search kept, and the components inside it that the query hit.
 * The two are separate because they answer different questions: the plugin says
 * "here is where to go", the components say "here is why this row is in front of
 * you". A row with an empty `components` matched on its own name.
 */
export type PluginMatch = {
  plugin: PluginSummary;
  components: Component[];
};

/**
 * The rail lists plugins, but nobody looks for a container. They look for the
 * standard they wrote last week and do not remember which plugin holds it. So
 * the query runs against both levels and the result stays a plugin, since that
 * is what the rail can select. What matched inside is handed back rather than
 * folded away, otherwise a row appears for a reason the user cannot see.
 */
export function searchPlugins(
  plugins: PluginSummary[],
  horizon: TypeHorizon,
  query: string,
): PluginMatch[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return plugins.map((plugin) => ({ plugin, components: [] }));

  const matches: PluginMatch[] = [];
  for (const plugin of plugins) {
    const components = visibleComponents(plugin, horizon).filter(
      (component) =>
        component.name.toLowerCase().includes(needle) ||
        component.summary.toLowerCase().includes(needle),
    );
    const pluginMatched =
      plugin.name.toLowerCase().includes(needle) ||
      plugin.description.toLowerCase().includes(needle);

    if (pluginMatched || components.length > 0) {
      matches.push({ plugin, components });
    }
  }
  return matches;
}

export function countByType(components: Component[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const component of components) {
    counts.set(component.type, (counts.get(component.type) ?? 0) + 1);
  }
  return counts;
}

/**
 * A marketplace is the one mode that does not carry the whole plugin: a
 * standard has no place in a marketplace listing, it belongs to the repository
 * that gets checked out. Everything the interface says about a marketplace goes
 * through this filter, so it can never claim to carry what it cannot.
 */
export function marketplaceCarried(components: Component[]): Component[] {
  return components.filter((a) => descriptorFor(a.type).marketplaceRenderable);
}

/**
 * Replaces `isPackagePublishableAsPlugin`, which today hardcodes
 * `skills || recipes`. Driven by the registry instead.
 */
export function isPublishableToMarketplace(components: Component[]): boolean {
  return marketplaceCarried(components).length > 0;
}

export type DistributionSummary = {
  total: number;
  repositories: number;
  marketplaces: number;
  drifted: number;
  failed: number;
  /** Drifted plus failed: everything a redistribution would fix. */
  behind: number;
};

/**
 * Every number the interface states about distribution is computed here, from
 * the one list. Nothing counts distributions on its own.
 */
export function distributionSummary(
  plugin: PluginSummary,
): DistributionSummary {
  const drifted = plugin.distributions.filter(
    (d) => d.state === 'drift',
  ).length;
  const failed = plugin.distributions.filter(
    (d) => d.state === 'failed',
  ).length;
  return {
    total: plugin.distributions.length,
    repositories: plugin.distributions.filter((d) => d.mode !== 'marketplace')
      .length,
    marketplaces: plugin.distributions.filter((d) => d.mode === 'marketplace')
      .length,
    drifted,
    failed,
    behind: drifted + failed,
  };
}

// ── Destinations ────────────────────────────────────────────────────────────
// The inverse index. `plugin.distributions` answers "where does this plugin
// go"; a destination answers "what lands here". Same edges, read from the other
// end, which is why this is derived on every render rather than stored: two
// lists of the same facts drift apart, and the whole argument for a second
// navigation entry is that it is the same graph, not a second one.

/** One plugin landing on one destination, and the state of that landing. */
export type DestinationLink = {
  target: DistributionTarget;
  plugin: PluginSummary;
};

export type Destination = {
  id: string;
  kind: 'repository' | 'marketplace';
  /** `owner/repo`, or the marketplace name. */
  name: string;
  /**
   * Repository only, and part of the identity rather than decoration: the same
   * repository on two branches is two destinations, because a distribution
   * writes to one of them and not to the other.
   */
  branch?: string;
  directory?: string;
  links: DestinationLink[];
  drifted: number;
  failed: number;
  /** Drifted plus failed: everything one redistribution would fix. */
  behind: number;
};

function destinationKey(target: DistributionTarget): string {
  /*
   * A marketplace stays one destination whatever slug each plugin is published
   * under: the slug and the version describe the publication, not the catalog.
   * They travel on the link instead.
   */
  return target.mode === 'marketplace'
    ? `m:${target.name}`
    : `r:${target.name}@${target.branch ?? ''}:${target.directory ?? ''}`;
}

export function destinationsFor(plugins: PluginSummary[]): Destination[] {
  const byKey = new Map<string, Destination>();

  for (const plugin of plugins) {
    for (const target of plugin.distributions) {
      const id = destinationKey(target);
      let destination = byKey.get(id);
      if (!destination) {
        destination = {
          id,
          kind: target.mode === 'marketplace' ? 'marketplace' : 'repository',
          name: target.name,
          branch: target.branch,
          directory: target.directory,
          links: [],
          drifted: 0,
          failed: 0,
          behind: 0,
        };
        byKey.set(id, destination);
      }
      destination.links.push({ target, plugin });
      if (target.state === 'drift') destination.drifted += 1;
      if (target.state === 'failed') destination.failed += 1;
      destination.behind = destination.drifted + destination.failed;
    }
  }

  /*
   * Ordered by what needs work. The plugin rail is entered to find something
   * the user already has in mind and keeps a stable order; this one is entered
   * because something is wrong somewhere, and the user does not know where.
   */
  return Array.from(byKey.values()).sort(
    (a, b) =>
      b.failed - a.failed ||
      b.behind - a.behind ||
      a.name.localeCompare(b.name),
  );
}

/**
 * One destination the search kept, and the plugins landing there that the query
 * hit. Same contract as `PluginMatch`, for the same reason: a row has to be
 * able to say why it is in front of the user.
 */
export type DestinationMatch = {
  destination: Destination;
  plugins: PluginSummary[];
};

export function searchDestinations(
  destinations: Destination[],
  query: string,
): DestinationMatch[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return destinations.map((destination) => ({ destination, plugins: [] }));
  }

  const matches: DestinationMatch[] = [];
  for (const destination of destinations) {
    // Nobody remembers a branch name but everybody remembers what they shipped,
    // so a plugin name finds the repositories it landed in.
    const plugins = destination.links
      .filter((link) => link.plugin.name.toLowerCase().includes(needle))
      .map((link) => link.plugin);
    const destinationMatched =
      `${destination.name} ${destination.branch ?? ''} ${destination.directory ?? ''}`
        .toLowerCase()
        .includes(needle);

    if (destinationMatched || plugins.length > 0) {
      matches.push({ destination, plugins });
    }
  }
  return matches;
}

export type ReachSummary = {
  destinations: number;
  repositories: number;
  marketplaces: number;
  /** Destinations carrying at least one plugin that is behind. */
  needingWork: number;
  /** Landings, not destinations: one repository can hold several. */
  behind: number;
  failed: number;
};

/**
 * The space-level counterpart of `distributionSummary`. The sidebar badge, the
 * surface header and the bulk action all read it, so the badge can never
 * promise work that the list does not contain.
 */
export function reachSummary(destinations: Destination[]): ReachSummary {
  return {
    destinations: destinations.length,
    repositories: destinations.filter((d) => d.kind === 'repository').length,
    marketplaces: destinations.filter((d) => d.kind === 'marketplace').length,
    needingWork: destinations.filter((d) => d.behind > 0).length,
    behind: destinations.reduce((total, d) => total + d.behind, 0),
    failed: destinations.reduce((total, d) => total + d.failed, 0),
  };
}

/**
 * Every landing one bulk repair would act on. Locked ones are left out: they
 * are behind, and they are counted as behind, but another run already holds
 * them and offering to fix them would promise something that will not happen.
 */
export function behindTargetIds(destinations: Destination[]): string[] {
  return destinations.flatMap((destination) =>
    destination.links
      .filter(
        (link) => link.target.state !== 'aligned' && !link.target.lockedReason,
      )
      .map((link) => link.target.id),
  );
}

/**
 * How many landings a repair would actually move here. This is what gates the
 * bulk checkbox, so a destination can never be picked for an action that would
 * do nothing to it.
 */
export function actionableBehind(destination: Destination): number {
  return destination.links.filter(
    (link) => link.target.state !== 'aligned' && !link.target.lockedReason,
  ).length;
}

export const DISTRIBUTION_MODES: Array<{
  mode: DistributionTarget['mode'];
  title: string;
  description: string;
}> = [
  {
    mode: 'git-push',
    title: 'Git push',
    description: 'Packmind commits directly on the configured branch.',
  },
  {
    mode: 'cli-install',
    title: 'CLI install',
    description: 'Updated by running packmind-cli install from the repository.',
  },
  {
    mode: 'marketplace',
    title: 'Marketplace',
    description: 'Published to a catalog, installable by anyone with access.',
  },
];

export const SPACES = [
  { id: 'backend', name: 'Backend guild', color: '#f472b6' },
  { id: 'frontend', name: 'Frontend team', color: '#34d399' },
  { id: 'platform', name: 'Platform', color: '#a78bfa' },
  { id: 'design', name: 'Design system', color: '#f9a8d4' },
];
