import type {
  Artifact,
  ArtifactKind,
  Installer,
  MarketplaceDetail,
  Space,
  Suggester,
  Suggestion,
} from './types';

const SPACES: Record<string, Space> = {
  frontendGuild: { id: 'frontend-guild', name: 'Frontend guild' },
  platform: { id: 'platform', name: 'Platform' },
  security: { id: 'security', name: 'Security' },
  designSystem: { id: 'design-system', name: 'Design system' },
  dataPlatform: { id: 'data-platform', name: 'Data platform' },
};

const INSTALLERS: Record<string, Installer> = {
  sara: { name: 'Sara Pham', initials: 'SP' },
  marc: { name: 'Marc Reed', initials: 'MR' },
  anil: { name: 'Anil Verma', initials: 'AV' },
  ines: { name: 'Ines Costa', initials: 'IC' },
  jonas: { name: 'Jonas Holm', initials: 'JH' },
  ravi: { name: 'Ravi Singh', initials: 'RS' },
  maya: { name: 'Maya Levin', initials: 'ML' },
  olu: { name: 'Olu Adebayo', initials: 'OA' },
  karim: { name: 'Karim Tahir', initials: 'KT' },
  lena: { name: 'Lena Brandt', initials: 'LB' },
};

type ArtifactEntry = readonly [name: string, summary: string];

type ArtifactLists = Partial<Record<ArtifactKind, ArtifactEntry[]>>;

function buildArtifacts(prefix: string, lists: ArtifactLists): Artifact[] {
  const kinds: ArtifactKind[] = [
    'command',
    'skill',
    'subagent',
    'hook',
    'mcp-server',
  ];
  const out: Artifact[] = [];
  for (const kind of kinds) {
    const entries = lists[kind] ?? [];
    entries.forEach(([name, summary], index) => {
      out.push({ id: `${prefix}-${kind}-${index}`, kind, name, summary });
    });
  }
  return out;
}

const REACT_ARTIFACTS = buildArtifacts('react', {
  command: [
    [
      '/scaffold-component',
      'Generate a typed component with the agreed file layout and a Storybook entry.',
    ],
    [
      '/review-component',
      'Run the agent over a component diff against the rules above.',
    ],
    [
      '/extract-hook',
      'Pull duplicated effect-and-state logic into a named custom hook.',
    ],
    [
      '/lift-state',
      'Move shared state up to the nearest common ancestor and remove prop drilling.',
    ],
    [
      '/memoize-pass',
      'Walk renders and suggest memo / useMemo / useCallback only where they pay off.',
    ],
    [
      '/a11y-check',
      'Run axe over a story and flag the rules the team treats as merge blockers.',
    ],
    [
      '/storybook-add',
      'Generate a colocated Storybook entry that covers the component variants.',
    ],
    [
      '/style-tokens',
      'Resolve hardcoded literals to design tokens from @packmind/ui.',
    ],
    [
      '/find-dead-props',
      'Scan the diff for props declared but never read in the component body.',
    ],
    [
      '/props-rename',
      'Safely rename a prop across all call sites with codemod and changelog entry.',
    ],
    ['/typecheck-component', 'Run tsc only over the file and its tree shake.'],
    [
      '/flag-classnames-soup',
      'Catch className strings with more than four utility tokens.',
    ],
  ],
  skill: [
    [
      'working-with-pm-design-kit',
      'Prefer PM* primitives from @packmind/ui before reaching for raw Chakra.',
    ],
    [
      'react-router-conventions',
      'Route layout, loaders, and the boundary between route data and component state.',
    ],
    [
      'hooks-discipline',
      'When to lift state, when to colocate, when useReducer earns its keep.',
    ],
    [
      'props-ergonomics',
      'Readonly props, discriminated unions over boolean flags, sane defaults.',
    ],
    [
      'suspense-boundaries',
      'Where Suspense lives, what falls back, and how to keep the fallback honest.',
    ],
    [
      'working-with-storybook',
      'One story per variant, the args contract, the play-function discipline.',
    ],
    [
      'controlled-vs-uncontrolled',
      'When to own input state, when to defer to the DOM, how to migrate between them.',
    ],
    [
      'jsx-keyboard-handlers',
      'onKeyDown vs onKeyUp, modifier handling, default-action discipline.',
    ],
    [
      'custom-hook-extraction',
      'The threshold at which inline logic earns its own named hook.',
    ],
    [
      'server-component-boundaries',
      'What stays server-only, what crosses the boundary, what the "use client" line costs.',
    ],
    [
      'theme-token-resolution',
      'How tokens resolve at runtime and the surfaces that bypass the resolver.',
    ],
  ],
  subagent: [
    [
      'component-diff-reviewer',
      'Reads a component diff and flags violations of the agreed rules.',
    ],
    [
      'accessibility-auditor',
      'Walks a story tree and reports axe failures the team treats as merge blockers.',
    ],
    [
      'hook-extractor',
      'Spots duplicated state-and-effect patterns and proposes a named hook.',
    ],
    [
      'props-renamer',
      'Renames a prop across call sites with codemod, changelog, and breaking-change note.',
    ],
    [
      'dead-prop-finder',
      'Reports props declared in the type but never read in the component body.',
    ],
    [
      'storybook-coverage-checker',
      'Maps components to stories and surfaces variants that are not covered.',
    ],
    [
      'render-perf-analyzer',
      'Annotates a render trace with the components whose memo budget is overrun.',
    ],
    [
      'snapshot-stabilizer',
      'Walks failing snapshots and proposes the smallest stable replacement.',
    ],
  ],
  hook: [
    [
      'PreToolUse · *.tsx',
      'Block writes that put a component outside the agreed file layout.',
    ],
    [
      'PostToolUse · *.tsx',
      'Generate a colocated story for any newly added component.',
    ],
    [
      'PreToolUse · package.json',
      'Refuse a dependency add that overlaps with @packmind/ui without a comment.',
    ],
    [
      'PostToolUse · *.test.tsx',
      'Run the edited test file immediately so a regression never reaches review.',
    ],
    [
      'SessionStart · web-portal',
      'Load the playbook context and the latest design tokens for the session.',
    ],
    [
      'PreToolUse · *.css',
      'Refuse hardcoded hex colors and ask the agent to resolve a token instead.',
    ],
    [
      'PreToolUse · *.stories.tsx',
      'Enforce the args contract on every story before the file is written.',
    ],
    [
      'PostToolUse · *.tsx',
      'Validate that imported tokens still resolve against the live token map.',
    ],
    [
      'PostToolUse · *.spec.tsx',
      'Run the spec for the component the edited test targets.',
    ],
    [
      'PreCompact · component-context',
      'Preserve the component-tree map across the compact step.',
    ],
    [
      'SessionEnd · adoption-report',
      'Emit a one-line summary of the artifacts touched this session.',
    ],
    [
      'PreToolUse · index.ts',
      'Block edits to barrel files outside the agreed export contract.',
    ],
  ],
  'mcp-server': [
    [
      'storybook-internal',
      'Live access to the internal Storybook for variant lookup and play-function inspection.',
    ],
    [
      'figma-design-system',
      'Pull the live token and component metadata from the Design system Figma library.',
    ],
    [
      'npm-registry-internal',
      'Resolve the internal npm registry for @packmind/* and other private packages.',
    ],
    [
      'vercel-deployments',
      'Read deployment metadata for the customer-facing apps from Vercel.',
    ],
    [
      'sentry-frontend',
      'Look up recent frontend errors scoped to the apps the plugin covers.',
    ],
    [
      'posthog-events',
      'Read product analytics events to verify a component is firing the expected payload.',
    ],
    [
      'github-frontend-org',
      'Scoped read-only access to the frontend org repos for PR and review lookups.',
    ],
  ],
});

