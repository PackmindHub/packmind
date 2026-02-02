# Pre-PR Quality Check

Run the same quality checks that CI runs before pushing a PR to catch issues early.

**Discovered:** CI runs GitGuardian (secrets), SonarCloud (code quality), and Packmind CLI (standards) - but only `quality-gate` is available locally. Some CI steps require secrets or external services.

**Evidence:** .github/workflows/quality.yml, .github/workflows/build.yml, package.json scripts

## When to Use

- Before pushing a branch for PR review
- After major changes to ensure nothing is broken
- When CI fails and you need to reproduce locally

## Context Validation Checkpoints

* [ ] Are all dependencies installed? (`npm ci`)
* [ ] Is the correct Node version active? (check `.nvmrc`)
* [ ] Is `PACKMIND_EDITION` set correctly? (`oss` or `proprietary`)

## Recipe Steps

### Step 1: Run Local Quality Gate

This runs typecheck, tests, lint, and build for affected projects.

```bash
npm run quality-gate
```

### Step 2: Run Prettier Check

Verify code formatting matches CI expectations.

```bash
npm run prettier:check
```

### Step 3: Run Packmind CLI Lint (Optional)

If you have standards configured, validate against them.

```bash
npm run packmind-cli:lint
```

### Step 4: Check for Secrets (Manual)

CI runs GitGuardian which requires API key. Manually check for:
- API keys in code (not .env files)
- Hardcoded credentials
- Private keys or certificates

```bash
# Quick grep for common secret patterns
grep -r "PRIVATE KEY" --include="*.ts" src/ || echo "No private keys found"
grep -r "sk-[a-zA-Z0-9]" --include="*.ts" src/ || echo "No API keys found"
```

### Step 5: Verify CI Will Pass

These are the exact commands CI runs:

```bash
# Lint (proprietary mode in CI)
PACKMIND_EDITION=oss nx run-many -t lint

# Tests for affected
npm run test:staged

# Build all
npm run build
```
