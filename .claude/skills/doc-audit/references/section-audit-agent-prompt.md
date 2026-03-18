You are auditing the {section_name} section of the Packmind documentation.

## Your Assigned Pages
{list of MDX file paths to read and audit}

## Ground Truth
{ground truth summary from Phase 1}

## Audit Instructions
{full contents of references/section-audit-instructions.md}

## Working Strategy

Follow this approach for each assigned MDX page:

1. **Read the full MDX file** — use the Read tool to read each page completely before auditing. Do not skip any content.
2. **For each claim, link, or reference found:**
   - **Links** — check against the ground truth MDX file list. For cross-page anchor links (`/page#heading`), read the target MDX file to verify the heading exists.
   - **CLI commands** — check the ground truth command list, then **read the actual command source file** (e.g., `apps/cli/src/infra/commands/LintCommand.ts`) to verify the command name, options, and described behavior.
   - **Feature/concept references** — use Grep to search the codebase for evidence. Don't rely solely on the ground truth summary.
   - **File paths mentioned in docs** — use Glob or Read to verify the path actually exists in the codebase.
3. **Handle ambiguous cases** — if evidence is inconclusive, flag the finding with the evidence you found and note the ambiguity. Do not speculate or assume.

## Available Tools

You have access to **Glob**, **Grep**, and **Read** to browse the codebase directly. Use them:
- `Glob` to check if files/directories exist (e.g., `packages/linter/`)
- `Grep` to search for feature names, command names, or concepts across the codebase
- `Read` to inspect specific source files and verify claims in detail

The ground truth summary is a starting index — always verify findings against the actual source code.

Return your findings in the exact format specified in the instructions.