const SECURITY_ARTIFACTS = buildArtifacts('security', {
  command: [
    [
      '/audit-secrets',
      'Scan the diff for hardcoded credentials before opening a PR.',
    ],
    [
      '/scan-pii-logs',
      'Walk added log statements for unmasked emails, phone numbers, and identifiers.',
    ],
    [
      '/lint-input-validation',
      'Confirm every HTTP and queue boundary validates payloads at the edge.',
    ],
    [
      '/trace-token-paths',
      'Show every code path a session token traverses, end to end.',
    ],
    [
      '/find-eval-usage',
      'Surface every eval / new Function / setTimeout-with-string call.',
    ],
    [
      '/find-prototype-pollution',
      'Report property assignments that look like prototype-pollution vectors.',
    ],
    [
      '/find-unsafe-redirects',
      'Flag redirects whose target is derived from user input without an allowlist.',
    ],
    [
      '/audit-deps',
      'Compare the lockfile against the agreed security advisory feed.',
    ],
    [
      '/sbom-export',
      'Emit a CycloneDX SBOM for the affected services in the diff.',
    ],
    [
      '/diff-permissions',
      'Render the permission delta between the current branch and main.',
    ],
  ],
  skill: [
    [
      'secrets-retrieval',
      'Always go through Configuration.getConfig(). Never read process.env in feature code.',
    ],
    [
      'personal-data-masking',
      'Mask emails, phone numbers, IPs, and identifiers before logging.',
    ],
    [
      'input-validation-boundaries',
      'Validate at the system edge (HTTP, queue consumers). Trust internal callers.',
    ],
    [
      'jwt-rotation',
      'Rotate signing keys without invalidating live sessions; the boundary cases.',
    ],
    [
      'csrf-double-submit',
      'The double-submit cookie pattern and the cases where SameSite alone is not enough.',
    ],
    [
      'csp-hardening',
      'Build a strict CSP that ships with nonces and not unsafe-inline.',
    ],
    [
      'oauth-scope-discipline',
      'The smallest scope rule and the patterns that drift away from it.',
    ],
    [
      'sql-injection-defense',
      'Parameterized queries, the linter rules, the patterns that bypass them.',
    ],
    [
      'rate-limit-pattern',
      'Token-bucket sizing, the boundary between per-user and per-IP, the audit trail.',
    ],
    [
      'audit-log-format',
      'The canonical audit event shape and the fields legal requires us to keep.',
    ],
  ],
  subagent: [
    [
      'secret-scanner',
      'Reads a diff for credentials, tokens, and unmasked PII before review.',
    ],
    [
      'pii-log-reviewer',
      'Walks log statements added in the diff and reports unmasked personal data.',
    ],
    [
      'dependency-cve-explorer',
      'Cross-references dep changes with the agreed advisory feed and explains exposure.',
    ],
    [
      'permission-diff-explainer',
      'Renders the human-readable delta between the old and new permission set.',
    ],
    [
      'auth-flow-walker',
      'Walks an OAuth or session flow and flags steps that bypass the agreed checks.',
    ],
    [
      'encryption-at-rest-verifier',
      'Confirms that fields tagged sensitive land in the encrypted columns.',
    ],
    [
      'ssrf-pattern-detector',
      'Flags outbound fetches whose host is user-derived without an allowlist.',
    ],
    [
      'csrf-coverage-mapper',
      'Maps state-changing endpoints to their CSRF defense and reports gaps.',
    ],
  ],
  hook: [
    [
      'PreToolUse · Write,Edit',
      'Block edits that introduce console.log of an email, phone number, or token.',
    ],
    [
      'PreToolUse · npm,pnpm',
      'Refuse a dependency add that is on the security advisory feed.',
    ],
    [
      'PreToolUse · .env',
      'Block writes to .env files that are not gated by the configured secrets manager.',
    ],
    [
      'PostToolUse · *.log',
      'Scan emitted log lines for unmasked identifiers and report on session end.',
    ],
    [
      'PreCommit · *',
      'Refuse a commit whose diff matches the agreed secret-scanning pattern set.',
    ],
    [
      'PreToolUse · *.yml',
      'Block infra changes that loosen IAM scopes without the change-control note.',
    ],
    [
      'SessionStart · audit',
      'Load the current advisory feed and the in-flight incidents into the session.',
    ],
    [
      'PreToolUse · curl',
      'Refuse outbound fetches whose target is not on the allowlist.',
    ],
    [
      'PreToolUse · ssh',
      'Block ssh invocations whose key path is not the agreed managed-key location.',
    ],
    [
      'PostToolUse · CHANGELOG.md',
      'Validate that a security-impacting change is annotated with the right tag.',
    ],
  ],
  'mcp-server': [
    [
      'vault-readonly',
      'Read-only Vault access scoped to the secrets the Security guild expects to be referenced.',
    ],
    [
      'snyk-internal',
      'Cross-reference dep changes with the internal Snyk policy and advisory feed.',
    ],
    [
      'datadog-security',
      'Live access to the security signals stream for triage during a review.',
    ],
    [
      'github-security-org',
      'Scoped access to the security org for advisory and incident lookups.',
    ],
    [
      'dependabot',
      'Read open advisories and the suggested upgrade path for each affected repo.',
    ],
    [
      'semgrep-internal',
      'Run the internal Semgrep rule set against the staged diff on demand.',
    ],
    [
      'owasp-zap-internal',
      'Trigger an internal ZAP scan against a preview deployment.',
    ],
    [
      'splunk-audit',
      'Query the canonical audit log for events tied to a session or actor.',
    ],
    [
      'okta-introspect',
      'Introspect a token against the IdP to confirm scope and expiry.',
    ],
    [
      'aws-iam-readonly',
      'Read-only AWS IAM for confirming the role and policy shape behind an action.',
    ],
  ],
});

