# Enhanced Onboarding Insights Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform packmind-onboard from "detecting what tools exist" to "discovering what you didn't know about your own codebase" - generating Standards and Commands that have immediate value.

**Key Insight:** "Uses TypeScript" isn't a wow. "TypeScript strict mode enabled but 47 escape hatches found" is.

**Artifact Focus:** Standards (with rules) and Commands. No skills in v1.

---

## Analysis Pipeline Architecture

Five analyzers, each producing insights that map directly to artifacts:

```
┌─────────────────────────────────────────────────────────────┐
│                    ANALYSIS PIPELINE                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │ Config Gap (B)  │    │ Naming Conv (C) │                │
│  │ Depth 2: grep   │    │ Depth 1: glob   │                │
│  └────────┬────────┘    └────────┬────────┘                │
│           │                      │                          │
│           ▼                      ▼                          │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │ Test Pattern(D) │    │ Script Workflow │                │
│  │ Depth 2: grep   │    │ (E) Depth 1     │                │
│  └────────┬────────┘    └────────┬────────┘                │
│           │                      │                          │
│           │    ┌─────────────────┴──────┐                  │
│           │    │ File Creation (G)      │                  │
│           │    │ Depth 3: AI inference  │                  │
│           │    └───────────┬────────────┘                  │
│           │                │                                │
│           ▼                ▼                                │
│  ┌─────────────────────────────────────────┐               │
│  │         INSIGHT → ARTIFACT MAPPER        │               │
│  │  • Config gap → Standard with rules      │               │
│  │  • Naming pattern → Standard with rules  │               │
│  │  • Test pattern → Standard with rules    │               │
│  │  • Script workflow → Command             │               │
│  │  • File pattern → Command                │               │
│  └─────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

**Analysis Depth Levels:**
- **Depth 1:** File/config scanning (glob + read)
- **Depth 2:** Content pattern matching (grep across files)
- **Depth 3:** Sample-based AI inference (analyze samples, infer pattern)

---

## Task 1: Config Gap Analyzer

**Files:**
- Create: `apps/cli/src/application/services/analyzers/ConfigGapAnalyzer.ts`
- Create: `apps/cli/src/application/services/analyzers/ConfigGapAnalyzer.spec.ts`

**Purpose:** Detect when configs exist but aren't enforced in practice.

**What it scans:**

| Config | What to grep for | Insight pattern |
|--------|------------------|-----------------|
| `tsconfig.json` (strict: true) | `@ts-ignore`, `@ts-expect-error`, `: any` | "Strict mode enabled but X escape hatches found" |
| `.eslintrc*` | `// eslint-disable`, `/* eslint-disable */` | "ESLint configured but X rules disabled inline" |
| `.prettierrc` | Run `prettier --check` or detect mixed formatting | "Prettier configured but X files not formatted" |
| `jest.config` / `vitest.config` | Check coverage thresholds vs actual | "Coverage threshold set to X% but actual is Y%" |

**Output interface:**

```typescript
interface IConfigGapInsight {
  id: string;
  type: 'config-gap';
  config: string;           // "tsconfig.json"
  rule: string;             // "strict mode"
  expected: string;         // "no @ts-ignore"
  found: number;            // 47
  evidence: string[];       // ["src/api/controller.ts:42", ...]
  severity: 'high' | 'medium';
}
```

**Maps to Standard:**

```yaml
name: "TypeScript Strictness"
description: "Enforce strict TypeScript without escape hatches"
rules:
  - content: "Avoid @ts-ignore - fix the type error or use @ts-expect-error with explanation"
    examples:
      positive: "// @ts-expect-error - legacy API returns untyped response"
      negative: "// @ts-ignore"
```

**Implementation steps:**

1. Write failing test for ConfigGapAnalyzer
2. Implement config detection (tsconfig, eslint, prettier)
3. Implement grep-based violation counting
4. Implement insight generation
5. Run tests, commit

---

## Task 2: Naming Convention Analyzer

**Files:**
- Create: `apps/cli/src/application/services/analyzers/NamingConventionAnalyzer.ts`
- Create: `apps/cli/src/application/services/analyzers/NamingConventionAnalyzer.spec.ts`

**Purpose:** Detect implicit naming patterns from file/directory structure.

**What it scans:**

