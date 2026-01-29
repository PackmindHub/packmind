# Packmind-Onboard Draft-First Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rework the packmind-onboard skill to generate a local draft file (md + json) that users review before optionally pushing to Packmind.

**Architecture:** User triggers skill → read-only repo scan → generate draft files locally → user reviews → explicit approval → push to Packmind → confirm persistence.

**Tech Stack:** TypeScript, cmd-ts (CLI), existing Packmind Gateway APIs, Jest for testing

---

## Task 0: Extend ProjectScannerService with detectedFiles

**Files:**
- Modify: `apps/cli/src/application/services/ProjectScannerService.ts`
- Modify: `apps/cli/src/application/services/ProjectScannerService.spec.ts`

**Why:** Evidence arrays must contain only verified paths. We need `detectedFiles` in the scan result to filter evidence to real files.

**Step 1: Add detectedFiles to IProjectScanResult interface**

```typescript
// Modify apps/cli/src/application/services/ProjectScannerService.ts
// Update the interface:

export interface IProjectScanResult {
  languages: string[];
  frameworks: string[];
  tools: string[];
  structure: {
    isMonorepo: boolean;
    hasTests: boolean;
    hasSrcDirectory: boolean;
  };
  testFramework?: string;
  packageManager?: string;
  hasTypeScript: boolean;
  hasLinting: boolean;
  detectedFiles: string[];      // NEW: list of config files found at root
  detectedDirectories: string[]; // NEW: list of key directories found
}
```

**Step 2: Collect detected files during scan**

Add a method to track files as they're detected:

```typescript
// In ProjectScannerService class, add:
private detectedFiles: Set<string> = new Set();
private detectedDirectories: Set<string> = new Set();

private trackFile(filename: string): void {
  this.detectedFiles.add(filename);
}

private trackDirectory(dirname: string): void {
  this.detectedDirectories.add(dirname);
}

// Reset at start of scan:
async scanProject(projectPath: string): Promise<IProjectScanResult> {
  this.detectedFiles = new Set();
  this.detectedDirectories = new Set();

  // ... existing scan logic ...

  return {
    // ... existing fields ...
    detectedFiles: Array.from(this.detectedFiles),
    detectedDirectories: Array.from(this.detectedDirectories),
  };
}
```

**Step 3: Update detection methods to track files**

Example for TypeScript detection:
```typescript
private async detectLanguages(projectPath: string, result: IProjectScanResult): Promise<void> {
  // TypeScript
  if (await this.fileExists(path.join(projectPath, 'tsconfig.json'))) {
    result.languages.push('TypeScript');
    this.trackFile('tsconfig.json'); // ADD THIS
  }
  if (await this.fileExists(path.join(projectPath, 'tsconfig.base.json'))) {
    this.trackFile('tsconfig.base.json'); // ADD THIS
  }

  // ... similar for other files ...
}
```

**Step 4: Write test for detectedFiles**

```typescript
// Add to ProjectScannerService.spec.ts
describe('detectedFiles', () => {
  it('includes tsconfig.json when TypeScript is detected', async () => {
    // Setup mock filesystem with tsconfig.json
    const result = await service.scanProject('/test/project');

    expect(result.detectedFiles).toContain('tsconfig.json');
  });
});
```

**Step 5: Run tests**

Run: `nx test cli --testPathPattern=ProjectScannerService`
Expected: PASS

**Step 6: Commit**

```bash
git add apps/cli/src/application/services/ProjectScannerService*
git commit -m "feat(cli): add detectedFiles and detectedDirectories to project scan result"
```

---

## Task 1: Create Draft Schema Types

**Files:**
- Create: `apps/cli/src/domain/types/OnboardingDraft.ts`

**Step 1: Write the draft schema types**

```typescript
// apps/cli/src/domain/types/OnboardingDraft.ts

export type BaselineItemType = 'tooling' | 'structure' | 'convention' | 'agent';
export type ConfidenceLevel = 'high' | 'medium';

export interface IBaselineItem {
  id: string;
  type: BaselineItemType;
  label: string;
  confidence: ConfidenceLevel;
  evidence: string[];
}

export interface IDraftMeta {
  skill: 'packmind-onboard';
  version: string;
  generated_at: string;
  repo_fingerprint: string;
  read_only: true;
}

export interface IDraftSummary {
  languages: string[];
  frameworks: string[];
  tools: string[];
  structure_hints: string[];
}

export interface IOnboardingDraft {
  meta: IDraftMeta;
  summary: IDraftSummary;
  baseline_items: IBaselineItem[];
  redactions: string[];
  notes: string[];
}

export interface IOnboardingState {
  last_run_at: string | null;
  last_draft_paths: {
    json: string | null;
    md: string | null;
  };
  repo_fingerprint: string | null;
  last_push_status: {
    status: 'sent' | 'unsent';
    timestamp: string | null;
  };
  baseline_item_count: number;
}
```

**Step 2: Run lint to verify types are valid**

Run: `nx lint cli`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/cli/src/domain/types/OnboardingDraft.ts
git commit -m "feat(cli): add onboarding draft schema types"
```

---

## Task 2: Create Baseline Item Generator Service

**Files:**
- Create: `apps/cli/src/application/services/BaselineItemGeneratorService.ts`
- Create: `apps/cli/src/application/services/BaselineItemGeneratorService.spec.ts`

**Key principle:** Evidence arrays must ONLY contain verified paths from scanResult.detectedFiles/detectedDirectories.

**Step 1: Write failing test for baseline item generator**

```typescript
// apps/cli/src/application/services/BaselineItemGeneratorService.spec.ts
import { BaselineItemGeneratorService } from './BaselineItemGeneratorService';
import { IProjectScanResult } from './ProjectScannerService';