const TYPESCRIPT_ARTIFACTS = buildArtifacts('ts', {
  command: [
    [
      '/typecheck-affected',
      'Run tsc only on the affected projects in the Nx graph.',
    ],
    [
      '/narrow-types',
      'Walk the diff and propose type narrowings in place of runtime guards.',
    ],
    [
      '/audit-any',
      'Report every explicit any added in the diff with the source location.',
    ],
    [
      '/audit-non-null',
      'Surface the non-null-assertion uses added and propose alternatives.',
    ],
    [
      '/report-coverage',
      'Run type-coverage and surface files below the agreed threshold.',
    ],
    [
      '/report-errors',
      'Aggregate tsc errors across the affected projects into a single report.',
    ],
    [
      '/find-implicit-any',
      'Flag positions where the inferred type collapsed to any.',
    ],
    [
      '/lint-naming',
      'Walk the diff for naming-convention drift against the agreed casing rules.',
    ],
  ],
  skill: [
    [
      'strict-null-handling',
      'strictNullChecks on. Prefer narrow types over runtime guards.',
    ],
    [
      'error-classes',
      'Extend Error directly. Do not use Object.setPrototypeOf in custom errors.',
    ],
    [
      'presentation-dtos',
      'Use DomainType & { extraField } intersection, not field re-declaration.',
    ],
    [
      'intersection-vs-rewriting',
      'When to compose with & vs rewriting a type from scratch.',
    ],
    [
      'branded-types',
      'Brand identifiers with a nominal tag so they stop being assignable to plain strings.',
    ],
    [
      'discriminated-unions',
      'Prefer the discriminant-tag pattern over boolean flags or optional fields.',
    ],
    [
      'exhaustive-switch',
      'The never-default pattern and the cases it catches at compile time.',
    ],
    [
      'satisfies-operator',
      'Use satisfies for config objects so widening does not strip literal types.',
    ],
    [
      'const-assertions',
      'When `as const` earns its keep and where it just adds noise.',
    ],
    [
      'type-only-imports',
      'import type for type references so the runtime bundle stays clean.',
    ],
  ],
  subagent: [
    [
      'type-narrowing-helper',
      'Suggests type narrowings in place of runtime guards on a diff.',
    ],
    [
      'dto-drift-checker',
      'Compares presentation DTOs to their domain counterparts and reports drift.',
    ],
    [
      'any-eliminator',
      'Walks the diff and proposes named types for every added any.',
    ],
    [
      'error-class-refactorer',
      'Refactors custom errors to extend Error directly without the prototype dance.',
    ],
    [
      'generic-constraint-explainer',
      'Explains a generic constraint failure in language a senior reviewer expects.',
    ],
    [
      'declaration-merger',
      'Walks ambient declarations and proposes safe merges where the team allows them.',
    ],
    [
      'unused-export-finder',
      'Surfaces exports that are declared but never imported anywhere in the graph.',
    ],
    [
      'type-coverage-reporter',
      'Renders the type-coverage delta for the diff and flags files below threshold.',
    ],
  ],
  hook: [
    [
      'PostToolUse · *.ts',
      'Trigger tsc on the affected Nx projects after an edit so type errors surface in the same turn.',
    ],
    ['PostToolUse · *.tsx', 'Same as above scoped to the React tree.'],
    [
      'PreToolUse · tsconfig.json',
      'Block changes to tsconfig that loosen strictness without the agreed comment.',
    ],
    [
      'PreCommit · *.ts',
      'Refuse a commit whose diff drops type-coverage below the agreed threshold.',
    ],
    [
      'SessionStart · ts-project',
      'Load the project graph and the current tsc error budget into the session.',
    ],
    [
      'PreCompact · type-context',
      'Preserve the symbol map across the compact step.',
    ],
    [
      'PreToolUse · package.json',
      'Refuse a typescript-version bump without the migration note.',
    ],
    [
      'PostToolUse · .d.ts',
      'Validate that generated declarations match the source on every change.',
    ],
  ],
  'mcp-server': [
    [
      'typescript-lang-server',
      'Live tsserver bridge for hover, find-references, and rename across the workspace.',
    ],
    [
      'tsd-internal',
      'Run tsd assertion suites against the staged diff on demand.',
    ],
    [
      'eslint-internal',
      'Internal ESLint config service that resolves the active rule set per file.',
    ],
    [
      'type-coverage-internal',
      'Internal type-coverage report service for delta queries.',
    ],
    [
      'github-typescript-org',
      'Scoped read access to the TypeScript-flavored repos for PR lookups.',
    ],
    [
      'npm-types-registry',
      'Resolve @types/* and DefinitelyTyped entries against the agreed feed.',
    ],
    [
      'vscode-tsserver-bridge',
      'Bridge to the editor tsserver for live edits and hover lookups.',
    ],
    [
      'tsserver-trace-internal',
      'Capture tsserver traces and surface slow paths.',
    ],
  ],
});

