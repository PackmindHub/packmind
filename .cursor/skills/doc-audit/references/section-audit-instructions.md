# Section Audit Instructions

You are auditing a section of the Packmind end-user documentation. Your job is to cross-reference claims in the MDX pages against the actual codebase and ground truth data to find **concrete, verifiable issues only**.

## Golden Rule

**Only flag issues where you can point to a specific codebase artifact that contradicts the documentation.** Do not flag stylistic issues, subjective concerns, or things that "might" be wrong. Every finding must be backed by evidence.

## Detection Categories

### Category A: Broken Internal Links (ERROR)

**What to check:** Links in MDX files that reference other doc pages (e.g., `/concepts/standards-management`, `getting-started/gs-cli-setup`).

**How to verify:** Check if the link target resolves to an actual MDX file in the ground truth MDX file list. Mintlify resolves links relative to the `apps/doc/` root — a link to `/concepts/foo` should map to `apps/doc/concepts/foo.mdx`.

**Valid finding:**
- Page links to `/concepts/workflow-management` but no `apps/doc/concepts/workflow-management.mdx` exists

**Not a finding (false positive):**
- Links to external URLs (https://...) — do not check these
- Links to anchors within the same page (#section)
- Links listed in the `redirects` section of `docs.json` — these are handled by Mintlify

### Category B: Outdated CLI Commands (ERROR)

**What to check:** References to `packmind-cli <command>` or CLI command names in the documentation.

**How to verify:** Check if the referenced command exists in the CLI commands ground truth (file list from `apps/cli/src/infra/commands/`). Command files follow the pattern `*Command.ts` or `*Handler.ts`.

**Valid finding:**
- Doc references `packmind-cli migrate` but no `MigrateCommand.ts` or `migrateHandler.ts` exists in CLI source

**Not a finding (false positive):**
- CLI flags or options (e.g., `--verbose`) — only check command names
- Generic references to "the CLI" without a specific command name

### Category C: Non-Existent Concepts (ERROR)

**What to check:** References to specific Packmind features, domain packages, or integrations that should exist in the codebase.

**How to verify:** Check against the ground truth package list and codebase. Look for references to packages (e.g., `@packmind/some-package`), specific integration names, or feature names that imply codebase support.

**Valid finding:**
- Doc describes a "Bitbucket integration" but no bitbucket-related package or code exists
- Doc references `@packmind/analytics` but that package doesn't exist in `packages/`

**Not a finding (false positive):**
- High-level conceptual descriptions (e.g., "Packmind helps teams share knowledge")
- References to third-party tools that Packmind integrates with via configuration (not code)
- UI features that exist in the frontend but not as standalone packages
- Do not infer feature availability per edition (OSS vs. Enterprise vs. Cloud) from package paths. Edition gating is controlled by TypeScript path aliases in `tsconfig.paths.oss.json` vs `tsconfig.paths.proprietary.json`, not by directory structure — see Category D for the full explanation

### Category D: Misleading Information (WARNING)

**What to check:**
- Dates in the past presented as future events (e.g., "coming in Q2 2024" when it's 2026)
- Direct contradictions between two doc pages about the same feature
- References to deprecated or removed features still presented as current

**How to verify:** Compare dates against the current date (provided in your context). Compare claims across pages for consistency.

**Valid finding:**
- "This feature will be available in Q3 2024" — that date has passed
- Page A says "standards support Markdown only" while page B says "standards support Markdown and YAML"

**Not a finding (false positive):**
- Vague future references ("we plan to add...")
- Minor wording differences between pages about the same concept
- Claims about feature availability per edition (e.g., "Enterprise only", "OSS only", "available in the Cloud version") cannot be verified by inspecting package directories. Edition gating in this repo is done at build time via TypeScript path aliases — `tsconfig.paths.oss.json` redirects `@packmind/<feature>` imports to `packages/editions/src/index.ts` (a **stubs aggregator** for the OSS build), while `tsconfig.paths.proprietary.json` redirects the same imports to the real top-level package such as `packages/linter/src/index.ts`. Consequences: (a) the presence of `packages/editions/src/oss/<feature>/` only means an OSS-build stub exists — it is **not evidence** the feature works in OSS; (b) the existence of a top-level `packages/<feature>/` package does **not** mean the feature ships in OSS, because the OSS tsconfig points elsewhere. Do not flag edition-availability claims based on either of these paths — verify against the two `tsconfig.paths.*.json` files if a check is unavoidable, otherwise skip.

### Category E: Missing Documentation Coverage (INFO)

**What to check:** CLI commands or domain packages that exist in the codebase but have no corresponding documentation page or section.

**How to verify:** Compare the ground truth CLI commands and packages against what the documentation covers. A command is "covered" if it's mentioned on any doc page (typically `tools/cli.mdx`). A package is "covered" if its functionality is described somewhere in the docs.

**Valid finding:**
- CLI has `SyncCommand.ts` but no doc page mentions the `sync` command
- Package `packages/linter` exists but no linter documentation page exists

**Not a finding (false positive):**
- Internal/infrastructure packages (e.g., `node-utils`, `test-helpers`) — these are not user-facing
- Commands that are clearly internal or development-only

## Expected Output Format

Return your findings as a structured list, one per line, in this exact format:

```
[SEVERITY] [CATEGORY] **{page-path}** (line ~{N}): {description}
```

Where:
- `SEVERITY` is one of: `ERROR`, `WARNING`, `INFO`
- `CATEGORY` is one of: `A`, `B`, `C`, `D`, `E`
- `page-path` is the relative path from `apps/doc/` (e.g., `tools/cli.mdx`)
- `line ~{N}` is the approximate line number (use `~` since MDX rendering may shift lines)
- `description` is a concise explanation of the issue with evidence

**Example output:**

```
[ERROR] [A] **getting-started/gs-onboarding.mdx** (line ~45): Link to `/concepts/workflow-management` — no matching MDX file exists in apps/doc/concepts/
[ERROR] [B] **tools/cli.mdx** (line ~120): References `packmind-cli migrate` — no MigrateCommand.ts found in CLI source
[WARNING] [D] **concepts/standards-management.mdx** (line ~30): "Coming in Q2 2024" — date has passed (current date: 2026-03-12)
[INFO] [E] **N/A**: CLI command `SyncCommand.ts` has no documentation coverage
```

If you find **no issues** in your assigned section, return:

```
NO_ISSUES_FOUND
```

## Important Reminders

- Read each MDX file **completely** — don't skip content
- Be thorough but precise — false positives waste time
- Include approximate line numbers to help locate issues
- For Category E, you only need to check commands/packages relevant to your assigned section
- Do NOT suggest improvements or rewrites — this is detection only