| Pattern type | How to detect | Insight pattern |
|--------------|---------------|-----------------|
| File suffixes | Glob `**/*.{service,controller,module,spec}.ts` | "Services use .service.ts suffix (found 23)" |
| Casing | Analyze filenames per directory | "Components use PascalCase, utils use kebab-case" |
| Directory conventions | Map type → location | "Controllers live in */controllers/, services in */services/" |
| Index barrels | Check for `index.ts` exports | "Modules export via index.ts barrels (17 of 20)" |

**Output interface:**

```typescript
interface INamingPatternInsight {
  id: string;
  type: 'naming-pattern';
  pattern: string;        // "*.controller.ts"
  count: number;          // 15
  exceptions: string[];   // ["src/legacy/userCtrl.ts"]
  consistency: number;    // 0.94 (94% follow pattern)
  evidence: string[];
}
```

**Maps to Standard:**

```yaml
name: "File Naming Conventions"
description: "Consistent file naming based on detected patterns"
rules:
  - content: "Name controller files with .controller.ts suffix"
    examples:
      positive: "user.controller.ts"
      negative: "userCtrl.ts"
  - content: "Use kebab-case for file names"
    examples:
      positive: "user-profile.service.ts"
      negative: "userProfile.service.ts"
```

**Implementation steps:**

1. Write failing test for NamingConventionAnalyzer
2. Implement suffix detection via glob
3. Implement casing detection
4. Implement consistency scoring
5. Implement insight generation with exceptions
6. Run tests, commit

---

## Task 3: Test Pattern Analyzer

**Files:**
- Create: `apps/cli/src/application/services/analyzers/TestPatternAnalyzer.ts`
- Create: `apps/cli/src/application/services/analyzers/TestPatternAnalyzer.spec.ts`

**Purpose:** Detect how the team writes tests - structure, factories, mocking patterns.

**What it scans:**

| Pattern type | How to detect | Insight pattern |
|--------------|---------------|-----------------|
| Test structure | Grep for `describe`, `it`, `test`, nesting depth | "Tests use nested describe blocks for context" |
| Setup patterns | Grep for `beforeEach`, `beforeAll`, factory imports | "87% of tests use beforeEach for setup" |
| Factory usage | Look for `*Factory.ts`, `create*` helpers | "Test factories exist in test/factories/" |
| Mock patterns | Grep for `jest.mock`, `vi.mock`, `@MockProvider` | "Services mocked via jest.mock at top of file" |
| Assertion style | Grep for `expect().toBe`, `assert`, `should` | "Uses Jest expect style exclusively" |

**Output interface:**

```typescript
interface ITestPatternInsight {
  id: string;
  type: 'test-pattern';
  pattern: string;           // "factory-based setup"
  description: string;       // "Tests create data via factory functions"
  evidence: string[];        // ["test/factories/userFactory.ts", ...]
  frequency: number;         // 0.87 (87% of test files)
  counterExamples: string[]; // Files that don't follow
}
```

**Maps to Standard:**

```yaml
name: "Test Structure"
description: "Consistent test patterns based on codebase conventions"
rules:
  - content: "Use factory functions for test data instead of inline objects"
    examples:
      positive: "const user = createUserFactory({ role: 'admin' })"
      negative: "const user = { id: '1', name: 'test', role: 'admin', ... }"
  - content: "Nest describe blocks to show context: describe('when X')"
    examples:
      positive: "describe('UserService') { describe('when user exists') { it('returns user') } }"
      negative: "it('should return user when user exists')"
```

**Implementation steps:**

1. Write failing test for TestPatternAnalyzer
2. Implement test file discovery
3. Implement pattern grep (describe, it, beforeEach, factories)
4. Implement frequency calculation
5. Implement counter-example detection
6. Run tests, commit

---

## Task 4: Script Workflow Analyzer

**Files:**
- Create: `apps/cli/src/application/services/analyzers/ScriptWorkflowAnalyzer.ts`
- Create: `apps/cli/src/application/services/analyzers/ScriptWorkflowAnalyzer.spec.ts`

**Purpose:** Detect multi-step workflows in scripts and CI, surface gaps.

**What it scans:**

