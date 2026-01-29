# Integrate Packmind CLI into Quality Gate

**Summary:** Wire packmind-cli lint validation into the npm quality-gate script and optional pre-commit hooks so developers validate standards locally before pushing.

**Why now:** Analysis of .github/workflows/quality.yml vs package.json scripts revealed gap: packmind-cli lint runs in CI but is not part of the standard `npm run quality-gate` command, requiring manual invocation before PRs.

## Evidence

- `.github/workflows/quality.yml:102-106` — CI runs `./cli-binary/packmind-cli-linux-x64 lint .`
- `package.json:9-27` — quality-gate script omits packmind-cli lint step
- `packages/coding-agent/src/infra/repositories/defaultSkillsDeployer/OnboardDeployer.ts` — packmind CLI deployment logic

## Context Validation Checkpoints

- Is packmind-cli already built in your local dev environment? (`npm run packmind-cli:build`)
- Are you using husky for git hooks? (check `.husky/` directory)
- Do you want packmind-cli to be mandatory in quality-gate or optional in pre-commit?

## Steps

### Add packmind-cli lint to quality-gate npm script

Update `package.json` to include packmind-cli lint validation as a standard quality check step.

```json
{
  "scripts": {
    "quality-gate": "npm run typecheck:frontend && npm run test:staged && npm run lint:staged && npm run build && npm run packmind-cli:lint"
  }
}
```

**Rationale:** Ensures developers validate code against Packmind standards (architecture patterns, naming conventions, module boundaries) before running lint and tests, failing fast on non-linter issues.

### Build packmind-cli before running quality-gate

Ensure the local packmind-cli binary is built and available before running quality checks.

```bash
# Run this once in your development setup
npm run packmind-cli:build

# Or add to quality-gate as a precondition
npm run packmind-cli:build && npm run quality-gate
```

**Rationale:** packmind-cli lint requires a compiled binary; building ensures it's available when quality-gate runs.

### Update .husky/pre-commit hook (optional)

Optionally add packmind-cli lint to pre-commit hook for immediate feedback before staging changes.

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Build packmind-cli if not already built
npm run packmind-cli:build

# Run quality-gate (which now includes packmind-cli lint)
npm run quality-gate
```

**Alternative:** If you want pre-commit to be lightweight, run only packmind-cli lint:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Quick check: packmind-cli lint without full quality-gate
npm run packmind-cli:lint
```

**Rationale:** Pre-commit hooks provide immediate feedback; running quality-gate on commit can slow down development velocity. Consider making pre-commit lighter (e.g., packmind-cli only) and deferring full quality-gate to pre-push.

### Test locally before pushing

Verify all checks pass before creating a PR.

```bash
# Run full quality gate
npm run quality-gate

# If all checks pass, push and open PR
git push origin your-branch
```

**Example output:**
```
npm run typecheck:frontend ✓
npm run test:staged ✓
npm run lint:staged ✓
npm run build ✓
npm run packmind-cli:lint ✓

All checks passed. Ready for PR.
```

### Document in CONTRIBUTING.md (optional)

Add a note to CONTRIBUTING.md or development guide so team members understand the quality-gate includes packmind-cli.

```markdown
## Local Quality Checks

Before pushing, run the quality-gate to validate all checks CI will run:

\`\`\`bash
npm run quality-gate
\`\`\`

This runs:
- TypeScript type checking
- Unit tests for changed files
- ESLint & Prettier formatting
- Project builds
- **Packmind CLI standards validation** ← Non-linter architecture checks

All checks must pass before creating a PR.
```