const TESTING_ARTIFACTS = buildArtifacts('testing', {
  command: [
    [
      '/run-affected-tests',
      'Run Jest on the affected Nx projects only, with the agreed --bail and --runInBand flags.',
    ],
    [
      '/diff-coverage',
      'Compare coverage against the merge-base and report files whose coverage dropped.',
    ],
    [
      '/find-flaky',
      'Walk the last N runs and surface tests with a flake signal.',
    ],
    [
      '/add-aaa-comment',
      'Annotate the staged test with Arrange / Act / Assert blocks.',
    ],
    [
      '/refactor-to-factories',
      'Rewrite fixture literals as calls to the agreed factory functions.',
    ],
    [
      '/audit-snapshots',
      'Walk snapshots in the diff and report ones whose subject is unstable.',
    ],
    [
      '/spec-for-component',
      'Generate a spec scaffold for a component using the team factories.',
    ],
    [
      '/spec-for-route',
      'Generate a spec scaffold for a route handler with the agreed mocks.',
    ],
  ],
  skill: [
    [
      'aaa-layout',
      'Arrange, Act, Assert blocks separated by a blank line. One assertion per concept.',
    ],
    [
      'factories-over-fixtures',
      'Build test data through factory functions with named overrides.',
    ],
    [
      'integration-tests-real-db',
      'No mocked database. Prior incident: mocked migrations passed, prod broke.',
    ],
    [
      'snapshot-etiquette',
      'When a snapshot earns its keep and when it is hiding a missing assertion.',
    ],
    [
      'jest-mocking-rules',
      'What is safe to mock, what must be exercised, and the boundary between the two.',
    ],
    [
      'testing-library-queries',
      'The query priority order and the cases where getByRole is the wrong default.',
    ],
    [
      'mocking-network-msw',
      'Use msw for HTTP. Fixtures live in __fixtures__, never inline in the spec.',
    ],
    [
      'deterministic-time',
      'Freeze time at the suite boundary, never inside an act, never with sleep.',
    ],
  ],
  subagent: [
    [
      'test-coverage-reviewer',
      'Reads a diff and highlights branches and edges with thin coverage.',
    ],
    [
      'flaky-test-isolator',
      'Walks the last N runs and isolates the suspected flaky test with a repro.',
    ],
    [
      'mock-boundary-checker',
      'Reports mocked seams that crossed the agreed unit / integration line.',
    ],
    [
      'factory-builder',
      'Generates a factory function for a new entity with the agreed override shape.',
    ],
    [
      'spec-generator',
      'Generates a spec scaffold for a component or route handler from the diff.',
    ],
    [
      'fixture-deprecator',
      'Finds inline fixture literals and proposes the corresponding factory call.',
    ],
    [
      'msw-handler-builder',
      'Generates a typed msw handler from a captured HAR or trace.',
    ],
  ],
  hook: [
    [
      'PostToolUse · *.spec.ts',
      'Run the edited spec file immediately so a broken test never reaches review.',
    ],
    ['PostToolUse · *.test.ts', 'Same as above for the *.test.ts convention.'],
    [
      'PreToolUse · jest.config.ts',
      'Block changes to jest.config that loosen the agreed thresholds.',
    ],
    [
      'PostToolUse · __snapshots__/*',
      'Refuse a snapshot whose subject does not appear in the diff.',
    ],
    [
      'PreCommit · *.spec.ts',
      'Run the affected projects and refuse the commit if coverage drops.',
    ],
    [
      'SessionStart · test-project',
      'Load the current coverage report into the session.',
    ],
    [
      'PreToolUse · factory-*.ts',
      'Validate factory signatures against the agreed override contract.',
    ],
    [
      'PostToolUse · coverage/*',
      'Emit a one-line summary of the coverage delta on every write.',
    ],
  ],
  'mcp-server': [
    [
      'jest-internal',
      'Live jest bridge for running affected projects and inspecting results.',
    ],
    [
      'codecov-readonly',
      'Read coverage reports for the affected services scoped to the team.',
    ],
    [
      'github-checks-suite',
      'Read the check run status for the staged diff and surface failing suites.',
    ],
    [
      'github-test-results',
      'Pull the test-results artifact for a specific PR or check run.',
    ],
    [
      'sentry-test-failures',
      'Look up errors emitted by the test runner against the team workspace.',
    ],
    [
      'datadog-tests',
      'Read the test-performance stream for the affected projects.',
    ],
    [
      'browserstack-internal',
      'Trigger and inspect cross-browser test runs against a preview deployment.',
    ],
  ],
});