| Source | What to detect | Insight pattern |
|--------|----------------|-----------------|
| `package.json` scripts | Multi-command scripts (`&&` chains) | "Pre-push workflow: lint → test → build" |
| CI files | Jobs/steps sequence | "CI runs typecheck but no local script exists" |
| Script gaps | CI does X but no local equivalent | "CI runs `npm audit` but no script for local" |

**Cross-reference analysis:**

```
package.json scripts    CI workflow
─────────────────────   ────────────────
lint ✓                  lint ✓
test ✓                  test ✓
build ✓                 build ✓
(missing)               typecheck ✓     ← GAP
(missing)               audit ✓         ← GAP
```

**Output interface:**

```typescript
interface IWorkflowInsight {
  id: string;
  type: 'workflow-gap';
  name: string;              // "pre-commit-check"
  steps: string[];           // ["lint", "typecheck", "test"]
  source: 'scripts' | 'ci';
  gap?: string;              // "No local script, only in CI"
  evidence: string[];        // ["package.json", ".github/workflows/ci.yml"]
}
```

**Maps to Command:**

```yaml
name: "Pre-PR Check"
summary: "Run the same checks CI will run, locally"
whenToUse:
  - "Before pushing a PR"
  - "After major changes"
steps:
  - name: "Lint"
    description: "Run ESLint on changed files"
    codeSnippet: "npm run lint"
  - name: "Typecheck"
    description: "Verify TypeScript compilation"
    codeSnippet: "npm run typecheck"
  - name: "Test"
    description: "Run affected tests"
    codeSnippet: "npm run test:affected"
```

**Implementation steps:**

1. Write failing test for ScriptWorkflowAnalyzer
2. Implement package.json scripts parser
3. Implement CI file parser (GitHub Actions, GitLab CI)
4. Implement gap detection (CI vs local)
5. Implement insight generation
6. Run tests, commit

---

## Task 5: File Creation Pattern Analyzer

**Files:**
- Create: `apps/cli/src/application/services/analyzers/FileCreationPatternAnalyzer.ts`
- Create: `apps/cli/src/application/services/analyzers/FileCreationPatternAnalyzer.spec.ts`

**Purpose:** AI samples similar files, infers creation pattern, generates command.

**What it scans:**

| File type | How to detect pattern | Command output |
|-----------|----------------------|----------------|
| Services | Sample 3 `*.service.ts`, find common structure | "Create Service" command |
| Controllers | Sample 3 `*.controller.ts`, extract boilerplate | "Create Controller" command |
| UseCases | Sample 3 `*UseCase.ts`, detect base class + deps | "Create UseCase" command |
| Components | Sample 3 React/Vue components, find structure | "Create Component" command |

**Output interface:**

```typescript
interface IFilePatternInsight {
  id: string;
  type: 'file-pattern';
  fileType: string;           // "UseCase"
  sampleFiles: string[];      // 3 files analyzed
  commonElements: {
    baseClass?: string;       // "AbstractUseCase"
    imports: string[];        // ["@nestjs/common", "Logger"]
    decorators: string[];     // ["@Injectable()"]
    constructorDeps: string[];// ["Logger", "Repository"]
    methods: string[];        // ["execute()"]
  };
  variableElements: string[]; // What changes per file
  evidence: string[];
}
```

**AI inference approach:**

```typescript
// Sample 3 files of same type
const samples = await this.sampleFiles('**/*UseCase.ts', 3);

// Extract common patterns via AI
const pattern = await this.aiInferPattern(samples, {
  prompt: `Analyze these files. Extract:
    1. What's identical across all (boilerplate)
    2. What varies (customization points)
    3. The creation pattern as steps`
});
```

**Maps to Command:**

```yaml
name: "Create UseCase"
summary: "Create a new UseCase following project conventions"
contextValidationCheckpoints:
  - "What is the UseCase name?"
  - "What entity/domain does it operate on?"
  - "What repository does it need?"
steps:
  - name: "Create file"
    description: "Create {Name}UseCase.ts in the domain folder"
    codeSnippet: |
      @Injectable()
      export class {Name}UseCase extends AbstractUseCase {
        constructor(
          private readonly logger: Logger,
          private readonly {entity}Repository: I{Entity}Repository,
        ) {
          super();
        }

        async execute(command: {Name}Command): Promise<{ReturnType}> {
          // Implementation
        }
      }
  - name: "Create test"
    description: "Create {Name}UseCase.spec.ts with standard test structure"
  - name: "Export from module"
    description: "Add to module providers and exports"
```

