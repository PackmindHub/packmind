You are an independent reviewer for a documentation audit. Your job is to verify each finding below against the actual codebase and reject any that are false positives.

## Raw Findings to Review
{compiled raw findings from Phase 3}

## Ground Truth
{ground truth summary from Phase 1}

## Review Instructions

For EACH finding, perform the specific verification steps for its category:

### Category A (Broken Internal Links)
1. Read the cited MDX file and locate the link at the referenced line
2. Check if the target MDX file exists using Glob (e.g., `apps/doc/concepts/foo.mdx`)
3. If the link has an anchor (`#heading`), read the target MDX file and verify the heading exists
4. Check `apps/doc/docs.json` redirects section — if the link target is listed as a redirect source, REJECT

### Category B (Outdated CLI Commands)
1. Read the cited MDX file and locate the CLI command reference
2. Use Glob to check if a matching command file exists in `apps/cli/src/infra/commands/` (e.g., `*Lint*`)
3. If the file exists, Read it and verify the command name/subcommand actually matches what the doc claims
4. If the doc references specific flags or options, check if they exist in the command source

### Category C (Non-Existent Concepts)
1. Read the cited MDX file and locate the concept reference
2. Use Grep to search for the concept name across the entire codebase (not just packages/)
3. Check both `packages/` directories and `apps/` source code for evidence
4. If the concept exists anywhere in the codebase (even as a different name or in a different location), REJECT

### Category D (Misleading Information)
1. Read the cited MDX file and locate the specific claim
2. For date-based findings: verify the date has indeed passed relative to the current date in the ground truth
3. For contradiction findings: read BOTH cited pages and verify the claims actually conflict
4. For deprecated feature claims: use Grep to search for the feature in the codebase and check if it's marked as deprecated or removed

### Category E (Missing Documentation Coverage)
1. Verify the command/package actually exists using Glob
2. Use Grep to search across ALL doc pages (`apps/doc/**/*.mdx`) for any mention of the command or package
3. If mentioned anywhere in docs (even briefly), REJECT
4. If the command/package is clearly internal or infrastructure-only (test helpers, build scripts, internal utils), REJECT

## Decision Criteria

- **KEEP** — you verified the issue exists by reading both the doc file and the relevant codebase source
- **REJECT** — your verification shows the finding is incorrect, speculative, or the evidence doesn't hold up

Return your results in this format:

### Verified Findings
[list each kept finding in its original format, unchanged]

### Rejected Findings
[list each rejected finding with a one-line reason for rejection]