const SQL_ARTIFACTS = buildArtifacts('sql', {
  command: [
    [
      '/explain-plan',
      'Wrap a query in EXPLAIN ANALYZE and surface the expensive nodes.',
    ],
    [
      '/lint-window-functions',
      'Walk the diff for window functions without an explicit partition or order.',
    ],
    [
      '/diff-schema',
      'Compare the proposed migration against the warehouse production schema.',
    ],
    [
      '/audit-cte',
      'Flag subqueries the team would have preferred as named CTEs.',
    ],
    [
      '/export-warehouse',
      'Generate a typed export of the current warehouse schema for the agent.',
    ],
    [
      '/trace-slow-query',
      'Walk a slow-query log and surface the join that pushed it over budget.',
    ],
  ],
  skill: [
    [
      'cte-over-subquery',
      'Default to named CTEs. Subqueries hide intent in long pipelines.',
    ],
    [
      'naming-and-casing',
      'snake_case identifiers, no reserved words, no abbreviations beyond the agreed list.',
    ],
    [
      'window-functions-etiquette',
      'Partition keys are explicit. No implicit ordering. Always alias.',
    ],
    [
      'fact-vs-dim-modeling',
      'When a table belongs in fact, when in dim, and the cases that drift.',
    ],
    [
      'snapshot-vs-incremental',
      'When to snapshot the table and when to model it as an incremental.',
    ],
    [
      'late-binding-views',
      'When a late-binding view is the right surface and where it bites.',
    ],
    [
      'materialization-strategy',
      'Materialize where the read side needs it; never by default.',
    ],
    ['dbt-folder-layout', 'The agreed dbt model directory shape and naming.'],
  ],
  subagent: [
    [
      'query-cost-explainer',
      'Walks a query plan and surfaces the heaviest nodes with rewrite suggestions.',
    ],
    [
      'schema-drift-reviewer',
      'Compares the proposed migration to the current warehouse schema and reports drift.',
    ],
    [
      'denormalization-evaluator',
      'Looks at a proposed denorm and reports whether the read win outweighs the write cost.',
    ],
    [
      'partition-suggester',
      'Suggests a partition key for a table given its access patterns.',
    ],
    [
      'index-recommender',
      'Suggests indexes for a query given its plan and the table cardinality.',
    ],
  ],
  hook: [
    [
      'PreToolUse · *.sql',
      'Validate that the SQL parses and lints against the agreed rule set.',
    ],
    [
      'PostToolUse · *.sql',
      'Run the EXPLAIN plan against the dev warehouse so cost shows up in the diff.',
    ],
    [
      'PreCommit · *.sql',
      'Refuse a commit whose query plan exceeds the agreed cost ceiling.',
    ],
    [
      'SessionStart · warehouse',
      'Load the schema and the recent slow-query log into the session.',
    ],
    [
      'PreToolUse · dbt_project.yml',
      'Refuse a project config change that loosens the agreed materialization defaults.',
    ],
    [
      'PostToolUse · schema.yml',
      'Validate that the schema yml matches the SQL it documents.',
    ],
  ],
  'mcp-server': [
    [
      'metabase-internal',
      'Read-only access to saved questions and dashboards in the Metabase warehouse instance.',
    ],
    [
      'snowflake-readonly',
      'Read-only Snowflake for schema and plan lookups against the warehouse.',
    ],
    [
      'dbt-cloud-internal',
      'Live access to dbt Cloud runs, manifests, and recent artifacts.',
    ],
    [
      'github-warehouse-org',
      'Scoped read access to the warehouse repos for PR and review lookups.',
    ],
    [
      'datadog-warehouse',
      'Read warehouse-side performance signals scoped to the team.',
    ],
    [
      'redash-internal',
      'Read-only Redash for saved-query lookups and dashboards.',
    ],
    [
      'looker-internal',
      'Read-only Looker for explores, looks, and dashboards.',
    ],
  ],
});

const DESIGN_TOKENS_ARTIFACTS = buildArtifacts('tokens', {
  command: [
    [
      '/audit-hardcoded-colors',
      'Walk the diff for hex literals where a token reference belongs.',
    ],
    [
      '/diff-tokens',
      'Compare the staged token set against the published Figma library.',
    ],
    [
      '/export-to-figma',
      'Push the local token set to the Figma library as a draft variable set.',
    ],
    [
      '/lint-spacing',
      'Flag inline padding and gap values that drift from the agreed scale.',
    ],
  ],
  skill: [
    [
      'color-usage',
      'Reserve the periwinkle accent for primary affordance and focus only.',
    ],
    [
      'spacing-scale',
      'xs / sm / md / lg / xl / 2xl. Do not improvise intermediate values.',
    ],
    [
      'type-scale',
      'The Borna scale and the rules for when a step is allowed to bend.',
    ],
    [
      'motion-tokens',
      'The duration and easing tokens and the rules for when motion is allowed.',
    ],
    [
      'density-modes',
      'The two density modes and the surfaces each one is intended for.',
    ],
  ],
  subagent: [
    [
      'hardcoded-color-finder',
      'Walks a diff and reports hex literals where a token would have served.',
    ],
    [
      'token-drift-explainer',
      'Compares the staged tokens to the Figma library and explains each drift.',
    ],
    [
      'spacing-auditor',
      'Reports padding and gap values that bypass the agreed scale.',
    ],
    [
      'contrast-checker',
      'Walks a story tree and reports text-on-surface pairs below AA.',
    ],
  ],
  hook: [
    [
      'PostToolUse · *.tsx',
      'Warn when a hex color is hardcoded in JSX instead of resolved from the token map.',
    ],
    [
      'PostToolUse · *.css',
      'Validate that custom-property references resolve against the current token set.',
    ],
    [
      'PreToolUse · tokens.json',
      'Refuse a token change that has no companion entry in the changelog.',
    ],
    [
      'SessionStart · design-tokens',
      'Load the current token set and the Figma library snapshot into the session.',
    ],
    [
      'PreCommit · *.css',
      'Refuse a commit whose diff introduces a literal where a token belongs.',
    ],
  ],
  'mcp-server': [
    [
      'figma-design-system',
      'Pull the live token and component metadata from the Design system Figma library.',
    ],
    [
      'storybook-internal',
      'Read the rendered tokens off the internal Storybook for contrast checks.',
    ],
    [
      'chromatic-snapshots',
      'Pull the latest Chromatic snapshots scoped to the affected stories.',
    ],
    [
      'contrast-checker-internal',
      'Internal contrast service that runs against the rendered surface.',
    ],
    [
      'percy-internal',
      'Read Percy snapshots and surface visual regressions scoped to tokens.',
    ],
    [
      'npm-tokens-registry',
      'Resolve the published token package from the internal registry.',
    ],
  ],
});