describe('BaselineItemGeneratorService', () => {
  let service: BaselineItemGeneratorService;

  beforeEach(() => {
    service = new BaselineItemGeneratorService();
  });

  const createScanResult = (overrides: Partial<IProjectScanResult> = {}): IProjectScanResult => ({
    languages: [],
    frameworks: [],
    tools: [],
    structure: { isMonorepo: false, hasTests: false, hasSrcDirectory: false },
    testFramework: undefined,
    packageManager: undefined,
    hasTypeScript: false,
    hasLinting: false,
    detectedFiles: [],
    detectedDirectories: [],
    ...overrides,
  });

  describe('generateBaselineItems', () => {
    describe('when TypeScript is detected', () => {
      it('generates a high-confidence TypeScript baseline item with verified evidence', () => {
        const scanResult = createScanResult({
          languages: ['TypeScript'],
          hasTypeScript: true,
          detectedFiles: ['tsconfig.json', 'package.json'],
        });

        const items = service.generateBaselineItems(scanResult);

        const tsItem = items.find((i) => i.label === 'Uses TypeScript');
        expect(tsItem).toBeDefined();
        expect(tsItem?.type).toBe('tooling');
        expect(tsItem?.confidence).toBe('high');
        expect(tsItem?.evidence).toEqual(['tsconfig.json']);
      });
    });

    describe('evidence filtering', () => {
      it('only includes files that exist in detectedFiles', () => {
        const scanResult = createScanResult({
          languages: ['Python'],
          detectedFiles: ['pyproject.toml'], // Only pyproject.toml exists
        });

        const items = service.generateBaselineItems(scanResult);

        const pythonItem = items.find((i) => i.label === 'Uses Python');
        expect(pythonItem?.evidence).toEqual(['pyproject.toml']);
        expect(pythonItem?.evidence).not.toContain('requirements.txt');
        expect(pythonItem?.evidence).not.toContain('setup.py');
      });

      it('excludes items with no valid evidence', () => {
        const scanResult = createScanResult({
          hasLinting: true,
          detectedFiles: ['package.json'], // No eslint config files
        });

        const items = service.generateBaselineItems(scanResult);

        const eslintItem = items.find((i) => i.label.includes('ESLint'));
        expect(eslintItem).toBeUndefined();
      });
    });

    describe('when generating items', () => {
      it('caps at 10 items maximum', () => {
        const scanResult = createScanResult({
          languages: ['TypeScript', 'JavaScript', 'Python'],
          frameworks: ['NestJS', 'React', 'Express'],
          tools: ['ESLint', 'Prettier', 'Nx'],
          structure: { isMonorepo: true, hasTests: true, hasSrcDirectory: true },
          testFramework: 'jest',
          packageManager: 'npm',
          hasTypeScript: true,
          hasLinting: true,
          detectedFiles: [
            'tsconfig.json', 'package.json', 'pyproject.toml', 'nx.json',
            '.eslintrc.js', '.prettierrc', 'package-lock.json', 'jest.config.js',
          ],
          detectedDirectories: ['packages', 'apps', 'test', 'src'],
        });

        const items = service.generateBaselineItems(scanResult);

        expect(items.length).toBeLessThanOrEqual(10);
      });

      it('generates stable IDs for consistent reruns', () => {
        const scanResult = createScanResult({
          languages: ['TypeScript'],
          hasTypeScript: true,
          detectedFiles: ['tsconfig.json'],
        });

        const items1 = service.generateBaselineItems(scanResult);
        const items2 = service.generateBaselineItems(scanResult);

        expect(items1[0].id).toBe(items2[0].id);
      });
    });

    describe('when monorepo structure is detected', () => {
      it('includes verified directory evidence', () => {
        const scanResult = createScanResult({
          languages: ['TypeScript'],
          hasTypeScript: true,
          structure: { isMonorepo: true, hasTests: false, hasSrcDirectory: false },
          detectedFiles: ['tsconfig.json', 'nx.json'],
          detectedDirectories: ['packages', 'apps'],
        });

        const items = service.generateBaselineItems(scanResult);

        const monorepoItem = items.find((i) => i.label.includes('Monorepo'));
        expect(monorepoItem).toBeDefined();
        expect(monorepoItem?.evidence).toContain('packages/');
        expect(monorepoItem?.evidence).toContain('apps/');
      });
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `nx test cli --testPathPattern=BaselineItemGeneratorService`
Expected: FAIL - BaselineItemGeneratorService not defined

**Step 3: Write BaselineItemGeneratorService implementation**

```typescript
// apps/cli/src/application/services/BaselineItemGeneratorService.ts
import * as crypto from 'crypto';
import {
  IBaselineItem,
  BaselineItemType,
  ConfidenceLevel,
} from '../../domain/types/OnboardingDraft';
import { IProjectScanResult } from './ProjectScannerService';

interface IRawBaselineItem {
  label: string;
  type: BaselineItemType;
  confidence: ConfidenceLevel;
  candidateEvidence: string[]; // Candidate files/dirs to check against scan result
}

export class BaselineItemGeneratorService {
  private readonly MIN_ITEMS = 5;
  private readonly MAX_ITEMS = 10;

  generateBaselineItems(scanResult: IProjectScanResult): IBaselineItem[] {
    const detectedFilesSet = new Set(scanResult.detectedFiles);
    const detectedDirsSet = new Set(scanResult.detectedDirectories);

    const rawItems = this.collectRawItems(scanResult);

    // Filter evidence to only verified files/directories
    const itemsWithVerifiedEvidence = rawItems
      .map((item) => ({
        ...item,
        evidence: this.filterEvidence(item.candidateEvidence, detectedFilesSet, detectedDirsSet),
      }))
      .filter((item) => item.evidence.length > 0); // Exclude items with no valid evidence

    const sortedItems = this.sortByConfidence(itemsWithVerifiedEvidence);
    const cappedItems = this.capItems(sortedItems);

    return cappedItems.map((item) => ({
      id: this.generateStableId(item),
      label: item.label,
      type: item.type,
      confidence: item.confidence,
      evidence: item.evidence,
    }));
  }

  private filterEvidence(
    candidates: string[],
    detectedFiles: Set<string>,
    detectedDirs: Set<string>
  ): string[] {
    return candidates.filter((candidate) => {
      // Check if it's a directory (ends with /)
      if (candidate.endsWith('/')) {
        const dirName = candidate.slice(0, -1);
        return detectedDirs.has(dirName);
      }
      // Check if it's a file
      return detectedFiles.has(candidate);
    });
  }

  private collectRawItems(scanResult: IProjectScanResult): IRawBaselineItem[] {
    const items: IRawBaselineItem[] = [];

    // Languages (high confidence - detected from config files)
    if (scanResult.hasTypeScript) {
      items.push({
        label: 'Uses TypeScript',
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: ['tsconfig.json', 'tsconfig.base.json'],
      });
    }

    if (scanResult.languages.includes('JavaScript') && !scanResult.hasTypeScript) {
      items.push({
        label: 'Uses JavaScript',
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: ['package.json'],
      });
    }

    if (scanResult.languages.includes('Python')) {
      items.push({
        label: 'Uses Python',
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile'],
      });
    }

    if (scanResult.languages.includes('Go')) {
      items.push({
        label: 'Uses Go',
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: ['go.mod'],
      });
    }

    if (scanResult.languages.includes('Java')) {
      items.push({
        label: 'Uses Java',
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: ['pom.xml', 'build.gradle', 'build.gradle.kts'],
      });
    }

    if (scanResult.languages.includes('C#')) {
      items.push({
        label: 'Uses C#',
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: ['*.csproj', '*.sln'], // Will be filtered out if not in detectedFiles
      });
    }

    if (scanResult.languages.includes('Rust')) {
      items.push({
        label: 'Uses Rust',
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: ['Cargo.toml'],
      });
    }

    if (scanResult.languages.includes('PHP')) {
      items.push({
        label: 'Uses PHP',
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: ['composer.json'],
      });
    }

    if (scanResult.languages.includes('Ruby')) {
      items.push({
        label: 'Uses Ruby',
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: ['Gemfile', 'Rakefile'],
      });
    }

    // Frameworks (high confidence - detected from dependencies)
    for (const framework of scanResult.frameworks) {
      items.push({
        label: `Uses ${framework}`,
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: ['package.json', 'composer.json', 'Gemfile', 'requirements.txt', 'pyproject.toml', 'pom.xml', 'build.gradle', 'go.mod', 'Cargo.toml'],
      });
    }

    // Tools (high confidence)
    if (scanResult.hasLinting) {
      items.push({
        label: 'Uses ESLint for linting',
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: ['.eslintrc.js', '.eslintrc.json', '.eslintrc.cjs', '.eslintrc.yaml', '.eslintrc.yml', 'eslint.config.js', 'eslint.config.mjs'],
      });
    }

    if (scanResult.tools.includes('Prettier')) {
      items.push({
        label: 'Uses Prettier for formatting',
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: ['.prettierrc', '.prettierrc.json', '.prettierrc.js', '.prettierrc.yaml', 'prettier.config.js'],
      });
    }

    if (scanResult.tools.includes('Nx')) {
      items.push({
        label: 'Uses Nx build system',
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: ['nx.json'],
      });
    }

    if (scanResult.tools.includes('Turbo')) {
      items.push({
        label: 'Uses Turborepo',
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: ['turbo.json'],
      });
    }

    // Test framework
    if (scanResult.testFramework) {
      const testConfigFiles = this.getTestConfigFiles(scanResult.testFramework);
      items.push({
        label: `Uses ${this.formatFrameworkName(scanResult.testFramework)} for testing`,
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: testConfigFiles,
      });
    }

    // Package manager
    if (scanResult.packageManager) {
      const lockFile = this.getLockFile(scanResult.packageManager);
      items.push({
        label: `Uses ${scanResult.packageManager} package manager`,
        type: 'tooling',
        confidence: 'high',
        candidateEvidence: [lockFile],
      });
    }

    // Structure (uses directories)
    if (scanResult.structure.isMonorepo) {
      items.push({
        label: 'Monorepo structure',
        type: 'structure',
        confidence: 'high',
        candidateEvidence: ['packages/', 'apps/', 'services/', 'libs/'],
      });
    }

    if (scanResult.structure.hasTests) {
      items.push({
        label: 'Has test directory',
        type: 'structure',
        confidence: 'medium',
        candidateEvidence: ['test/', 'tests/', '__tests__/', 'spec/'],
      });
    }

    if (scanResult.structure.hasSrcDirectory) {
      items.push({
        label: 'Uses src/ directory structure',
        type: 'structure',
        confidence: 'medium',
        candidateEvidence: ['src/'],
      });
    }

    return items;
  }

  private getTestConfigFiles(testFramework: string): string[] {
    const configMap: Record<string, string[]> = {
      jest: ['jest.config.js', 'jest.config.ts', 'jest.config.json'],
      vitest: ['vitest.config.js', 'vitest.config.ts', 'vite.config.js', 'vite.config.ts'],
      mocha: ['.mocharc.js', '.mocharc.json', '.mocharc.yaml'],
      pytest: ['pytest.ini', 'pyproject.toml', 'setup.cfg'],
    };
    return configMap[testFramework.toLowerCase()] || ['package.json'];
  }

  private getLockFile(packageManager: string): string {
    const lockFiles: Record<string, string> = {
      npm: 'package-lock.json',
      yarn: 'yarn.lock',
      pnpm: 'pnpm-lock.yaml',
    };
    return lockFiles[packageManager] || 'package.json';
  }

  private sortByConfidence(items: { confidence: ConfidenceLevel }[]): any[] {
    return [...items].sort((a, b) => {
      if (a.confidence === 'high' && b.confidence === 'medium') return -1;
      if (a.confidence === 'medium' && b.confidence === 'high') return 1;
      return 0;
    });
  }

  private capItems<T>(items: T[]): T[] {
    return items.slice(0, this.MAX_ITEMS);
  }

  private generateStableId(item: { type: string; label: string; evidence: string[] }): string {
    const content = `${item.type}:${item.label}:${item.evidence.sort().join(',')}`;
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
  }

  private formatFrameworkName(name: string): string {
    const nameMap: Record<string, string> = {
      nestjs: 'NestJS',
      nextjs: 'Next.js',
      'next.js': 'Next.js',
      react: 'React',
      vue: 'Vue',
      angular: 'Angular',
      express: 'Express',
      django: 'Django',
      fastapi: 'FastAPI',
      jest: 'Jest',
      vitest: 'Vitest',
      mocha: 'Mocha',
      pytest: 'pytest',
    };
    return nameMap[name.toLowerCase()] || name;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `nx test cli --testPathPattern=BaselineItemGeneratorService`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cli/src/application/services/BaselineItemGeneratorService*
git commit -m "feat(cli): add baseline item generator with verified evidence only"
```

---

## Task 3: Create Draft File Writer Service

**Files:**
- Create: `apps/cli/src/application/services/DraftFileWriterService.ts`
- Create: `apps/cli/src/application/services/DraftFileWriterService.spec.ts`

**Step 1: Write failing test for draft file writer**

```typescript
// apps/cli/src/application/services/DraftFileWriterService.spec.ts
import { DraftFileWriterService } from './DraftFileWriterService';
import { IOnboardingDraft } from '../../domain/types/OnboardingDraft';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('DraftFileWriterService', () => {
  let service: DraftFileWriterService;
  let tempDir: string;

  beforeEach(async () => {
    service = new DraftFileWriterService();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'draft-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const createTestDraft = (): IOnboardingDraft => ({
    meta: {
      skill: 'packmind-onboard',
      version: '1.0',
      generated_at: '2026-01-28T10:00:00.000Z',
      repo_fingerprint: 'abc123',
      read_only: true,
    },
    summary: {
      languages: ['typescript'],
      frameworks: ['nestjs'],
      tools: ['eslint'],
      structure_hints: ['monorepo'],
    },
    baseline_items: [
      {
        id: 'item-1',
        type: 'tooling',
        label: 'Uses TypeScript',
        confidence: 'high',
        evidence: ['tsconfig.json'],
      },
    ],
    redactions: [],
    notes: [],
  });

  describe('writeDraftFiles', () => {
    describe('when format is "both"', () => {
      it('writes both JSON and Markdown files', async () => {
        const draft = createTestDraft();

        const result = await service.writeDraftFiles(draft, tempDir, 'both');

        expect(result.jsonPath).toContain('packmind-onboard.draft.json');
        expect(result.mdPath).toContain('packmind-onboard.draft.md');

        const jsonExists = await fs
          .access(result.jsonPath!)
          .then(() => true)
          .catch(() => false);
        const mdExists = await fs
          .access(result.mdPath!)
          .then(() => true)
          .catch(() => false);

        expect(jsonExists).toBe(true);
        expect(mdExists).toBe(true);
      });
    });

    describe('when format is "json"', () => {
      it('writes only JSON file', async () => {
        const draft = createTestDraft();

        const result = await service.writeDraftFiles(draft, tempDir, 'json');

        expect(result.jsonPath).toBeDefined();
        expect(result.mdPath).toBeNull();
      });
    });

    describe('when format is "md"', () => {
      it('writes only Markdown file', async () => {
        const draft = createTestDraft();

        const result = await service.writeDraftFiles(draft, tempDir, 'md');

        expect(result.jsonPath).toBeNull();
        expect(result.mdPath).toBeDefined();
      });
    });
  });

  describe('generateMarkdown', () => {
    it('includes disclaimer at the top', () => {
      const draft = createTestDraft();

      const markdown = service.generateMarkdown(draft);

      expect(markdown).toContain('GENERATED DRAFT');
      expect(markdown).toContain('editable');
      expect(markdown).toContain('delete');
    });

    it('includes baseline items with evidence', () => {
      const draft = createTestDraft();

      const markdown = service.generateMarkdown(draft);

      expect(markdown).toContain('Uses TypeScript');
      expect(markdown).toContain('tsconfig.json');
      expect(markdown).toContain('high');
    });

    it('includes what will be sent section', () => {
      const draft = createTestDraft();

      const markdown = service.generateMarkdown(draft);

      expect(markdown).toContain('What will be sent');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `nx test cli --testPathPattern=DraftFileWriterService`
Expected: FAIL - DraftFileWriterService not defined

**Step 3: Write DraftFileWriterService implementation**

```typescript
// apps/cli/src/application/services/DraftFileWriterService.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { IOnboardingDraft } from '../../domain/types/OnboardingDraft';

export type DraftFormat = 'json' | 'md' | 'both';

export interface IDraftWriteResult {
  jsonPath: string | null;
  mdPath: string | null;
}

export class DraftFileWriterService {
  private readonly JSON_FILENAME = 'packmind-onboard.draft.json';
  private readonly MD_FILENAME = 'packmind-onboard.draft.md';

  async writeDraftFiles(
    draft: IOnboardingDraft,
    outputDir: string,
    format: DraftFormat = 'both'
  ): Promise<IDraftWriteResult> {
    await fs.mkdir(outputDir, { recursive: true });

    const result: IDraftWriteResult = {
      jsonPath: null,
      mdPath: null,
    };

    if (format === 'json' || format === 'both') {
      const jsonPath = path.join(outputDir, this.JSON_FILENAME);
      await fs.writeFile(jsonPath, JSON.stringify(draft, null, 2), 'utf-8');
      result.jsonPath = jsonPath;
    }

    if (format === 'md' || format === 'both') {
      const mdPath = path.join(outputDir, this.MD_FILENAME);
      const markdown = this.generateMarkdown(draft);
      await fs.writeFile(mdPath, markdown, 'utf-8');
      result.mdPath = mdPath;
    }

    return result;
  }

  generateMarkdown(draft: IOnboardingDraft): string {
    const lines: string[] = [];

    // Header with disclaimer
    lines.push('# Packmind Onboarding Draft');
    lines.push('');
    lines.push('> **⚠️ GENERATED DRAFT** - This file was auto-generated by `packmind-onboard`.');
    lines.push('> - This file is **editable** - modify it before sending if needed');
    lines.push('> - You can **delete** this file anytime - nothing has been sent yet');
    lines.push('> - **Nothing is sent to Packmind** until you explicitly confirm');
    lines.push('');
    lines.push('---');
    lines.push('');

    // Meta information
    lines.push('## Scan Information');
    lines.push('');
    lines.push(`- **Generated at:** ${draft.meta.generated_at}`);
    lines.push(`- **Repo fingerprint:** \`${draft.meta.repo_fingerprint}\``);
    lines.push(`- **Read-only scan:** ${draft.meta.read_only ? 'Yes' : 'No'}`);
    lines.push('');

    // Summary
    lines.push('## What We Detected');
    lines.push('');
    if (draft.summary.languages.length > 0) {
      lines.push(`**Languages:** ${draft.summary.languages.join(', ')}`);
    }
    if (draft.summary.frameworks.length > 0) {
      lines.push(`**Frameworks:** ${draft.summary.frameworks.join(', ')}`);
    }
    if (draft.summary.tools.length > 0) {
      lines.push(`**Tools:** ${draft.summary.tools.join(', ')}`);
    }
    if (draft.summary.structure_hints.length > 0) {
      lines.push(`**Structure:** ${draft.summary.structure_hints.join(', ')}`);
    }
    lines.push('');

    // Baseline items
    lines.push('## Baseline Items');
    lines.push('');
    lines.push(`Found **${draft.baseline_items.length}** items to include in your baseline:`);
    lines.push('');

    for (const item of draft.baseline_items) {
      lines.push(`### ${item.label}`);
      lines.push('');
      lines.push(`- **Type:** ${item.type}`);
      lines.push(`- **Confidence:** ${item.confidence}`);
      lines.push(`- **Evidence:** ${item.evidence.map((e) => `\`${e}\``).join(', ')}`);
      lines.push(`- **ID:** \`${item.id}\``);
      lines.push('');
    }

    // What will be sent
    lines.push('---');
    lines.push('');
    lines.push('## What Will Be Sent If You Approve');
    lines.push('');
    lines.push('When you confirm, the following will be sent to Packmind:');
    lines.push('');
    lines.push(`- **${draft.baseline_items.length}** baseline items`);
    lines.push('- Summary of detected technologies');
    lines.push('- Repo fingerprint (for tracking, not repo contents)');
    lines.push('');
    lines.push('**No source code or file contents will be sent.**');
    lines.push('');

    // How to edit/delete/regenerate
    lines.push('---');
    lines.push('');
    lines.push('## How to Proceed');
    lines.push('');
    lines.push('### Edit this draft');
    lines.push('Modify this file or the companion `.json` file before confirming.');
    lines.push('');
    lines.push('### Delete this draft');
    lines.push('Simply delete this file. Nothing will be sent to Packmind.');
    lines.push('');
    lines.push('### Regenerate');
    lines.push('Run `packmind-cli onboard` again to rescan and regenerate.');
    lines.push('');
    lines.push('### Send to Packmind');
    lines.push('Run `packmind-cli onboard --send` or follow the CLI prompts.');
    lines.push('');

    return lines.join('\n');
  }
}
```

**Step 4: Run test to verify it passes**

Run: `nx test cli --testPathPattern=DraftFileWriterService`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cli/src/application/services/DraftFileWriterService*
git commit -m "feat(cli): add draft file writer service for md and json output"
```

---

## Task 4: Create Onboarding State Service

**Files:**
- Create: `apps/cli/src/application/services/OnboardingStateService.ts`
- Create: `apps/cli/src/application/services/OnboardingStateService.spec.ts`

**Step 1: Write failing test for onboarding state service**

```typescript
// apps/cli/src/application/services/OnboardingStateService.spec.ts
import { OnboardingStateService } from './OnboardingStateService';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('OnboardingStateService', () => {
  let service: OnboardingStateService;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'state-test-'));
    service = new OnboardingStateService(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('getState', () => {
    describe('when no state file exists', () => {
      it('returns default state', async () => {
        const state = await service.getState('repo-fingerprint-123');

        expect(state.last_run_at).toBeNull();
        expect(state.last_push_status.status).toBe('unsent');
        expect(state.baseline_item_count).toBe(0);
      });
    });

    describe('when state file exists', () => {
      it('returns persisted state', async () => {
        const fingerprint = 'repo-fingerprint-123';
        await service.updateState(fingerprint, {
          last_run_at: '2026-01-28T10:00:00.000Z',
          baseline_item_count: 5,
        });

        const state = await service.getState(fingerprint);

        expect(state.last_run_at).toBe('2026-01-28T10:00:00.000Z');
        expect(state.baseline_item_count).toBe(5);
      });
    });
  });

  describe('updateState', () => {
    it('persists state to disk', async () => {
      const fingerprint = 'repo-fingerprint-456';

      await service.updateState(fingerprint, {
        last_run_at: '2026-01-28T12:00:00.000Z',
        last_draft_paths: {
          json: '/path/to/draft.json',
          md: '/path/to/draft.md',
        },
        last_push_status: {
          status: 'sent',
          timestamp: '2026-01-28T12:05:00.000Z',
        },
        baseline_item_count: 7,
      });

      const state = await service.getState(fingerprint);

      expect(state.last_run_at).toBe('2026-01-28T12:00:00.000Z');
      expect(state.last_draft_paths.json).toBe('/path/to/draft.json');
      expect(state.last_push_status.status).toBe('sent');
    });
  });

  describe('markAsSent', () => {
    it('updates push status to sent with timestamp', async () => {
      const fingerprint = 'repo-fingerprint-789';

      await service.markAsSent(fingerprint);

      const state = await service.getState(fingerprint);
      expect(state.last_push_status.status).toBe('sent');
      expect(state.last_push_status.timestamp).toBeDefined();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `nx test cli --testPathPattern=OnboardingStateService`
Expected: FAIL - OnboardingStateService not defined

**Step 3: Write OnboardingStateService implementation**

Note: Uses `~/.packmind/cli/` to match existing CLI conventions (same as FileCredentialsProvider).

```typescript
// apps/cli/src/application/services/OnboardingStateService.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { IOnboardingState } from '../../domain/types/OnboardingDraft';

// CLI state directory - matches FileCredentialsProvider convention
const CLI_STATE_DIR = path.join(os.homedir(), '.packmind', 'cli');

export class OnboardingStateService {
  private readonly stateDir: string;
  private readonly STATE_FILENAME = 'onboarding-state.json';

  constructor(stateDir?: string) {
    this.stateDir = stateDir || CLI_STATE_DIR;
  }

  async getState(repoFingerprint: string): Promise<IOnboardingState> {
    const states = await this.loadAllStates();
    return states[repoFingerprint] || this.getDefaultState(repoFingerprint);
  }

  async updateState(
    repoFingerprint: string,
    updates: Partial<IOnboardingState>
  ): Promise<void> {
    const states = await this.loadAllStates();
    const currentState = states[repoFingerprint] || this.getDefaultState(repoFingerprint);

    states[repoFingerprint] = {
      ...currentState,
      ...updates,
      repo_fingerprint: repoFingerprint,
    };

    await this.saveAllStates(states);
  }

  async markAsSent(repoFingerprint: string): Promise<void> {
    await this.updateState(repoFingerprint, {
      last_push_status: {
        status: 'sent',
        timestamp: new Date().toISOString(),
      },
    });
  }

  async getDefaultDraftDir(): Promise<string> {
    const draftDir = path.join(this.stateDir, 'drafts');
    await fs.mkdir(draftDir, { recursive: true });
    return draftDir;
  }

  private getDefaultState(repoFingerprint: string): IOnboardingState {
    return {
      last_run_at: null,
      last_draft_paths: {
        json: null,
        md: null,
      },
      repo_fingerprint: repoFingerprint,
      last_push_status: {
        status: 'unsent',
        timestamp: null,
      },
      baseline_item_count: 0,
    };
  }

  private async loadAllStates(): Promise<Record<string, IOnboardingState>> {
    const statePath = path.join(this.stateDir, this.STATE_FILENAME);

    try {
      await fs.mkdir(this.stateDir, { recursive: true });
      const content = await fs.readFile(statePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  private async saveAllStates(states: Record<string, IOnboardingState>): Promise<void> {
    await fs.mkdir(this.stateDir, { recursive: true });
    const statePath = path.join(this.stateDir, this.STATE_FILENAME);
    await fs.writeFile(statePath, JSON.stringify(states, null, 2), 'utf-8');
  }
}
```

**Step 4: Run test to verify it passes**

Run: `nx test cli --testPathPattern=OnboardingStateService`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cli/src/application/services/OnboardingStateService*
git commit -m "feat(cli): add onboarding state service for tracking runs and push status"
```

---

## Task 5: Create Repo Fingerprint Service

**Files:**
- Create: `apps/cli/src/application/services/RepoFingerprintService.ts`
- Create: `apps/cli/src/application/services/RepoFingerprintService.spec.ts`

**Step 1: Write failing test for repo fingerprint service**

```typescript
// apps/cli/src/application/services/RepoFingerprintService.spec.ts
import { RepoFingerprintService } from './RepoFingerprintService';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('RepoFingerprintService', () => {
  let service: RepoFingerprintService;
  let tempDir: string;

  beforeEach(async () => {
    service = new RepoFingerprintService();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fingerprint-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('generateFingerprint', () => {
    it('generates a stable fingerprint for the same path', async () => {
      const fingerprint1 = await service.generateFingerprint(tempDir);
      const fingerprint2 = await service.generateFingerprint(tempDir);

      expect(fingerprint1).toBe(fingerprint2);
    });

    it('generates different fingerprints for different paths', async () => {
      const tempDir2 = await fs.mkdtemp(path.join(os.tmpdir(), 'fingerprint-test-2-'));

      const fingerprint1 = await service.generateFingerprint(tempDir);
      const fingerprint2 = await service.generateFingerprint(tempDir2);

      expect(fingerprint1).not.toBe(fingerprint2);

      await fs.rm(tempDir2, { recursive: true, force: true });
    });

    it('returns a hex string', async () => {
      const fingerprint = await service.generateFingerprint(tempDir);

      expect(fingerprint).toMatch(/^[a-f0-9]+$/);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `nx test cli --testPathPattern=RepoFingerprintService`
Expected: FAIL - RepoFingerprintService not defined

**Step 3: Write RepoFingerprintService implementation**

```typescript
// apps/cli/src/application/services/RepoFingerprintService.ts
import * as crypto from 'crypto';
import * as path from 'path';
import { execSync } from 'child_process';

export class RepoFingerprintService {
  async generateFingerprint(projectPath: string): Promise<string> {
    const components: string[] = [];

    // Use absolute path as base
    const absolutePath = path.resolve(projectPath);
    components.push(absolutePath);

    // Try to get git remote URL if available
    const gitRemote = this.getGitRemoteUrl(projectPath);
    if (gitRemote) {
      components.push(gitRemote);
    }

    const content = components.join(':');
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
  }

  private getGitRemoteUrl(projectPath: string): string | null {
    try {
      const result = execSync('git remote get-url origin', {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return result.trim();
    } catch {
      return null;
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `nx test cli --testPathPattern=RepoFingerprintService`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cli/src/application/services/RepoFingerprintService*
git commit -m "feat(cli): add repo fingerprint service for stable identification"
```

---

## Task 6: Create Draft-First Onboarding Use Case

**Files:**
- Create: `apps/cli/src/application/useCases/DraftOnboardingUseCase.ts`
- Create: `apps/cli/src/application/useCases/DraftOnboardingUseCase.spec.ts`

**Step 1: Write failing test for draft onboarding use case**

```typescript
// apps/cli/src/application/useCases/DraftOnboardingUseCase.spec.ts
import { DraftOnboardingUseCase } from './DraftOnboardingUseCase';
import { stubLogger } from '@packmind/test-utils';

describe('DraftOnboardingUseCase', () => {
  let useCase: DraftOnboardingUseCase;
  let mockProjectScanner: jest.Mocked<any>;
  let mockBaselineGenerator: jest.Mocked<any>;
  let mockDraftWriter: jest.Mocked<any>;
  let mockStateService: jest.Mocked<any>;
  let mockFingerprintService: jest.Mocked<any>;
  let mockGateway: jest.Mocked<any>;

  beforeEach(() => {
    mockProjectScanner = {
      scanProject: jest.fn(),
    };
    mockBaselineGenerator = {
      generateBaselineItems: jest.fn(),
    };
    mockDraftWriter = {
      writeDraftFiles: jest.fn(),
      generateMarkdown: jest.fn(),
    };
    mockStateService = {
      getState: jest.fn(),
      updateState: jest.fn(),
      markAsSent: jest.fn(),
      getDefaultDraftDir: jest.fn(),
    };
    mockFingerprintService = {
      generateFingerprint: jest.fn(),
    };
    mockGateway = {
      pushOnboardingBaseline: jest.fn(),
    };

    useCase = new DraftOnboardingUseCase(
      mockProjectScanner,
      mockBaselineGenerator,
      mockDraftWriter,
      mockStateService,
      mockFingerprintService,
      mockGateway,
      stubLogger()
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateDraft', () => {
    it('scans project and generates draft files', async () => {
      mockFingerprintService.generateFingerprint.mockResolvedValue('fingerprint-123');
      mockProjectScanner.scanProject.mockResolvedValue({
        languages: ['typescript'],
        frameworks: ['nestjs'],
        tools: ['eslint'],
        structure: { isMonorepo: true, hasTests: true, hasSrcDirectory: true },
        testFramework: 'jest',
        packageManager: 'npm',
        hasTypeScript: true,
        hasLinting: true,
      });
      mockBaselineGenerator.generateBaselineItems.mockReturnValue([
        {
          id: 'item-1',
          type: 'tooling',
          label: 'Uses TypeScript',
          confidence: 'high',
          evidence: ['tsconfig.json'],
        },
      ]);
      mockStateService.getDefaultDraftDir.mockResolvedValue('/tmp/drafts');
      mockDraftWriter.writeDraftFiles.mockResolvedValue({
        jsonPath: '/tmp/drafts/packmind-onboard.draft.json',
        mdPath: '/tmp/drafts/packmind-onboard.draft.md',
      });

      const result = await useCase.generateDraft({
        projectPath: '/test/project',
        format: 'both',
      });

      expect(mockProjectScanner.scanProject).toHaveBeenCalledWith('/test/project');
      expect(mockBaselineGenerator.generateBaselineItems).toHaveBeenCalled();
      expect(mockDraftWriter.writeDraftFiles).toHaveBeenCalled();
      expect(result.draft).toBeDefined();
      expect(result.paths.jsonPath).toBeDefined();
    });

    it('updates state after generating draft', async () => {
      mockFingerprintService.generateFingerprint.mockResolvedValue('fingerprint-123');
      mockProjectScanner.scanProject.mockResolvedValue({
        languages: ['typescript'],
        frameworks: [],
        tools: [],
        structure: { isMonorepo: false, hasTests: false, hasSrcDirectory: true },
        testFramework: undefined,
        packageManager: 'npm',
        hasTypeScript: true,
        hasLinting: false,
      });
      mockBaselineGenerator.generateBaselineItems.mockReturnValue([]);
      mockStateService.getDefaultDraftDir.mockResolvedValue('/tmp/drafts');
      mockDraftWriter.writeDraftFiles.mockResolvedValue({
        jsonPath: '/tmp/drafts/packmind-onboard.draft.json',
        mdPath: '/tmp/drafts/packmind-onboard.draft.md',
      });

      await useCase.generateDraft({
        projectPath: '/test/project',
        format: 'both',
      });

      expect(mockStateService.updateState).toHaveBeenCalledWith(
        'fingerprint-123',
        expect.objectContaining({
          last_run_at: expect.any(String),
        })
      );
    });
  });

  describe('sendDraft', () => {
    it('pushes draft to Packmind and marks as sent', async () => {
      const draft = {
        meta: {
          skill: 'packmind-onboard' as const,
          version: '1.0',
          generated_at: '2026-01-28T10:00:00.000Z',
          repo_fingerprint: 'fingerprint-123',
          read_only: true as const,
        },
        summary: {
          languages: ['typescript'],
          frameworks: [],
          tools: [],
          structure_hints: [],
        },
        baseline_items: [],
        redactions: [],
        notes: [],
      };

      mockGateway.pushOnboardingBaseline.mockResolvedValue({ success: true });

      const result = await useCase.sendDraft(draft);

      expect(mockGateway.pushOnboardingBaseline).toHaveBeenCalledWith(draft);
      expect(mockStateService.markAsSent).toHaveBeenCalledWith('fingerprint-123');
      expect(result.success).toBe(true);
    });

    describe('when push fails', () => {
      it('returns error and does not mark as sent', async () => {
        const draft = {
          meta: {
            skill: 'packmind-onboard' as const,
            version: '1.0',
            generated_at: '2026-01-28T10:00:00.000Z',
            repo_fingerprint: 'fingerprint-123',
            read_only: true as const,
          },
          summary: {
            languages: [],
            frameworks: [],
            tools: [],
            structure_hints: [],
          },
          baseline_items: [],
          redactions: [],
          notes: [],
        };

        mockGateway.pushOnboardingBaseline.mockRejectedValue(new Error('Network error'));

        const result = await useCase.sendDraft(draft);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Network error');
        expect(mockStateService.markAsSent).not.toHaveBeenCalled();
      });
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `nx test cli --testPathPattern=DraftOnboardingUseCase`
Expected: FAIL - DraftOnboardingUseCase not defined

**Step 3: Write DraftOnboardingUseCase implementation**

```typescript
// apps/cli/src/application/useCases/DraftOnboardingUseCase.ts
import { PackmindLogger } from '@packmind/logger';
import { ProjectScannerService } from '../services/ProjectScannerService';
import { BaselineItemGeneratorService } from '../services/BaselineItemGeneratorService';
import {
  DraftFileWriterService,
  DraftFormat,
  IDraftWriteResult,
} from '../services/DraftFileWriterService';
import { OnboardingStateService } from '../services/OnboardingStateService';
import { RepoFingerprintService } from '../services/RepoFingerprintService';
import { IOnboardingDraft, IOnboardingState } from '../../domain/types/OnboardingDraft';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';

const origin = 'DraftOnboardingUseCase';

export interface IGenerateDraftCommand {
  projectPath: string;
  format?: DraftFormat;
  outputDir?: string;
}

export interface IGenerateDraftResult {
  draft: IOnboardingDraft;
  paths: IDraftWriteResult;
}

export interface ISendDraftResult {
  success: boolean;
  error?: string;
}

export class DraftOnboardingUseCase {
  constructor(
    private projectScanner: ProjectScannerService,
    private baselineGenerator: BaselineItemGeneratorService,
    private draftWriter: DraftFileWriterService,
    private stateService: OnboardingStateService,
    private fingerprintService: RepoFingerprintService,
    private gateway: IPackmindGateway,
    private logger: PackmindLogger = new PackmindLogger(origin)
  ) {}

  async generateDraft(command: IGenerateDraftCommand): Promise<IGenerateDraftResult> {
    const { projectPath, format = 'both', outputDir } = command;

    // Generate fingerprint
    this.logger.info('Generating repository fingerprint...');
    const repoFingerprint = await this.fingerprintService.generateFingerprint(projectPath);

    // Scan project (read-only)
    this.logger.info('Scanning project (read-only)...');
    const scanResult = await this.projectScanner.scanProject(projectPath);

    this.logScanProgress(scanResult);

    // Generate baseline items
    this.logger.info('Generating baseline items...');
    const baselineItems = this.baselineGenerator.generateBaselineItems(scanResult);

    // Create draft object
    const draft: IOnboardingDraft = {
      meta: {
        skill: 'packmind-onboard',
        version: '1.0',
        generated_at: new Date().toISOString(),
        repo_fingerprint: repoFingerprint,
        read_only: true,
      },
      summary: {
        languages: scanResult.languages,
        frameworks: scanResult.frameworks,
        tools: scanResult.tools,
        structure_hints: this.getStructureHints(scanResult),
      },
      baseline_items: baselineItems,
      redactions: [],
      notes: [],
    };

    // Write draft files
    const targetDir = outputDir || (await this.stateService.getDefaultDraftDir());
    this.logger.info(`Writing draft files to ${targetDir}...`);
    const paths = await this.draftWriter.writeDraftFiles(draft, targetDir, format);

    // Update state
    await this.stateService.updateState(repoFingerprint, {
      last_run_at: new Date().toISOString(),
      last_draft_paths: {
        json: paths.jsonPath,
        md: paths.mdPath,
      },
      baseline_item_count: baselineItems.length,
      repo_fingerprint: repoFingerprint,
    });

    return { draft, paths };
  }

  async sendDraft(draft: IOnboardingDraft): Promise<ISendDraftResult> {
    try {
      this.logger.info('Sending draft to Packmind...');
      await this.gateway.pushOnboardingBaseline(draft);

      await this.stateService.markAsSent(draft.meta.repo_fingerprint);

      this.logger.info('Draft sent successfully!');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send draft: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  async getStatus(projectPath: string): Promise<IOnboardingState> {
    const fingerprint = await this.fingerprintService.generateFingerprint(projectPath);
    return this.stateService.getState(fingerprint);
  }

  private logScanProgress(scanResult: any): void {
    if (scanResult.languages.length > 0) {
      this.logger.info(`Found languages: ${scanResult.languages.join(', ')}`);
    }
    if (scanResult.frameworks.length > 0) {
      this.logger.info(`Found frameworks: ${scanResult.frameworks.join(', ')}`);
    }
    if (scanResult.tools.length > 0) {
      this.logger.info(`Found tools: ${scanResult.tools.join(', ')}`);
    }
    if (scanResult.structure.isMonorepo) {
      this.logger.info('Detected monorepo structure');
    }
  }

  private getStructureHints(scanResult: any): string[] {
    const hints: string[] = [];
    if (scanResult.structure.isMonorepo) hints.push('monorepo');
    if (scanResult.structure.hasTests) hints.push('has-tests');
    if (scanResult.structure.hasSrcDirectory) hints.push('src-directory');
    return hints;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `nx test cli --testPathPattern=DraftOnboardingUseCase`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cli/src/application/useCases/DraftOnboardingUseCase*
git commit -m "feat(cli): add draft-first onboarding use case"
```

---

## Task 7: Add Gateway Method for Pushing Baseline

**Files:**
- Modify: `apps/cli/src/domain/repositories/IPackmindGateway.ts`
- Modify: `apps/cli/src/infra/repositories/PackmindGateway.ts`

**Step 1: Add pushOnboardingBaseline to gateway interface**

```typescript
// Modify apps/cli/src/domain/repositories/IPackmindGateway.ts
// Add to interface:

import { IOnboardingDraft } from '../types/OnboardingDraft';

export interface IPackmindGateway {
  // ... existing methods

  pushOnboardingBaseline(draft: IOnboardingDraft): Promise<{ success: boolean }>;
}
```

**Step 2: Implement pushOnboardingBaseline in gateway**

```typescript
// Modify apps/cli/src/infra/repositories/PackmindGateway.ts
// Add implementation:

import { IOnboardingDraft } from '../../domain/types/OnboardingDraft';

async pushOnboardingBaseline(draft: IOnboardingDraft): Promise<{ success: boolean }> {
  const spaceId = await this.getGlobalSpaceId();

  await this.httpClient.post(
    `/api/spaces/${spaceId}/onboarding/baseline`,
    {
      meta: draft.meta,
      summary: draft.summary,
      baseline_items: draft.baseline_items,
    }
  );

  return { success: true };
}

private async getGlobalSpaceId(): Promise<string> {
  const space = await this.getGlobalSpace();
  return space.id;
}
```

**Step 3: Run lint to verify implementation**

Run: `nx lint cli`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/cli/src/domain/repositories/IPackmindGateway.ts apps/cli/src/infra/repositories/PackmindGateway.ts
git commit -m "feat(cli): add gateway method for pushing onboarding baseline"
```

---

## Task 8: Create Onboard CLI Command

**Files:**
- Modify: `apps/cli/src/infra/commands/OnboardCommand.ts`

**Key improvements:**
- Consent prompt: "Press Enter to continue, Ctrl+C to abort" (no Y/n question)
- Regenerate: Implemented as a loop (not just "run again")
- File opening: Use `spawn` with platform-safe commands
- Logging: Use `consoleLogger` per CLI standards
- Always print short baseline summary

**Step 1: Rewrite OnboardCommand with draft-first flow**

```typescript
// apps/cli/src/infra/commands/OnboardCommand.ts
import { command, flag, option, string, optional } from 'cmd-ts';
import * as readline from 'readline';
import { spawn } from 'child_process';
import { consoleLogger } from '../utils/consoleLogger';
import { PackmindCliHexaFactory } from '../../PackmindCliHexaFactory';
import { DraftFormat } from '../../application/services/DraftFileWriterService';
import { IGenerateDraftResult } from '../../application/useCases/DraftOnboardingUseCase';

export const onboardCommand = command({
  name: 'onboard',
  description: 'Scan project and generate draft baseline for Packmind onboarding',
  args: {
    output: option({
      type: optional(string),
      long: 'output',
      short: 'o',
      description: 'Output directory for draft files',
    }),
    format: option({
      type: optional(string),
      long: 'format',
      short: 'f',
      description: 'Output format: md, json, or both (default: both)',
    }),
    yes: flag({
      long: 'yes',
      short: 'y',
      description: 'Skip review prompt and immediately send to Packmind',
    }),
    dryRun: flag({
      long: 'dry-run',
      short: 'd',
      description: 'Generate draft only, never send to Packmind',
    }),
    print: flag({
      long: 'print',
      short: 'p',
      description: 'Print full draft details to stdout',
    }),
    open: flag({
      long: 'open',
      description: 'Open the generated markdown file in default editor/viewer',
    }),
    send: flag({
      long: 'send',
      description: 'Explicitly send existing draft to Packmind',
    }),
  },
  handler: async (args) => {
    const hexa = await PackmindCliHexaFactory.create();
    const draftUseCase = hexa.getDraftOnboardingUseCase();
    const format = (args.format as DraftFormat) || 'both';

    // Step A: Minimal consent (unless --yes)
    // No Y/n question - just "Press Enter to continue, Ctrl+C to abort"
    if (!args.yes) {
      consoleLogger.log('');
      consoleLogger.log('='.repeat(60));
      consoleLogger.log('  PACKMIND ONBOARDING');
      consoleLogger.log('='.repeat(60));
      consoleLogger.log('');
      consoleLogger.log('This will:');
      consoleLogger.log('  1. Scan your repository (read-only, no modifications)');
      consoleLogger.log('  2. Generate a local draft baseline file');
      consoleLogger.log('  3. Let you review before sending anything');
      consoleLogger.log('');
      consoleLogger.log('Nothing will be sent to Packmind without your approval.');
      consoleLogger.log('');

      await waitForEnterOrAbort('Press Enter to continue, Ctrl+C to abort...');
    }

    // Main loop - allows regeneration without restarting command
    let result: IGenerateDraftResult | null = null;
    let shouldContinue = true;

    while (shouldContinue) {
      // Step B & C: Scan and generate draft
      consoleLogger.log('');
      result = await draftUseCase.generateDraft({
        projectPath: process.cwd(),
        format,
        outputDir: args.output,
      });

      // Always print short summary
      consoleLogger.log('');
      consoleLogger.log(`Generated ${result.draft.baseline_items.length} baseline items`);

      // Print detailed summary if requested
      if (args.print) {
        printDetailedSummary(result);
      }

      // Report file paths
      consoleLogger.log('');
      consoleLogger.log('Draft files:');
      if (result.paths.jsonPath) {
        consoleLogger.log(`  JSON: ${result.paths.jsonPath}`);
      }
      if (result.paths.mdPath) {
        consoleLogger.log(`  Markdown: ${result.paths.mdPath}`);
      }

      // Open in viewer if requested
      if (args.open && result.paths.mdPath) {
        openFile(result.paths.mdPath);
      }

      // Step D: Review gate
      if (args.dryRun) {
        consoleLogger.log('');
        consoleLogger.log('Dry run complete. Draft files generated, nothing sent.');
        return;
      }

      if (args.yes) {
        // Auto-send
        consoleLogger.log('');
        const sendResult = await draftUseCase.sendDraft(result.draft);
        printSendResult(sendResult, result.paths);
        return;
      }

      // Interactive review loop
      const choice = await showReviewMenu(result);

      switch (choice) {
        case 'send':
          consoleLogger.log('');
          const sendResult = await draftUseCase.sendDraft(result.draft);
          printSendResult(sendResult, result.paths);
          shouldContinue = false;
          break;

        case 'edit':
          if (result.paths.mdPath) {
            openFile(result.paths.mdPath);
            consoleLogger.log('');
            consoleLogger.log('File opened. Select [r] to regenerate after editing, or [Enter] to send.');
          }
          break;

        case 'print':
          printDetailedSummary(result);
          break;

        case 'regenerate':
          consoleLogger.log('');
          consoleLogger.log('Regenerating...');
          // Loop continues, will regenerate
          break;

        case 'quit':
          consoleLogger.log('');
          consoleLogger.log('Exited without sending. Your draft files are still available:');
          if (result.paths.jsonPath) consoleLogger.log(`  ${result.paths.jsonPath}`);
          if (result.paths.mdPath) consoleLogger.log(`  ${result.paths.mdPath}`);
          shouldContinue = false;
          break;
      }
    }
  },
});

async function showReviewMenu(result: IGenerateDraftResult): Promise<string> {
  consoleLogger.log('');
  consoleLogger.log('What would you like to do?');
  consoleLogger.log('');
  consoleLogger.log('  [Enter] Send draft to Packmind');
  consoleLogger.log('  [e]     Open draft in viewer');
  consoleLogger.log('  [p]     Print detailed summary');
  consoleLogger.log('  [r]     Regenerate draft');
  consoleLogger.log('  [q]     Quit without sending');
  consoleLogger.log('');

  const choice = await promptChoice('Your choice: ', ['', 'e', 'p', 'r', 'q']);

  const choiceMap: Record<string, string> = {
    '': 'send',
    'e': 'edit',
    'p': 'print',
    'r': 'regenerate',
    'q': 'quit',
  };

  return choiceMap[choice] || 'quit';
}

function printDetailedSummary(result: IGenerateDraftResult): void {
  consoleLogger.log('');
  consoleLogger.log('='.repeat(60));
  consoleLogger.log('  DRAFT SUMMARY');
  consoleLogger.log('='.repeat(60));
  consoleLogger.log('');
  consoleLogger.log(`Languages: ${result.draft.summary.languages.join(', ') || 'none detected'}`);
  consoleLogger.log(`Frameworks: ${result.draft.summary.frameworks.join(', ') || 'none detected'}`);
  consoleLogger.log(`Tools: ${result.draft.summary.tools.join(', ') || 'none detected'}`);
  consoleLogger.log('');
  consoleLogger.log('Baseline items:');
  for (const item of result.draft.baseline_items) {
    consoleLogger.log(`  - ${item.label} (${item.confidence}) [${item.evidence.join(', ')}]`);
  }
}

function printSendResult(sendResult: { success: boolean; error?: string }, paths: any): void {
  if (sendResult.success) {
    consoleLogger.log('');
    consoleLogger.log('✔ Draft reviewed');
    consoleLogger.log('✔ Sent to Packmind');
    consoleLogger.log('✔ Stored successfully');
    consoleLogger.log('');
    consoleLogger.log('Open the app to review and convert baseline items into rules.');
  } else {
    consoleLogger.log('');
    consoleLogger.log('✖ Failed to send draft to Packmind');
    consoleLogger.log(`  Error: ${sendResult.error}`);
    consoleLogger.log('');
    consoleLogger.log('Your draft files are preserved:');
    if (paths.jsonPath) consoleLogger.log(`  ${paths.jsonPath}`);
    if (paths.mdPath) consoleLogger.log(`  ${paths.mdPath}`);
    consoleLogger.log('');
    consoleLogger.log('Try again with: packmind-cli onboard --yes');
  }
}

async function waitForEnterOrAbort(message: string): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, () => {
      rl.close();
      resolve();
    });
  });
}

async function promptChoice(prompt: string, validChoices: string[]): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      if (validChoices.includes(normalized)) {
        resolve(normalized);
      } else {
        resolve('q'); // Default to quit on invalid input
      }
    });
  });
}

/**
 * Opens a file using the platform-appropriate command.
 * Uses spawn for safety (no shell injection).
 */
function openFile(filePath: string): void {
  let command: string;
  let args: string[];

  switch (process.platform) {
    case 'darwin':
      command = 'open';
      args = [filePath];
      break;
    case 'win32':
      command = 'cmd';
      args = ['/c', 'start', '', filePath];
      break;
    default: // Linux and others
      command = 'xdg-open';
      args = [filePath];
      break;
  }

  try {
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    consoleLogger.log(`Opening: ${filePath}`);
  } catch {
    consoleLogger.log(`Could not open file. Please open manually: ${filePath}`);
  }
}
```

**Step 2: Run lint to verify command**

Run: `nx lint cli`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/cli/src/infra/commands/OnboardCommand.ts
git commit -m "feat(cli): rewrite onboard command with draft-first flow and regenerate loop"
```

---

## Task 9: Create Onboard Status Command

**Files:**
- Create: `apps/cli/src/infra/commands/OnboardStatusCommand.ts`
- Modify: `apps/cli/src/main.ts`

**Step 1: Write OnboardStatusCommand**

```typescript
// apps/cli/src/infra/commands/OnboardStatusCommand.ts
import { command, option, string, optional } from 'cmd-ts';
import { PackmindLogger } from '@packmind/logger';
import { PackmindCliHexaFactory } from '../../PackmindCliHexaFactory';

const origin = 'OnboardStatusCommand';

export const onboardStatusCommand = command({
  name: 'onboard-status',
  description: 'Show onboarding status for current project',
  args: {
    path: option({
      type: optional(string),
      long: 'path',
      short: 'p',
      description: 'Project path (default: current directory)',
    }),
  },
  handler: async (args) => {
    const logger = new PackmindLogger(origin);
    const hexa = await PackmindCliHexaFactory.create();
    const draftUseCase = hexa.getDraftOnboardingUseCase();

    const projectPath = args.path || process.cwd();
    const status = await draftUseCase.getStatus(projectPath);

    console.log('');
    console.log('='.repeat(60));
    console.log('  ONBOARDING STATUS');
    console.log('='.repeat(60));
    console.log('');

    if (!status.last_run_at) {
      console.log('No onboarding has been run for this project yet.');
      console.log('');
      console.log('Run `packmind-cli onboard` to get started.');
      return;
    }

    console.log(`Last run:          ${status.last_run_at}`);
    console.log(`Baseline items:    ${status.baseline_item_count}`);
    console.log(`Repo fingerprint:  ${status.repo_fingerprint}`);
    console.log('');

    console.log('Draft files:');
    if (status.last_draft_paths.json) {
      console.log(`  JSON: ${status.last_draft_paths.json}`);
    }
    if (status.last_draft_paths.md) {
      console.log(`  Markdown: ${status.last_draft_paths.md}`);
    }
    console.log('');

    console.log('Push status:');
    if (status.last_push_status.status === 'sent') {
      console.log(`  ✔ Sent to Packmind at ${status.last_push_status.timestamp}`);
    } else {
      console.log('  ○ Not yet sent to Packmind');
    }
    console.log('');
  },
});
```

**Step 2: Register command in main.ts**

```typescript
// Modify apps/cli/src/main.ts
// Add import:
import { onboardStatusCommand } from './infra/commands/OnboardStatusCommand';

// Add to subcommands:
'onboard-status': onboardStatusCommand,
```

**Step 3: Run lint to verify**

Run: `nx lint cli`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/cli/src/infra/commands/OnboardStatusCommand.ts apps/cli/src/main.ts
git commit -m "feat(cli): add onboard-status command for tracking onboarding state"
```

---

## Task 10: Wire Up Services in PackmindCliHexa

**Files:**
- Modify: `apps/cli/src/PackmindCliHexa.ts`

**Step 1: Add draft onboarding services to hexa**

```typescript
// Modify apps/cli/src/PackmindCliHexa.ts
// Add imports:
import { BaselineItemGeneratorService } from './application/services/BaselineItemGeneratorService';
import { DraftFileWriterService } from './application/services/DraftFileWriterService';
import { OnboardingStateService } from './application/services/OnboardingStateService';
import { RepoFingerprintService } from './application/services/RepoFingerprintService';
import { DraftOnboardingUseCase } from './application/useCases/DraftOnboardingUseCase';

// Add private fields:
private baselineItemGenerator: BaselineItemGeneratorService;
private draftFileWriter: DraftFileWriterService;
private onboardingStateService: OnboardingStateService;
private repoFingerprintService: RepoFingerprintService;

// Initialize in constructor:
this.baselineItemGenerator = new BaselineItemGeneratorService();
this.draftFileWriter = new DraftFileWriterService();
this.onboardingStateService = new OnboardingStateService();
this.repoFingerprintService = new RepoFingerprintService();

// Add getter:
getDraftOnboardingUseCase(): DraftOnboardingUseCase {
  return new DraftOnboardingUseCase(
    this.projectScanner,
    this.baselineItemGenerator,
    this.draftFileWriter,
    this.onboardingStateService,
    this.repoFingerprintService,
    this.packmindGateway
  );
}
```

**Step 2: Run lint and tests**

Run: `nx lint cli && nx test cli`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/cli/src/PackmindCliHexa.ts
git commit -m "feat(cli): wire up draft onboarding services in hexa"
```

---

## Task 11: Update packmind-onboard Skill Content

**Files:**
- Modify: `packages/coding-agent/src/infra/repositories/defaultSkillsDeployer/OnboardDeployer.ts`

**Step 1: Rewrite the skill content for draft-first flow**

```typescript
// Modify packages/coding-agent/src/infra/repositories/defaultSkillsDeployer/OnboardDeployer.ts
// Replace getOnboardSkillMd function:

function getOnboardSkillMd(agentName: string): string {
  return `---
name: 'packmind-onboard'
description: "Draft-first onboarding for Packmind. Scans the project, generates a reviewable draft, and optionally pushes to Packmind after user approval."
license: 'Complete terms in LICENSE.txt'
---

# Packmind Draft-First Onboarding

This skill guides you through onboarding your project to Packmind using a **draft-first** approach: scan → generate draft → review → optionally send.

## Prerequisites

Before running onboarding:

1. **CLI installed**: \`npm install -g @packmind/cli\`
2. **Logged in**: \`packmind-cli login\`
3. **Skills installed**: This skill is already installed if you're reading this

## Quick Start

Run the onboard command:

\`\`\`bash
packmind-cli onboard
\`\`\`

This will:
1. Show you what will happen (consent prompt)
2. Scan your project read-only
3. Generate draft files locally
4. Let you review before sending anything
5. Optionally send to Packmind on your approval

## Command Options

| Flag | Description |
|------|-------------|
| \`--output <path>\` | Where to write draft files |
| \`--format md\\|json\\|both\` | Output format (default: both) |
| \`--yes\` | Skip prompts and auto-send |
| \`--dry-run\` | Generate draft only, never send |
| \`--print\` | Print detailed summary to stdout |
| \`--open\` | Open markdown in default viewer |
| \`--send\` | Explicitly send existing draft |

## What Gets Scanned

The scanner detects (read-only, no modifications):

- **Languages**: TypeScript, JavaScript, Python, Go, Java, C#, etc.
- **Frameworks**: NestJS, React, Vue, Angular, Django, FastAPI, etc.
- **Tools**: ESLint, Prettier, Nx, Turbo, Jest, Vitest, etc.
- **Structure**: Monorepo, test directories, src directory

## What Gets Generated

### Draft Files

Two files are created in \`~/.packmind/cli/drafts/\` (or custom \`--output\`):

1. **packmind-onboard.draft.json** - Machine-readable payload
2. **packmind-onboard.draft.md** - Human-readable review document

### Baseline Items

Each item includes:
- **Label**: Short factual statement (e.g., "Uses TypeScript")
- **Type**: tooling, structure, convention, or agent
- **Confidence**: high or medium
- **Evidence**: File paths that prove the claim

Items are capped at 5-10, prioritizing high-confidence claims.

## Review Flow

After generating drafts, you'll see:

\`\`\`
What would you like to do?

  [Enter] Send draft to Packmind
  [e]     Open draft in editor
  [p]     Print summary
  [r]     Regenerate draft
  [q]     Quit without sending
\`\`\`

**Nothing is sent until you explicitly confirm.**

## Checking Status

See the current onboarding state:

\`\`\`bash
packmind-cli onboard-status
\`\`\`

Shows:
- Last run timestamp
- Baseline item count
- Draft file locations
- Push status (sent/unsent)

## Example Session

\`\`\`
$ packmind-cli onboard

============================================================
  PACKMIND ONBOARDING
============================================================

This will:
  1. Scan your repository (read-only, no modifications)
  2. Generate a local draft baseline file
  3. Let you review before sending anything

Nothing will be sent to Packmind without your approval.

Press Enter to continue, Ctrl+C to abort...

Generating repository fingerprint...
Scanning project (read-only)...
Found languages: typescript, javascript
Found frameworks: nestjs, react
Found tools: eslint, prettier, nx
Detected monorepo structure
Generating baseline items...
Writing draft files to /Users/you/.packmind/cli/drafts/...

Draft files generated:
  JSON: /Users/you/.packmind/cli/drafts/packmind-onboard.draft.json
  Markdown: /Users/you/.packmind/cli/drafts/packmind-onboard.draft.md

What would you like to do?

  [Enter] Send draft to Packmind
  [e]     Open draft in editor
  [p]     Print summary
  [r]     Regenerate draft
  [q]     Quit without sending

Your choice:

✔ Draft reviewed
✔ Sent to Packmind
✔ Stored successfully

Open the app to review and convert baseline items into rules.
\`\`\`

## Safety Guarantees

- **Read-only**: No files are modified in your repo
- **Draft-first**: Nothing sent without explicit approval
- **Factual only**: No architecture inference or recommendations
- **Evidence-backed**: Every claim has file path evidence
- **Deletable**: Draft files can be deleted anytime

## Troubleshooting

### "Not logged in"

Run \`packmind-cli login\` first.

### "No items generated"

Your project may lack recognizable config files. Ensure you have:
- package.json, tsconfig.json, or similar
- Standard project structure

### "Send failed"

Check your network connection. The draft files are preserved - try again with \`packmind-cli onboard --yes\`.
`;
}
```

**Step 2: Run lint to verify**

Run: `nx lint coding-agent`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/coding-agent/src/infra/repositories/defaultSkillsDeployer/OnboardDeployer.ts
git commit -m "feat(coding-agent): update packmind-onboard skill for draft-first flow"
```

---

## Task 12: Integration Testing

**Files:**
- Create: `apps/cli/src/application/useCases/DraftOnboardingIntegration.spec.ts`

**Step 1: Write integration test**

```typescript
// apps/cli/src/application/useCases/DraftOnboardingIntegration.spec.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { ProjectScannerService } from '../services/ProjectScannerService';
import { BaselineItemGeneratorService } from '../services/BaselineItemGeneratorService';
import { DraftFileWriterService } from '../services/DraftFileWriterService';
import { OnboardingStateService } from '../services/OnboardingStateService';
import { RepoFingerprintService } from '../services/RepoFingerprintService';
import { DraftOnboardingUseCase } from './DraftOnboardingUseCase';
import { stubLogger } from '@packmind/test-utils';

describe('Draft Onboarding Integration', () => {
  let tempDir: string;
  let useCase: DraftOnboardingUseCase;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'integration-test-'));

    const mockGateway = {
      pushOnboardingBaseline: jest.fn().mockResolvedValue({ success: true }),
    } as any;

    useCase = new DraftOnboardingUseCase(
      new ProjectScannerService(),
      new BaselineItemGeneratorService(),
      new DraftFileWriterService(),
      new OnboardingStateService(tempDir),
      new RepoFingerprintService(),
      mockGateway,
      stubLogger()
    );
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('generates draft files for current project', async () => {
    const result = await useCase.generateDraft({
      projectPath: process.cwd(),
      format: 'both',
      outputDir: tempDir,
    });

    expect(result.draft.baseline_items.length).toBeGreaterThan(0);
    expect(result.paths.jsonPath).toBeDefined();
    expect(result.paths.mdPath).toBeDefined();

    const jsonExists = await fs
      .access(result.paths.jsonPath!)
      .then(() => true)
      .catch(() => false);
    expect(jsonExists).toBe(true);
  });

  it('generates stable fingerprints across runs', async () => {
    const result1 = await useCase.generateDraft({
      projectPath: process.cwd(),
      format: 'json',
      outputDir: tempDir,
    });

    const result2 = await useCase.generateDraft({
      projectPath: process.cwd(),
      format: 'json',
      outputDir: tempDir,
    });

    expect(result1.draft.meta.repo_fingerprint).toBe(result2.draft.meta.repo_fingerprint);
  });

  it('caps baseline items at 10', async () => {
    const result = await useCase.generateDraft({
      projectPath: process.cwd(),
      format: 'json',
      outputDir: tempDir,
    });

    expect(result.draft.baseline_items.length).toBeLessThanOrEqual(10);
  });

  it('tracks status after generating draft', async () => {
    await useCase.generateDraft({
      projectPath: process.cwd(),
      format: 'both',
      outputDir: tempDir,
    });

    const status = await useCase.getStatus(process.cwd());

    expect(status.last_run_at).toBeDefined();
    expect(status.baseline_item_count).toBeGreaterThan(0);
    expect(status.last_push_status.status).toBe('unsent');
  });
});
```

**Step 2: Run integration tests**

Run: `nx test cli --testPathPattern=DraftOnboardingIntegration`
Expected: PASS

**Step 3: Run full test suite**

Run: `nx test cli`
Expected: PASS

**Step 4: Run quality gate**

Run: `npm run lint:staged && npm run test:staged`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cli/src/application/useCases/DraftOnboardingIntegration.spec.ts
git commit -m "test(cli): add integration tests for draft-first onboarding"
```

---

## Task 13: Manual Testing & Final Verification

**Step 1: Test the full flow manually**

```bash
# Test onboard command
packmind-cli onboard --dry-run

# Expected output:
# - Consent prompt
# - Scan progress with concrete file detections
# - Draft files generated
# - No send prompt (dry-run)
```

**Step 2: Test with auto-approve**

```bash
packmind-cli onboard --yes --dry-run --print
```

**Step 3: Test status command**

```bash
packmind-cli onboard-status
```

**Step 4: Verify draft files are readable**

Open the generated markdown file and verify:
- Disclaimer is clear
- Baseline items have evidence
- "What will be sent" section is present

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat(cli): complete draft-first onboarding implementation

- Draft files generated locally (md + json)
- User reviews before any network push
- Explicit confirmation required to send
- Status/heartbeat command tracks state
- All claims backed by file evidence
- 5-10 baseline items cap
- Full test coverage"
```

---

## Acceptance Criteria Checklist

- [ ] Running `packmind-cli onboard` creates local draft files (md + json by default)
- [ ] Draft includes 5-10 factual baseline items with verified evidence paths
- [ ] Evidence arrays only contain files/directories that actually exist (from scan)
- [ ] User can review draft before any network push
- [ ] No data sent to Packmind unless user confirms (except `--yes`)
- [ ] On send: CLI confirms persistence from backend
- [ ] `onboard-status` reports last run + last push state
- [ ] Read-only scanning (no file modifications)
- [ ] No silent waits > 500ms (progress output during scan)
- [ ] Stable IDs for baseline items across runs
- [ ] Regenerate option works in-session (loop, not "run again")
- [ ] File opening uses platform-safe spawn (not exec with shell string)
- [ ] Uses consoleLogger per CLI standards
- [ ] All tests pass
- [ ] Quality gate passes

---

## Implementation Notes

- **TDD**: Write tests before implementation
- **DRY**: Reuse existing ProjectScannerService
- **YAGNI**: Only build what's specified
- **Draft-first**: Always generate local draft before any network call
- **Evidence-backed**: Every baseline item must have file path evidence (from detectedFiles)
- **User control**: Explicit approval required for sending
- **Frequent commits**: Commit after each task
- **CLI standards**: Use `consoleLogger` instead of `console.log`

## Key Design Decisions (addressing review feedback)

1. **Consent prompt**: Changed from Y/n to "Press Enter to continue, Ctrl+C to abort" - reduces drop-off, feels safe
2. **Evidence arrays**: Only contain verified paths from `detectedFiles`/`detectedDirectories` - no glob strings or fake paths
3. **Regenerate**: Implemented as a loop, not just "run command again" - better UX
4. **File opening**: Uses `spawn` with platform-safe commands (open/xdg-open/start) - no shell injection
5. **State directory**: Uses `~/.packmind/cli/` matching existing CLI conventions
6. **Always print summary**: Short baseline count always shown, detailed summary with `--print`
7. **Added --send flag**: Explicit option to send existing draft

## References

- Existing scanner: `apps/cli/src/application/services/ProjectScannerService.ts`
- Credentials provider (state dir convention): `apps/cli/src/infra/utils/credentials/FileCredentialsProvider.ts`
- Gateway: `apps/cli/src/infra/repositories/PackmindGateway.ts`
- Hexa: `apps/cli/src/PackmindCliHexa.ts`
- Current skill: `packages/coding-agent/src/infra/repositories/defaultSkillsDeployer/OnboardDeployer.ts`
- Console logger: `apps/cli/src/infra/utils/consoleLogger.ts`
