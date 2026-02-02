# packmind-onboard Skill Redesign

**Goal:** Create a skill that guides Claude through codebase analysis to discover "wow" insights, then generate Standards and Commands directly.

**Key insight:** The skill IS the analyzer. Claude does the work - no CLI needed for analysis.

---

## Skill Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    SKILL EXECUTION FLOW                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. ANALYZE (Claude reads files, greps, discovers)          │
│     ├── Config gap analysis                                 │
│     ├── Naming convention analysis                          │
│     ├── Test pattern analysis                               │
│     ├── Workflow gap analysis                               │
│     └── File creation pattern analysis                      │
│                                                             │
│  2. SYNTHESIZE (Claude generates artifacts)                 │
│     ├── Map insights → Standards with rules                 │
│     └── Map insights → Commands with steps                  │
│                                                             │
│  3. PRESENT (Claude shows results, prompts user)            │
│     ├── Show top 3-4 insights with evidence                 │
│     ├── List generated artifacts                            │
│     └── Prompt: [a]pply | [s]end | [q]uit                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Updated Skill Content

```markdown
---
name: 'packmind-onboard'
description: "Analyze codebase to discover insights, generate personalized Standards and Commands"
license: 'Complete terms in LICENSE.txt'
---

# packmind-onboard

Action skill. Analyzes your codebase to discover things you didn't know, then generates personalized Standards and Commands.

**Draft-first:** nothing is written or sent unless you explicitly choose it.

## What This Skill Produces

- **Insights** - Non-obvious discoveries about your codebase (config gaps, inconsistencies, patterns)
- **Standards** - Rules derived from insights, ready to enforce with AI agents
- **Commands** - Workflows derived from insights, automating common patterns

## Execution Flow

### Phase 1: Announce

Print exactly:
```
packmind-onboard: analyzing codebase (read-only)...
```

### Phase 2: Analyze

Run each analysis in sequence. For each, use the tools available (Read, Grep, Glob) to gather evidence.

#### 2.1 Config Gap Analysis

**Goal:** Find configs that exist but aren't enforced.

**Steps:**
1. Read `tsconfig.json` - check if `strict: true`
2. If strict mode enabled, grep for violations:
   - `@ts-ignore` comments
   - `@ts-expect-error` without explanation
   - `: any` type annotations
3. Count violations, note top 5 file paths as evidence
4. Read `.eslintrc*` or `eslint.config.*` - check if exists
5. If ESLint configured, grep for:
   - `eslint-disable` comments
   - `eslint-disable-line` comments
   - `eslint-disable-next-line` comments
6. Count violations, note top 5 file paths

**Insight format:**
```
CONFIG GAP: [config] enabled but [N] violations found
Evidence: [file1:line], [file2:line], ...
Severity: high (>20 violations) | medium (5-20) | low (<5)
```

**Only report if:** violations > 0 AND config exists

#### 2.2 Naming Convention Analysis

**Goal:** Find implicit naming patterns and inconsistencies.

**Steps:**
1. Glob for `**/*.controller.ts` - count matches
2. Glob for `**/*Controller.ts` or `**/*Ctrl.ts` - count as exceptions
3. Calculate consistency: matches / (matches + exceptions)
4. Repeat for: `.service.ts`, `.module.ts`, `.repository.ts`, `UseCase.ts`
5. Check file casing in `src/`:
   - Count kebab-case files (has `-`)
   - Count PascalCase files (starts uppercase)
   - Count camelCase files (starts lowercase, has uppercase)
   - Identify dominant pattern and exceptions

**Insight format:**
```
NAMING PATTERN: [N]% of [type] files use [pattern], [M] don't
Evidence: [matching files...], exceptions: [non-matching files...]
Severity: medium (consistency < 90%) | low (>= 90%)
```

**Only report if:** exceptions exist AND total files >= 3

#### 2.3 Test Pattern Analysis

**Goal:** Find how tests are structured, detect inconsistencies.

**Steps:**
1. Glob for `**/*.spec.ts` or `**/*.test.ts`
2. Sample 5-10 test files, read each
3. For each, detect:
   - Factory usage: `createXxxFactory`, `Factory(`, `import.*factory`
   - Nested describes: `describe(` inside another `describe(`
   - beforeEach usage: `beforeEach(`
   - AAA comments: `// Arrange`, `// Act`, `// Assert`
4. Calculate frequency of each pattern across files
5. Note files that DON'T follow the dominant pattern

**Insight format:**
```
TEST PATTERN: [N]% of tests use [pattern], [M] don't
Evidence: [files with pattern...], counter-examples: [files without...]
Severity: medium (frequency 50-80%) | low (>80%)
```

**Only report if:** pattern frequency between 30% and 95% (interesting variation)

#### 2.4 Workflow Gap Analysis

**Goal:** Find CI steps that can't be run locally.

**Steps:**
1. Read `package.json` - extract `scripts` object
2. Read `.github/workflows/*.yml` or `.gitlab-ci.yml`
3. Extract all `npm run X` or `yarn X` or `pnpm X` commands from CI
4. Compare: which CI commands have no local script equivalent?
5. Note the gaps

**Insight format:**
```
WORKFLOW GAP: CI runs [N] commands with no local equivalent
CI steps: [lint, test, typecheck, audit, ...]
Local scripts: [lint, test, ...]
Missing locally: [typecheck, audit]
Evidence: .github/workflows/ci.yml, package.json
Severity: high (>=2 missing) | medium (1 missing)
```

**Only report if:** at least 1 command missing locally

#### 2.5 File Creation Pattern Analysis

**Goal:** Find common boilerplate in similar files to generate creation commands.

**Steps:**
1. Glob for pattern (e.g., `**/*UseCase.ts`) - need at least 3 matches
2. Read 3-5 sample files
3. Extract common elements:
   - Base class: `extends AbstractXxx`
   - Decorators: `@Injectable()`, `@Controller()`, etc.
   - Common imports: which imports appear in ALL files
   - Constructor dependencies: what's injected in ALL files
   - Common methods: which method names appear in ALL files
4. Extract variable elements:
   - Class name (always varies)
   - Specific imports (vary per file)
   - Method implementations (vary)

**Insight format:**
```
FILE PATTERN: All [N] [FileType]s share common structure
Base class: [AbstractXxx]
Common decorators: [@Injectable()]
Common constructor deps: [Logger, Repository]
Common methods: [execute()]
Evidence: [sample files...]
```

**Only report if:** clear common structure found (base class OR >=2 common decorators)

### Phase 3: Synthesize Artifacts

Based on insights, generate Standards and Commands.

#### 3.1 Generate Standards (from config gaps, naming, test patterns)

For each relevant insight, create a Standard:

**From CONFIG GAP insight:**
```yaml
name: "[Config] Enforcement"
summary: "Enforce [config] by eliminating bypass patterns"
description: "Based on: [insight title]. [insight description]"
rules:
  - content: "Avoid [violation pattern] - [alternative approach]"
    examples:
      positive: "[good example]"
      negative: "[bad example from codebase]"