export const STUB_MARKETPLACE: MarketplaceDetail = {
  id: 'frontend',
  name: 'Frontend playbook',
  repoPath: 'acme/frontend-marketplace',
  remoteUrl: 'git@github.com:acme/frontend-marketplace.git',
  agents: ['Claude Code', 'Copilot'],
  lastPublishedRelative: '2d ago',
  state: 'drift',
  suggestions: [],
  consumers: {
    repoCount: 47,
    outdatedRepos: 5,
  },
  plugins: [
    {
      id: 'frontend-react-rules',
      name: 'React conventions',
      packageSlug: 'acme/frontend-react-rules',
      version: '3.2.1',
      mandatory: true,
      autoUpdate: true,
      owner: SPACES.frontendGuild,
      description:
        'React component conventions and hooks discipline for the customer-facing apps. Covers file layout, state ownership, and the rules around effects we keep relearning.',
      lastPublishedRelative: '2d ago',
      state: 'healthy',
      sourceSync: {
        state: 'behind',
        sourceVersion: '3.3.0',
        changes: [
          {
            kind: 'updated',
            target: '/review-component',
            artifactKind: 'command',
          },
          {
            kind: 'added',
            target: 'suspense-boundaries',
            artifactKind: 'skill',
          },
          {
            kind: 'added',
            target: 'component-diff-reviewer',
            artifactKind: 'subagent',
          },
          {
            kind: 'added',
            target: 'PreToolUse · *.tsx',
            artifactKind: 'hook',
          },
          {
            kind: 'added',
            target: 'storybook-internal',
            artifactKind: 'mcp-server',
          },
        ],
      },
      adoption: {
        reposOnVersion: 38,
        outdatedRepos: 0,
        repos: [
          {
            repoPath: 'acme/web-portal',
            installedVersion: '3.2.1',
            installer: INSTALLERS.sara,
            installedRelative: '2d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/customer-portal',
            installedVersion: '3.2.1',
            installer: INSTALLERS.marc,
            installedRelative: '3d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/admin-dash',
            installedVersion: '3.2.1',
            installer: INSTALLERS.ines,
            installedRelative: '5d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/cms-frontend',
            installedVersion: '3.2.1',
            installer: INSTALLERS.jonas,
            installedRelative: '6d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/marketing-site',
            installedVersion: '3.2.1',
            installer: INSTALLERS.maya,
            installedRelative: '9d ago',
            isOutdated: false,
          },
        ],
      },
      artifacts: REACT_ARTIFACTS,
    },
    {
      id: 'data-platform-sql',
      name: 'SQL conventions',
      packageSlug: 'acme/data-platform-sql',
      version: '1.4.0',
      mandatory: false,
      autoUpdate: false,
      owner: SPACES.dataPlatform,
      description:
        'SQL conventions and query review checklist for analytics work hitting the data warehouse.',
      lastPublishedRelative: '11d ago',
      state: 'drift',
      sourceSync: {
        state: 'in-sync',
        sourceVersion: '1.4.0',
      },
      adoption: {
        reposOnVersion: 12,
        outdatedRepos: 7,
        repos: [
          {
            repoPath: 'acme/billing-events',
            installedVersion: '1.3.0',
            installer: INSTALLERS.sara,
            installedRelative: '11d ago',
            isOutdated: true,
          },
          {
            repoPath: 'acme/analytics-svc',
            installedVersion: '1.3.0',
            installer: INSTALLERS.marc,
            installedRelative: '8d ago',
            isOutdated: true,
          },
          {
            repoPath: 'acme/reporting-svc',
            installedVersion: '1.2.5',
            installer: INSTALLERS.anil,
            installedRelative: '22d ago',
            isOutdated: true,
          },
          {
            repoPath: 'acme/data-ingest',
            installedVersion: '1.2.5',
            installer: INSTALLERS.ines,
            installedRelative: '24d ago',
            isOutdated: true,
          },
          {
            repoPath: 'acme/customer-events',
            installedVersion: '1.2.0',
            installer: INSTALLERS.jonas,
            installedRelative: '32d ago',
            isOutdated: true,
          },
          {
            repoPath: 'acme/etl-pipelines',
            installedVersion: '1.1.0',
            installer: INSTALLERS.ravi,
            installedRelative: '47d ago',
            isOutdated: true,
          },
          {
            repoPath: 'acme/data-warehouse-tools',
            installedVersion: '1.0.2',
            installer: INSTALLERS.maya,
            installedRelative: '64d ago',
            isOutdated: true,
          },
          {
            repoPath: 'acme/order-stream',
            installedVersion: '1.4.0',
            installer: INSTALLERS.olu,
            installedRelative: '2d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/forecast-svc',
            installedVersion: '1.4.0',
            installer: INSTALLERS.karim,
            installedRelative: '3d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/cohort-svc',
            installedVersion: '1.4.0',
            installer: INSTALLERS.lena,
            installedRelative: '5d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/payments-events',
            installedVersion: '1.4.0',
            installer: INSTALLERS.sara,
            installedRelative: '7d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/inventory-events',
            installedVersion: '1.4.0',
            installer: INSTALLERS.marc,
            installedRelative: '10d ago',
            isOutdated: false,
          },
        ],
      },
      artifacts: SQL_ARTIFACTS,
    },
    {
      id: 'security-baseline',
      name: 'Security baseline',
      packageSlug: 'acme/security-baseline',
      version: '2.0.0',
      mandatory: true,
      autoUpdate: true,
      owner: SPACES.security,
      description:
        'Baseline secure-coding rules for all production services. Reviewed by the Security guild every quarter.',
      lastPublishedRelative: '3h ago',
      state: 'healthy',
      sourceSync: {
        state: 'in-sync',
        sourceVersion: '2.0.0',
      },
      adoption: {
        reposOnVersion: 47,
        outdatedRepos: 0,
        repos: [
          {
            repoPath: 'acme/auth-svc',
            installedVersion: '2.0.0',
            installer: INSTALLERS.ravi,
            installedRelative: '3h ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/billing-api',
            installedVersion: '2.0.0',
            installer: INSTALLERS.sara,
            installedRelative: '6h ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/orders-svc',
            installedVersion: '2.0.0',
            installer: INSTALLERS.marc,
            installedRelative: '1d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/customer-svc',
            installedVersion: '2.0.0',
            installer: INSTALLERS.ines,
            installedRelative: '1d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/notifier',
            installedVersion: '2.0.0',
            installer: INSTALLERS.olu,
            installedRelative: '2d ago',
            isOutdated: false,
          },
        ],
      },
      artifacts: SECURITY_ARTIFACTS,
    },
    {
      id: 'design-tokens',
      name: 'Design tokens',
      packageSlug: 'acme/design-tokens',
      version: '0.9.3',
      mandatory: false,
      autoUpdate: true,
      owner: SPACES.designSystem,
      description:
        'Tokens, semantic colors, and spacing scale used by the design system. Keep this in sync with the Figma library.',
      lastPublishedRelative: '9d ago',
      state: 'healthy',
      sourceSync: {
        state: 'behind',
        sourceVersion: '0.9.4',
        changes: [
          {
            kind: 'updated',
            target: 'color-usage',
            artifactKind: 'skill',
          },
          {
            kind: 'added',
            target: 'token-drift-explainer',
            artifactKind: 'subagent',
          },
          {
            kind: 'added',
            target: 'figma-design-system',
            artifactKind: 'mcp-server',
          },
        ],
      },
      adoption: {
        reposOnVersion: 21,
        outdatedRepos: 0,
        repos: [
          {
            repoPath: 'acme/web-portal',
            installedVersion: '0.9.3',
            installer: INSTALLERS.maya,
            installedRelative: '4d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/customer-portal',
            installedVersion: '0.9.3',
            installer: INSTALLERS.jonas,
            installedRelative: '4d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/admin-dash',
            installedVersion: '0.9.3',
            installer: INSTALLERS.lena,
            installedRelative: '6d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/cms-frontend',
            installedVersion: '0.9.3',
            installer: INSTALLERS.karim,
            installedRelative: '8d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/marketing-site',
            installedVersion: '0.9.3',
            installer: INSTALLERS.sara,
            installedRelative: '9d ago',
            isOutdated: false,
          },
        ],
      },
      artifacts: DESIGN_TOKENS_ARTIFACTS,
    },
    {
      id: 'platform-typescript',
      name: 'TypeScript rules',
      packageSlug: 'acme/platform-typescript',
      version: '4.1.0',
      mandatory: true,
      autoUpdate: false,
      owner: SPACES.platform,
      description:
        'TypeScript conventions enforced across all platform services and shared packages.',
      lastPublishedRelative: '5d ago',
      state: 'healthy',
      sourceSync: {
        state: 'in-sync',
        sourceVersion: '4.1.0',
      },
      adoption: {
        reposOnVersion: 47,
        outdatedRepos: 0,
        repos: [
          {
            repoPath: 'acme/auth-svc',
            installedVersion: '4.1.0',
            installer: INSTALLERS.ravi,
            installedRelative: '2d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/billing-api',
            installedVersion: '4.1.0',
            installer: INSTALLERS.anil,
            installedRelative: '3d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/orders-svc',
            installedVersion: '4.1.0',
            installer: INSTALLERS.olu,
            installedRelative: '3d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/inventory-svc',
            installedVersion: '4.1.0',
            installer: INSTALLERS.karim,
            installedRelative: '4d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/notifier',
            installedVersion: '4.1.0',
            installer: INSTALLERS.lena,
            installedRelative: '5d ago',
            isOutdated: false,
          },
        ],
      },
      artifacts: TYPESCRIPT_ARTIFACTS,
    },
    {
      id: 'testing-conventions',
      name: 'Testing conventions',
      packageSlug: 'acme/testing-conventions',
      version: '1.2.0',
      mandatory: false,
      autoUpdate: false,
      owner: SPACES.platform,
      description:
        'Test layout, naming, and the boundary between unit and integration tests.',
      lastPublishedRelative: '14d ago',
      state: 'drift',
      sourceSync: {
        state: 'behind',
        sourceVersion: '1.3.0',
        changes: [
          {
            kind: 'added',
            target: 'test-coverage-reviewer',
            artifactKind: 'subagent',
          },
          {
            kind: 'updated',
            target: 'PostToolUse · *.spec.ts',
            artifactKind: 'hook',
          },
          {
            kind: 'added',
            target: '/run-affected-tests',
            artifactKind: 'command',
          },
        ],
      },
      adoption: {
        reposOnVersion: 30,
        outdatedRepos: 4,
        repos: [
          {
            repoPath: 'acme/legacy-billing',
            installedVersion: '1.1.0',
            installer: INSTALLERS.jonas,
            installedRelative: '32d ago',
            isOutdated: true,
          },
          {
            repoPath: 'acme/internal-tools',
            installedVersion: '1.1.0',
            installer: INSTALLERS.maya,
            installedRelative: '40d ago',
            isOutdated: true,
          },
          {
            repoPath: 'acme/cron-runner',
            installedVersion: '1.0.4',
            installer: INSTALLERS.karim,
            installedRelative: '52d ago',
            isOutdated: true,
          },
          {
            repoPath: 'acme/search-svc',
            installedVersion: '1.0.4',
            installer: INSTALLERS.lena,
            installedRelative: '58d ago',
            isOutdated: true,
          },
          {
            repoPath: 'acme/auth-svc',
            installedVersion: '1.2.0',
            installer: INSTALLERS.ravi,
            installedRelative: '5d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/billing-api',
            installedVersion: '1.2.0',
            installer: INSTALLERS.sara,
            installedRelative: '6d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/orders-svc',
            installedVersion: '1.2.0',
            installer: INSTALLERS.marc,
            installedRelative: '8d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/customer-svc',
            installedVersion: '1.2.0',
            installer: INSTALLERS.ines,
            installedRelative: '11d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/checkout-svc',
            installedVersion: '1.2.0',
            installer: INSTALLERS.olu,
            installedRelative: '14d ago',
            isOutdated: false,
          },
        ],
      },
      artifacts: TESTING_ARTIFACTS,
    },
  ],
};

