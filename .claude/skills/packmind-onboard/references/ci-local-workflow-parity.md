# CI / Local Workflow Parity

Identify CI steps that cannot be run locally; propose "Pre-PR Quality Check" command.

## Search Patterns

### CI Configuration Files

```
# GitHub Actions
.github/workflows/*.yml
.github/workflows/*.yaml

# GitLab CI
.gitlab-ci.yml
.gitlab-ci.yaml

# CircleCI
.circleci/config.yml

# Azure Pipelines
azure-pipelines.yml
azure-pipelines.yaml

# Jenkins
Jenkinsfile

# Travis CI
.travis.yml

# Bitbucket Pipelines
bitbucket-pipelines.yml

# Generic
ci.yml
ci.yaml
pipeline.yml
```

### Local Script Definitions

```
# Node.js
package.json (scripts section)
pnpm-workspace.yaml

# Make
Makefile
makefile
GNUmakefile

# Task runners
Taskfile.yml
Taskfile.yaml
Justfile
justfile

# Python
pyproject.toml ([tool.poetry.scripts], [project.scripts])
setup.py (entry_points)
tox.ini
noxfile.py

# Ruby
Rakefile
bin/*

# Go
Makefile
mage.go

# Nx / Monorepo
nx.json
project.json
```

### Pre-commit Hooks

```
.husky/
.husky/pre-commit
.husky/pre-push
.pre-commit-config.yaml
lefthook.yml
lint-staged.config.js
```

### Common CI Steps to Check

```
# Testing
npm test
npm run test
yarn test
pnpm test
pytest
go test
cargo test
dotnet test
mvn test
gradle test

# Linting
npm run lint
eslint
prettier
pylint
flake8
golangci-lint
cargo clippy
rubocop

# Type checking
tsc --noEmit
mypy
pyright

# Building
npm run build
yarn build
go build
cargo build
dotnet build
mvn package

# Security scanning
npm audit
snyk
trivy
safety check
cargo audit

# Code coverage
coverage
nyc
jest --coverage
codecov

# E2E tests
cypress
playwright
selenium

# Docker operations
docker build
docker-compose
```

## Analysis Method

1. Parse local script definitions (package.json scripts, Makefile targets, etc.)
2. Parse CI config files (extract `run:` commands)
3. For each CI command:
   - Check if equivalent exists locally
   - Flag if no local entrypoint
4. Identify Docker-dependent steps that assume CI environment

## Reporting Threshold

Report only if:
- ≥1 meaningful CI step lacks local entrypoint

## Insight Template

```
INSIGHT:
  id: CILOCAL-[n]
  title: "WORKFLOW GAP: [N] CI steps lack local entrypoints"
  summary: "CI runs [steps] that cannot be easily reproduced locally."
  confidence: [high|medium|low]
  evidence:
    ci_only_steps:
      - step: "[command]"
        ci_file: path[:line]
        local_equivalent: "none" | "[partial match]"
  local_scripts:
    - path — defines [N] scripts
```

## Command Template

When workflow gaps exist, propose:

```yaml
name: "pre-pr-quality-check"
summary: "Run all CI checks locally before creating a PR"
whenToUse:
  - "Before creating a pull request"
  - "After completing a feature to verify CI will pass"
  - "When CI fails and you want to debug locally"
contextValidationCheckpoints:
  - "Are all dependencies installed?"
  - "Is the development environment configured?"
steps:
  - name: "Run linting"
    description: "Execute lint checks"
    codeSnippet: |
      [extracted from CI or local scripts]
  - name: "Run type checking"
    description: "Verify type correctness"
    codeSnippet: |
      [extracted from CI or local scripts]
  - name: "Run tests"
    description: "Execute test suite"
    codeSnippet: |
      [extracted from CI or local scripts]
  - name: "Run build"
    description: "Verify build succeeds"
    codeSnippet: |
      [extracted from CI or local scripts]
```

## Gap Categories

| Category | CI Example | Local Gap |
|----------|------------|-----------|
| **Security** | `npm audit --audit-level=high` | Often not in package.json scripts |
| **Coverage** | `--coverage --coverageThreshold` | Thresholds may differ locally |
| **E2E** | `cypress run` | May require specific env setup |
| **Docker** | `docker build` | Requires Docker daemon |
| **Secrets** | env var checks | Secrets not available locally |