**Implementation steps:**

1. Write failing test for FileCreationPatternAnalyzer
2. Implement file sampling by pattern
3. Implement AI pattern inference (or rule-based extraction)
4. Implement common element extraction
5. Implement command generation
6. Run tests, commit

---

## Task 6: Insight to Artifact Mapper

**Files:**
- Create: `apps/cli/src/application/services/InsightToArtifactMapper.ts`
- Create: `apps/cli/src/application/services/InsightToArtifactMapper.spec.ts`

**Purpose:** Convert insights into Standards and Commands.

**Mapping rules:**

```
CONFIG GAP ──────────────────────► STANDARD
"47 @ts-ignore found"               "TypeScript Strictness"
                                    └─► Rule: Avoid @ts-ignore

NAMING PATTERN ──────────────────► STANDARD
"94% use .controller.ts"            "File Naming Conventions"
                                    └─► Rule: Use suffix
                                    └─► Rule: Use kebab-case

TEST PATTERN ────────────────────► STANDARD
"87% use factories"                 "Test Structure"
                                    └─► Rule: Use factories
                                    └─► Rule: Nest describes

WORKFLOW GAP ────────────────────► COMMAND
"CI runs 5, local runs 3"           "Pre-PR Check"
                                    └─► Steps to run locally

FILE PATTERN ────────────────────► COMMAND
"UseCases share structure"          "Create UseCase"
                                    └─► Steps + boilerplate
```

**Priority scoring:**

```typescript
// Higher score = show first in preview
function calculateScore(insight: IInsight): number {
  const consistencyWeight = 0.4;
  const fileCountWeight = 0.3;
  const severityWeight = 0.3;

  return (
    (insight.consistency || 0) * consistencyWeight +
    (Math.min(insight.fileCount || 0, 100) / 100) * fileCountWeight +
    (insight.severity === 'high' ? 1 : 0.5) * severityWeight
  );
}
```

**Implementation steps:**

1. Write failing test for InsightToArtifactMapper
2. Implement insight type → artifact type mapping
3. Implement Standard generation from insights
4. Implement Command generation from insights
5. Implement priority scoring
6. Run tests, commit

---

## Task 7: Update AggressiveOnboardingUseCase

**Files:**
- Modify: `apps/cli/src/application/useCases/AggressiveOnboardingUseCase.ts`
- Modify: `apps/cli/src/application/useCases/AggressiveOnboardingUseCase.spec.ts`

**Changes:**

1. Inject all 5 new analyzers
2. Run analyzers in parallel
3. Collect and merge insights
4. Use InsightToArtifactMapper for artifact generation
5. Update output format

```typescript
export class AggressiveOnboardingUseCase {
  constructor(
    private configGapAnalyzer: ConfigGapAnalyzer,
    private namingConventionAnalyzer: NamingConventionAnalyzer,
    private testPatternAnalyzer: TestPatternAnalyzer,
    private scriptWorkflowAnalyzer: ScriptWorkflowAnalyzer,
    private fileCreationPatternAnalyzer: FileCreationPatternAnalyzer,
    private insightToArtifactMapper: InsightToArtifactMapper,
    // ... existing deps
  ) {}

  async generateContent(projectPath: string): Promise<IOnboardingResult> {
    // Run all analyzers in parallel
    const [configGaps, namingPatterns, testPatterns, workflows, filePatterns] =
      await Promise.all([
        this.configGapAnalyzer.analyze(projectPath),
        this.namingConventionAnalyzer.analyze(projectPath),
        this.testPatternAnalyzer.analyze(projectPath),
        this.scriptWorkflowAnalyzer.analyze(projectPath),
        this.fileCreationPatternAnalyzer.analyze(projectPath),
      ]);

    // Merge and rank insights
    const insights = this.mergeAndRank([
      ...configGaps,
      ...namingPatterns,
      ...testPatterns,
      ...workflows,
      ...filePatterns,
    ]);

    // Generate artifacts
    const artifacts = this.insightToArtifactMapper.map(insights);

    return { insights, artifacts };
  }
}
```

---

## Task 8: Update CLI Output Format

**Files:**
- Modify: `apps/cli/src/infra/commands/OnboardCommand.ts`

**New output format:**