export const EMPTY_MARKETPLACE: MarketplaceDetail = {
  id: 'fresh',
  name: 'Mobile guild',
  repoPath: 'acme/mobile-marketplace',
  remoteUrl: 'git@github.com:acme/mobile-marketplace.git',
  agents: ['Claude Code', 'Copilot'],
  lastPublishedRelative: 'never',
  state: 'healthy',
  consumers: { repoCount: 0, outdatedRepos: 0 },
  plugins: [],
  suggestions: [],
};

const SUGGESTERS: Record<string, Suggester> = {
  iva: { name: 'Iva Rocha', initials: 'IR' },
  daniel: { name: 'Daniel Okoye', initials: 'DO' },
  pia: { name: 'Pia Lindgren', initials: 'PL' },
  thomas: { name: 'Thomas Renard', initials: 'TR' },
  yumi: { name: 'Yumi Sato', initials: 'YS' },
  greg: { name: 'Greg Halloran', initials: 'GH' },
};

const FORMS_SUGGESTION_ARTIFACTS: Artifact[] = [
  {
    id: 'sg-forms-cmd-1',
    kind: 'command',
    name: '/scaffold-form',
    summary:
      'Generate a typed form with react-hook-form, our validator wiring, and submit-state plumbing.',
  },
  {
    id: 'sg-forms-cmd-2',
    kind: 'command',
    name: '/diagnose-rerender',
    summary:
      'Trace why a form field re-renders on unrelated state changes and propose a fix.',
  },
  {
    id: 'sg-forms-skill-1',
    kind: 'skill',
    name: 'form-state-ownership',
    summary:
      'When form state belongs to the form, when to the parent route, and how to keep server-truth in sync.',
  },
  {
    id: 'sg-forms-skill-2',
    kind: 'skill',
    name: 'inline-validation-rules',
    summary:
      'When inline validation helps the user vs. when it just nags them mid-typing.',
  },
  {
    id: 'sg-forms-hook-1',
    kind: 'hook',
    name: 'PreToolUse · *Form.tsx',
    summary:
      'Refuse a form component that does not wire react-hook-form or its agreed alternative.',
  },
];