```

**From NAMING PATTERN insight:**
```yaml
name: "File Naming Conventions"
summary: "Apply consistent [pattern] naming across codebase"
description: "Based on: [insight title]. [consistency]% follow this pattern."
rules:
  - content: "Name [file type] files with [pattern] suffix"
    examples:
      positive: "[example from codebase]"
      negative: "[exception from codebase]"
```

**From TEST PATTERN insight:**
```yaml
name: "Test Structure Standards"
summary: "Apply consistent [pattern] in tests"
description: "Based on: [insight title]. [frequency]% of tests use this pattern."
rules:
  - content: "[pattern description]"
    examples:
      positive: "[from file that follows]"
      negative: "[from file that doesn't]"
```

#### 3.2 Generate Commands (from workflow gaps, file patterns)

**From WORKFLOW GAP insight:**
```yaml
name: "Pre-PR Check"
summary: "Run the same checks CI will run, locally"
whenToUse:
  - "Before pushing a PR"
  - "After major changes"
contextValidationCheckpoints:
  - "Are all dependencies installed?"
steps:
  - name: "[Step name]"
    description: "Run [command]"
    codeSnippet: "npm run [script]"
  # One step per CI command, noting which are missing locally
```

**From FILE PATTERN insight:**
```yaml
name: "Create [FileType]"
summary: "Create a new [FileType] following project conventions"
whenToUse:
  - "Adding a new [filetype] to the codebase"
contextValidationCheckpoints:
  - "What is the [FileType] name?"
  - "What domain/module does it belong to?"
steps:
  - name: "Create file"
    description: "Create {Name}[FileType].ts with standard structure"
    codeSnippet: |
      [imports from common]

      [decorators from common]
      export class {Name}[FileType] extends [BaseClass] {
        constructor(
          [common constructor deps]
        ) {
          super();
        }

        [common methods with placeholder implementations]
      }
  - name: "Create test file"
    description: "Create {Name}[FileType].spec.ts"
  - name: "Register in module"
    description: "Add to module providers/exports"
```

### Phase 4: Present Results

Display insights and artifacts in a compact format:

```
============================================================
  PACKMIND ONBOARDING RESULTS
============================================================