```
packmind-onboard: generating onboarding pack (read-only)...

Analyzed 847 files across 12 directories

┌─────────────────────────────────────────────────────────────┐
│ INSIGHTS                                                    │
├─────────────────────────────────────────────────────────────┤
│ 1. TypeScript strict mode enabled but 47 escape hatches    │
│    evidence: tsconfig.json, src/**/*.ts                     │
│                                                             │
│ 2. 94% of controllers use .controller.ts, 2 don't          │
│    evidence: src/controllers/                               │
│                                                             │
│ 3. CI runs typecheck + audit, no local scripts exist       │
│    evidence: .github/workflows/ci.yml, package.json         │
│                                                             │
│ 4. All 12 UseCases extend AbstractUseCase with same deps   │
│    evidence: src/application/useCases/*.ts                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ GENERATED ARTIFACTS                                         │
├─────────────────────────────────────────────────────────────┤
│ Standards (3):                                              │
│   • TypeScript Strictness (2 rules)                        │
│   • File Naming Conventions (3 rules)                      │
│   • Test Structure (2 rules)                               │
│                                                             │
│ Commands (2):                                               │
│   • Pre-PR Check (5 steps)                                 │
│   • Create UseCase (3 steps)                               │
└─────────────────────────────────────────────────────────────┘

Draft: ~/.packmind/drafts/onboard-2026-01-28.md

[a] apply to repo  [s] send to Packmind  [e] open draft  [q] quit
```

---

## Task 9: Update packmind-onboard Skill

**Files:**
- Modify: `packages/coding-agent/src/infra/repositories/defaultSkillsDeployer/OnboardDeployer.ts`

Update skill content to reflect new insight-driven output format.

---

## Task 10: Integration Testing

**Files:**
- Create: `apps/cli/src/application/useCases/EnhancedOnboardingIntegration.spec.ts`

Test the full flow:
1. Run against current repo
2. Verify insights are generated
3. Verify artifacts have insight references
4. Verify output format is correct

---

## Draft Output Structure

**JSON:**

```typescript
interface IOnboardingDraft {
  meta: {
    generated_at: string;
    repo_fingerprint: string;
    files_analyzed: number;
  };
  insights: IInsight[];
  artifacts: {
    standards: IGeneratedStandard[];
    commands: IGeneratedCommand[];
  };
  evidence_index: Record<string, string[]>;
}
```

**Markdown:**

```markdown
# Packmind Onboarding Draft

> Generated 2026-01-28. Review before applying.

## Insights

### 1. TypeScript strict mode enabled but 47 escape hatches
- **Evidence:** tsconfig.json, src/**/*.ts
- **Severity:** high

### 2. 94% of controllers use .controller.ts, 2 don't
- **Evidence:** src/controllers/
- **Exceptions:** src/legacy/userCtrl.ts, src/legacy/authCtrl.ts

...

## Generated Standards

### TypeScript Strictness
Based on insight #1

**Rules:**
1. Avoid @ts-ignore - fix the type error or use @ts-expect-error with explanation

...

## Generated Commands

### Pre-PR Check
Based on insight #3

**Steps:**
1. Lint - Run ESLint on changed files
2. Typecheck - Verify TypeScript compilation
...
```

---

## Success Criteria

- [ ] Insights reveal non-obvious facts ("47 @ts-ignore" not "Uses TypeScript")
- [ ] Every artifact references its source insight
- [ ] Standards have actionable rules with examples
- [ ] Commands have concrete steps with code snippets
- [ ] Preview fits in terminal (max 4 insights shown)
- [ ] User can apply, send, or quit at each step
- [ ] All analyzers have tests
- [ ] Integration test passes on current repo

---

## Implementation Notes

- **Parallel execution:** Run all 5 analyzers concurrently
- **Fail gracefully:** If one analyzer fails, continue with others
- **Cap insights:** Show max 4 in preview, all in draft file
- **Evidence required:** No insight without file path evidence
- **Depth limits:** Don't analyze more than 100 files per pattern

## References

- Current implementation: `apps/cli/src/application/useCases/AggressiveOnboardingUseCase.ts`
- Skill deployer: `packages/coding-agent/src/infra/repositories/defaultSkillsDeployer/OnboardDeployer.ts`
- Existing plan: `docs/plans/2026-01-26-aggressive-onboarding.md`