const PII_SUGGESTION_ARTIFACTS: Artifact[] = [
  {
    id: 'sg-pii-cmd-1',
    kind: 'command',
    name: '/audit-pii-logging',
    summary:
      'Walk the diff for log statements that emit identifiers without the agreed masking format.',
  },
  {
    id: 'sg-pii-skill-1',
    kind: 'skill',
    name: 'pii-masking-format',
    summary:
      'First-6-characters plus * for emails, and the matching shape for phone numbers and IPs.',
  },
  {
    id: 'sg-pii-skill-2',
    kind: 'skill',
    name: 'log-level-and-pii',
    summary:
      'Why "redact at all levels" is the rule, not just at info; what auditors look at.',
  },
  {
    id: 'sg-pii-hook-1',
    kind: 'hook',
    name: 'PreCommit · *.ts',
    summary:
      'Refuse a commit that adds a logger.info(user.email) line without the masking helper.',
  },
];

const PERF_SUGGESTION_ARTIFACTS: Artifact[] = [
  {
    id: 'sg-perf-cmd-1',
    kind: 'command',
    name: '/profile-route',
    summary:
      'Open the React Profiler over the current route and surface the heaviest commits.',
  },
  {
    id: 'sg-perf-cmd-2',
    kind: 'command',
    name: '/audit-bundle-route',
    summary:
      'Report what ships in this route bundle and which deps deserve a dynamic import.',
  },
  {
    id: 'sg-perf-skill-1',
    kind: 'skill',
    name: 'render-cost-budget',
    summary:
      'The per-route render budget we hold ourselves to, and what to do when a feature crosses it.',
  },
  {
    id: 'sg-perf-subagent-1',
    kind: 'subagent',
    name: 'lighthouse-runner',
    summary:
      'Run Lighthouse against a preview deploy and flag regressions against the route baseline.',
  },
];

const STUB_SUGGESTIONS: Suggestion[] = [
  {
    id: 'sg-forms',
    pluginName: 'Form patterns',
    proposedVersion: '0.4.0',
    packageSlug: 'acme/frontend-form-patterns',
    description:
      'We have rebuilt three forms in the last sprint and each time the same questions come back: where does form state live, when do we validate inline, how do we keep server-truth in sync. This plugin pulls the answers we keep agreeing on into a small set of commands, two skills, and one hook. It has been the de-facto practice inside the frontend guild for the last quarter and the on-call rotations stopped asking us at review time.',
    suggester: SUGGESTERS.iva,
    originSpace: SPACES.frontendGuild,
    originUsage: { installsInSpace: 9 },
    suggestedRelative: '3d ago',
    state: 'pending',
    artifacts: FORMS_SUGGESTION_ARTIFACTS,
    comments: [],
    decision: null,
  },
  {
    id: 'sg-pii',
    pluginName: 'PII logging guardrails',
    proposedVersion: '1.0.0',
    packageSlug: 'acme/security-pii-logging',
    description:
      'Last quarter audit flagged two services for logging full emails. We fixed them by hand. The standard says "first six characters plus star" but no one had wired it into the agents. This plugin is the smallest version that covers the gap: one audit command, two skills, one pre-commit hook that refuses the regression. It runs against our own services with zero false positives so far.',
    suggester: SUGGESTERS.daniel,
    originSpace: SPACES.security,
    originUsage: { installsInSpace: 6 },
    suggestedRelative: '1d ago',
    state: 'pending',
    artifacts: PII_SUGGESTION_ARTIFACTS,
    comments: [],
    decision: null,
  },
  {
    id: 'sg-perf',
    pluginName: 'Route performance budgets',
    proposedVersion: '0.2.0',
    packageSlug: 'acme/frontend-perf-budgets',
    description:
      'Two routes regressed past the budget in the last release and we caught it after the fact. The plugin wraps the Profiler workflow we have been running by hand plus the Lighthouse subagent we already use on the platform side. Lifting it into a marketplace plugin would let the consumer apps run the same check in PRs instead of waiting for a Friday round of tuning.',
    suggester: SUGGESTERS.pia,
    originSpace: SPACES.frontendGuild,
    originUsage: { installsInSpace: 4 },
    suggestedRelative: '5d ago',
    state: 'in-review',
    artifacts: PERF_SUGGESTION_ARTIFACTS,
    comments: [
      {
        author: 'admin',
        authorName: 'Marc Reed',
        at: '4d ago',
        body: 'I want this, but the subagent currently has hardcoded API keys for the Lighthouse runner. Can you move the credentials behind an MCP server config block before we publish?',
      },
      {
        author: 'suggester',
        authorName: 'Pia Lindgren',
        at: '2d ago',
        body: 'Fair. I am pulling the keys into a config-only MCP block this week; will resubmit v0.2.1 once that is in. Want to keep the rest of the plugin shape the same.',
      },
    ],
    decision: null,
  },
];

export const STUB_SUGGESTIONS_DEFAULT: Suggestion[] = STUB_SUGGESTIONS;

export const STUB_SUGGESTIONS_CLEARED: Suggestion[] = [];