INSIGHTS (what we discovered):

  1. TypeScript strict mode enabled but 47 escape hatches found
     evidence: tsconfig.json, src/api/controller.ts, src/services/legacy.ts

  2. 94% of controllers use .controller.ts, 2 don't
     evidence: src/controllers/, exceptions: src/legacy/userCtrl.ts

  3. CI runs typecheck + audit, no local scripts exist
     evidence: .github/workflows/ci.yml, package.json

  4. All 12 UseCases extend AbstractUseCase with same structure
     evidence: src/application/useCases/

GENERATED ARTIFACTS:

  Standards (3):
    • TypeScript Strictness (2 rules)
    • File Naming Conventions (1 rule)
    • Test Structure (2 rules)

  Commands (2):
    • Pre-PR Check (4 steps)
    • Create UseCase (3 steps)

============================================================
```

### Phase 5: Prompt for Action

```
What would you like to do?

[a] Apply artifacts to repo (writes .packmind/standards/, .packmind/commands/)
[p] Preview a specific artifact in detail
[s] Send to Packmind (requires packmind-cli login)
[q] Quit (artifacts shown above can be recreated anytime)

Choice:
```

**If [a] apply:**
1. Create `.packmind/standards/[name].yaml` for each Standard
2. Create `.packmind/commands/[name].yaml` for each Command
3. Show what was written
4. Re-prompt with [s] and [q] only

**If [p] preview:**
1. Ask which artifact to preview
2. Show full YAML content
3. Re-prompt with all options

**If [s] send:**
1. Run `packmind-cli standards create .packmind/standards/[name].yaml` for each
2. Run `packmind-cli commands create .packmind/commands/[name].yaml` for each
3. Report success/failure
4. Done

**If [q] quit:**
```
Done. Run this skill again anytime to regenerate.
```

## Rules

- **Read-only analysis.** Never modify files during analysis phase.
- **Evidence required.** Every insight must have file path evidence.
- **No fluff.** Keep output tight - max 4 insights shown.
- **Draft-first.** Only write/send with explicit user choice.
- **Wow factor.** Skip obvious insights ("Uses TypeScript"). Report surprises.

## Insight Quality Checklist

Before reporting an insight, verify:
- [ ] It reveals something non-obvious
- [ ] It has concrete file path evidence
- [ ] It maps to an actionable Standard or Command
- [ ] The user probably didn't know this

**Bad insight:** "Project uses TypeScript" (obvious)
**Good insight:** "TypeScript strict mode enabled but 47 @ts-ignore found" (surprising)

**Bad insight:** "Tests exist" (obvious)
**Good insight:** "87% of tests use factories, 13% use inline objects" (actionable)

## Failure Handling

**If no insights found:**
```
Analysis complete. No significant insights discovered.

Your codebase appears consistent! Possible reasons:
- Configs are well-enforced
- Naming is consistent
- Tests follow uniform patterns
- CI matches local scripts

Try running on a larger/older codebase, or ask me to look for specific patterns.
```

**If file read fails:**
```
Couldn't read [file]. Skipping this analysis.
```
Continue with other analyses.

**If packmind-cli not installed (for send):**
```
packmind-cli not found. Install with: npm install -g @packmind/cli
Then login with: packmind-cli login
```
```

---

## Implementation

The skill goes in `OnboardDeployer.ts`. Here's the updated deployer:

**File:** `packages/coding-agent/src/infra/repositories/defaultSkillsDeployer/OnboardDeployer.ts`

The skill content above replaces the existing `getOnboardSkillMd()` function.

---

## What Changes From Current Skill

| Current | New |
|---------|-----|
| Calls `packmind-cli onboard --dry-run` | Claude does analysis directly |
| CLI generates insights | Claude generates insights via Read/Grep/Glob |
| CLI outputs draft files | Claude generates artifacts inline |
| Skill parses CLI output | Skill IS the analyzer |
| Generic baseline items | Specific "wow" insights with evidence |

---

## Testing the Skill

After updating `OnboardDeployer.ts`:

1. Deploy default skills to a test project
2. Invoke the skill: "onboard this project to packmind"
3. Verify Claude:
   - Reads config files (tsconfig, eslint)
   - Greps for violations
   - Globs for naming patterns
   - Reports insights with evidence
   - Generates Standards and Commands
   - Prompts for action

---

## Success Criteria

- [ ] Skill guides Claude through 5 analysis types
- [ ] Each analysis uses appropriate tools (Read, Grep, Glob)
- [ ] Insights have file path evidence
- [ ] Insights reveal non-obvious facts
- [ ] Standards generated from config/naming/test insights
- [ ] Commands generated from workflow/file pattern insights
- [ ] User prompted before any writes
- [ ] Artifacts written to `.packmind/` on apply
