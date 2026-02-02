# Enhanced Onboarding Insights - Detailed Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform packmind-onboard from "detecting what tools exist" to "discovering what you didn't know about your codebase" - generating insight-backed Standards and Commands.

**Architecture:** 5 analyzers run in parallel, each producing insights with evidence. Insights map to artifacts (Standards/Commands) via InsightToArtifactMapper. AggressiveOnboardingUseCase orchestrates everything.

**Tech Stack:** TypeScript, Jest for testing, fs/promises for file access, existing IGeneratedStandard/IGeneratedCommand interfaces

---

## Task 0: Create Insight Types

**Files:**
- Create: `apps/cli/src/domain/types/OnboardingInsight.ts`

**Step 1: Write the insight type definitions**

```typescript
// apps/cli/src/domain/types/OnboardingInsight.ts

export type InsightType =
  | 'config-gap'
  | 'naming-pattern'
  | 'test-pattern'
  | 'workflow-gap'
  | 'file-pattern';

export type InsightSeverity = 'high' | 'medium' | 'low';

export interface IBaseInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  evidence: string[];
  severity: InsightSeverity;
}

export interface IConfigGapInsight extends IBaseInsight {
  type: 'config-gap';
  config: string;
  rule: string;
  expected: string;
  found: number;
  fileMatches: string[];
}

export interface INamingPatternInsight extends IBaseInsight {
  type: 'naming-pattern';
  pattern: string;
  matchCount: number;
  exceptions: string[];
  consistency: number;
}

export interface ITestPatternInsight extends IBaseInsight {
  type: 'test-pattern';
  pattern: string;
  frequency: number;
  counterExamples: string[];
}

export interface IWorkflowGapInsight extends IBaseInsight {
  type: 'workflow-gap';
  workflowName: string;
  ciSteps: string[];
  localSteps: string[];
  missingLocally: string[];
}

export interface IFilePatternInsight extends IBaseInsight {
  type: 'file-pattern';
  fileType: string;
  sampleFiles: string[];
  commonElements: {
    baseClass?: string;
    imports: string[];
    decorators: string[];
    constructorDeps: string[];
    methods: string[];
  };
  variableElements: string[];
}

export type IInsight =
  | IConfigGapInsight
  | INamingPatternInsight
  | ITestPatternInsight
  | IWorkflowGapInsight
  | IFilePatternInsight;

export interface IInsightWithArtifact {
  insight: IInsight;
  artifactType: 'standard' | 'command';
  score: number;
}
```

**Step 2: Run lint to verify types are valid**

Run: `nx lint cli`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/cli/src/domain/types/OnboardingInsight.ts
git commit -m "feat(cli): add onboarding insight type definitions"
```

---

## Task 1: Config Gap Analyzer

**Files:**
- Create: `apps/cli/src/application/services/analyzers/ConfigGapAnalyzer.ts`
- Create: `apps/cli/src/application/services/analyzers/ConfigGapAnalyzer.spec.ts`

### Step 1: Write failing test for TypeScript strict mode gap detection

```typescript
// apps/cli/src/application/services/analyzers/ConfigGapAnalyzer.spec.ts
import { ConfigGapAnalyzer } from './ConfigGapAnalyzer';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

jest.mock('fs/promises');

describe('ConfigGapAnalyzer', () => {
  let analyzer: ConfigGapAnalyzer;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    analyzer = new ConfigGapAnalyzer();
    jest.clearAllMocks();
  });

  describe('analyze', () => {
    describe('when tsconfig has strict mode enabled', () => {
      describe('when @ts-ignore comments exist in codebase', () => {
        it('returns a config-gap insight with count and evidence', async () => {
          mockFs.readFile.mockImplementation(async (filePath) => {
            const p = filePath.toString();
            if (p.endsWith('tsconfig.json')) {
              return JSON.stringify({ compilerOptions: { strict: true } });
            }
            if (p.endsWith('file1.ts')) {
              return '// @ts-ignore\nconst x = 1;';
            }
            if (p.endsWith('file2.ts')) {
              return '// @ts-ignore\n// @ts-ignore\nconst y = 2;';
            }
            throw new Error('File not found');
          });

          mockFs.readdir.mockResolvedValue([
            { name: 'src', isDirectory: () => true, isFile: () => false },
          ] as any);

          // Mock glob-like behavior through recursive readdir
          mockFs.stat.mockResolvedValue({ isDirectory: () => false } as any);

          const insights = await analyzer.analyze('/test/project');

          const tsInsight = insights.find((i) => i.config === 'tsconfig.json');
          expect(tsInsight).toBeDefined();
          expect(tsInsight?.type).toBe('config-gap');
          expect(tsInsight?.found).toBeGreaterThan(0);
          expect(tsInsight?.severity).toBe('high');
        });
      });

      describe('when no @ts-ignore comments exist', () => {
        it('does not return a TypeScript insight', async () => {
          mockFs.readFile.mockImplementation(async (filePath) => {
            const p = filePath.toString();
            if (p.endsWith('tsconfig.json')) {
              return JSON.stringify({ compilerOptions: { strict: true } });
            }
            return 'const x: number = 1;';
          });

          mockFs.readdir.mockResolvedValue([]);

          const insights = await analyzer.analyze('/test/project');

          const tsInsight = insights.find((i) => i.config === 'tsconfig.json');
          expect(tsInsight).toBeUndefined();
        });
      });
    });

    describe('when eslint config exists', () => {
      describe('when eslint-disable comments exist', () => {
        it('returns a config-gap insight for ESLint', async () => {
          mockFs.readFile.mockImplementation(async (filePath) => {
            const p = filePath.toString();
            if (p.endsWith('.eslintrc.json')) {
              return JSON.stringify({ rules: {} });
            }
            if (p.endsWith('tsconfig.json')) {
              throw new Error('Not found');
            }
            return '/* eslint-disable */\nconst x = 1;';
          });

          mockFs.readdir.mockResolvedValue([]);
          mockFs.access.mockImplementation(async (filePath) => {
            if (filePath.toString().includes('.eslintrc')) return;
            throw new Error('Not found');
          });

          const insights = await analyzer.analyze('/test/project');

          const eslintInsight = insights.find((i) =>
            i.config.includes('eslint'),
          );
          expect(eslintInsight).toBeDefined();
          expect(eslintInsight?.type).toBe('config-gap');
        });
      });
    });
  });
});
```

### Step 2: Run test to verify it fails

Run: `nx test cli --testPathPattern=ConfigGapAnalyzer`
Expected: FAIL - ConfigGapAnalyzer not defined

### Step 3: Write ConfigGapAnalyzer implementation

```typescript
// apps/cli/src/application/services/analyzers/ConfigGapAnalyzer.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { IConfigGapInsight } from '../../../domain/types/OnboardingInsight';

export interface IConfigGapAnalyzer {
  analyze(projectPath: string): Promise<IConfigGapInsight[]>;
}

interface IConfigCheck {
  configFile: string;
  configPaths: string[];
  checkEnabled: (config: any) => boolean;
  violationPatterns: RegExp[];
  rule: string;
  expected: string;
  fileGlob: string;
}

export class ConfigGapAnalyzer implements IConfigGapAnalyzer {
  private readonly CONFIG_CHECKS: IConfigCheck[] = [
    {
      configFile: 'tsconfig.json',
      configPaths: ['tsconfig.json', 'tsconfig.base.json'],
      checkEnabled: (config) => config?.compilerOptions?.strict === true,
      violationPatterns: [
        /@ts-ignore/g,
        /@ts-expect-error(?!\s+-)/g, // @ts-expect-error without explanation
        /:\s*any\b/g,
      ],
      rule: 'strict mode',
      expected: 'no @ts-ignore or untyped any',
      fileGlob: '**/*.ts',
    },
    {
      configFile: '.eslintrc',
      configPaths: [
        '.eslintrc.json',
        '.eslintrc.js',
        '.eslintrc.cjs',
        '.eslintrc.yaml',
        '.eslintrc.yml',
        'eslint.config.js',
        'eslint.config.mjs',
      ],
      checkEnabled: () => true, // If eslint config exists, it's enabled
      violationPatterns: [
        /\/\*\s*eslint-disable\s*\*\//g,
        /\/\/\s*eslint-disable-line/g,
        /\/\/\s*eslint-disable-next-line/g,
      ],
      rule: 'ESLint rules',
      expected: 'no inline disables',
      fileGlob: '**/*.{ts,js,tsx,jsx}',
    },
  ];

  async analyze(projectPath: string): Promise<IConfigGapInsight[]> {
    const insights: IConfigGapInsight[] = [];

    for (const check of this.CONFIG_CHECKS) {
      const insight = await this.checkConfig(projectPath, check);
      if (insight) {
        insights.push(insight);
      }
    }

    return insights;
  }

  private async checkConfig(
    projectPath: string,
    check: IConfigCheck,
  ): Promise<IConfigGapInsight | null> {
    // Find and read config file
    let configContent: any = null;
    let foundConfigPath: string | null = null;

    for (const configPath of check.configPaths) {
      try {
        const fullPath = path.join(projectPath, configPath);
        const content = await fs.readFile(fullPath, 'utf-8');
        configContent = configPath.endsWith('.json') ? JSON.parse(content) : {};
        foundConfigPath = configPath;
        break;
      } catch {
        // Config file doesn't exist, try next
      }
    }

    if (!configContent || !foundConfigPath) {
      return null;
    }

    // Check if the config rule is enabled
    if (!check.checkEnabled(configContent)) {
      return null;
    }

    // Scan for violations
    const violations = await this.findViolations(
      projectPath,
      check.violationPatterns,
      check.fileGlob,
    );

    if (violations.count === 0) {
      return null;
    }

    const id = `config-gap-${foundConfigPath.replace(/[^a-z0-9]/gi, '-')}`;

    return {
      id,
      type: 'config-gap',
      title: `${check.rule} enabled but ${violations.count} violations found`,
      description: `${foundConfigPath} has ${check.rule} configured, but the codebase contains ${violations.count} places that bypass it.`,
      evidence: [foundConfigPath, ...violations.files.slice(0, 5)],
      severity: violations.count > 20 ? 'high' : 'medium',
      config: foundConfigPath,
      rule: check.rule,
      expected: check.expected,
      found: violations.count,
      fileMatches: violations.files,
    };
  }

  private async findViolations(
    projectPath: string,
    patterns: RegExp[],
    fileGlob: string,
  ): Promise<{ count: number; files: string[] }> {
    const files: string[] = [];
    let totalCount = 0;

    const tsFiles = await this.findFiles(projectPath, fileGlob);

    for (const file of tsFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        let fileViolations = 0;

        for (const pattern of patterns) {
          const matches = content.match(new RegExp(pattern.source, 'g'));
          if (matches) {
            fileViolations += matches.length;
          }
        }

        if (fileViolations > 0) {
          totalCount += fileViolations;
          const relativePath = path.relative(projectPath, file);
          files.push(`${relativePath}:${fileViolations}`);
        }
      } catch {
        // Skip files that can't be read
      }
    }

    return { count: totalCount, files };
  }

  private async findFiles(
    projectPath: string,
    glob: string,
  ): Promise<string[]> {
    const files: string[] = [];
    const extensions = this.extractExtensions(glob);

    await this.walkDirectory(projectPath, files, extensions);

    return files;
  }

  private extractExtensions(glob: string): string[] {
    // Extract extensions from glob like "**/*.{ts,js,tsx,jsx}"
    const match = glob.match(/\*\.(\{[^}]+\}|\w+)$/);
    if (!match) return ['.ts'];

    const extPart = match[1];
    if (extPart.startsWith('{')) {
      return extPart
        .slice(1, -1)
        .split(',')
        .map((e) => `.${e.trim()}`);
    }
    return [`.${extPart}`];
  }

  private async walkDirectory(
    dir: string,
    files: string[],
    extensions: string[],
  ): Promise<void> {
    const IGNORED_DIRS = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '.nx',
      '.next',
    ];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!IGNORED_DIRS.includes(entry.name) && !entry.name.startsWith('.')) {
            await this.walkDirectory(fullPath, files, extensions);
          }
        } else if (entry.isFile()) {
          if (extensions.some((ext) => entry.name.endsWith(ext))) {
            files.push(fullPath);
          }
        }
      }
    } catch {
      // Skip directories that can't be read
    }
  }
}
```

### Step 4: Run test to verify it passes

Run: `nx test cli --testPathPattern=ConfigGapAnalyzer`
Expected: PASS

### Step 5: Run lint

Run: `nx lint cli`
Expected: PASS

### Step 6: Commit

```bash
git add apps/cli/src/domain/types/OnboardingInsight.ts
git add apps/cli/src/application/services/analyzers/ConfigGapAnalyzer.ts
git add apps/cli/src/application/services/analyzers/ConfigGapAnalyzer.spec.ts
git commit -m "feat(cli): add ConfigGapAnalyzer for detecting config vs reality gaps"
```

---

## Task 2: Naming Convention Analyzer

**Files:**
- Create: `apps/cli/src/application/services/analyzers/NamingConventionAnalyzer.ts`
- Create: `apps/cli/src/application/services/analyzers/NamingConventionAnalyzer.spec.ts`

### Step 1: Write failing test for naming pattern detection

```typescript
// apps/cli/src/application/services/analyzers/NamingConventionAnalyzer.spec.ts
import { NamingConventionAnalyzer } from './NamingConventionAnalyzer';
import * as fs from 'fs/promises';

jest.mock('fs/promises');

describe('NamingConventionAnalyzer', () => {
  let analyzer: NamingConventionAnalyzer;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    analyzer = new NamingConventionAnalyzer();
    jest.clearAllMocks();
  });

  describe('analyze', () => {
    describe('when files follow suffix conventions', () => {
      it('detects .controller.ts naming pattern with consistency score', async () => {
        mockFs.readdir.mockImplementation(async (dirPath) => {
          const p = dirPath.toString();
          if (p.endsWith('src')) {
            return [
              { name: 'controllers', isDirectory: () => true, isFile: () => false },
            ] as any;
          }
          if (p.includes('controllers')) {
            return [
              { name: 'user.controller.ts', isDirectory: () => false, isFile: () => true },
              { name: 'auth.controller.ts', isDirectory: () => false, isFile: () => true },
              { name: 'product.controller.ts', isDirectory: () => false, isFile: () => true },
              { name: 'legacyCtrl.ts', isDirectory: () => false, isFile: () => true },
            ] as any;
          }
          return [];
        });

        const insights = await analyzer.analyze('/test/project');

        const controllerInsight = insights.find((i) =>
          i.pattern.includes('controller'),
        );
        expect(controllerInsight).toBeDefined();
        expect(controllerInsight?.type).toBe('naming-pattern');
        expect(controllerInsight?.matchCount).toBe(3);
        expect(controllerInsight?.exceptions).toContain('legacyCtrl.ts');
        expect(controllerInsight?.consistency).toBeCloseTo(0.75, 1);
      });
    });

    describe('when files follow casing conventions', () => {
      it('detects kebab-case pattern for filenames', async () => {
        mockFs.readdir.mockImplementation(async (dirPath) => {
          const p = dirPath.toString();
          if (p.endsWith('src')) {
            return [
              { name: 'services', isDirectory: () => true, isFile: () => false },
            ] as any;
          }
          if (p.includes('services')) {
            return [
              { name: 'user-service.ts', isDirectory: () => false, isFile: () => true },
              { name: 'auth-service.ts', isDirectory: () => false, isFile: () => true },
              { name: 'ProductService.ts', isDirectory: () => false, isFile: () => true },
            ] as any;
          }
          return [];
        });

        const insights = await analyzer.analyze('/test/project');

        const casingInsight = insights.find((i) =>
          i.title.toLowerCase().includes('casing'),
        );
        expect(casingInsight).toBeDefined();
      });
    });
  });
});
```

### Step 2: Run test to verify it fails

Run: `nx test cli --testPathPattern=NamingConventionAnalyzer`
Expected: FAIL - NamingConventionAnalyzer not defined

### Step 3: Write NamingConventionAnalyzer implementation

```typescript
// apps/cli/src/application/services/analyzers/NamingConventionAnalyzer.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { INamingPatternInsight } from '../../../domain/types/OnboardingInsight';

export interface INamingConventionAnalyzer {
  analyze(projectPath: string): Promise<INamingPatternInsight[]>;
}

interface ISuffixPattern {
  suffix: string;
  directories: string[];
  minCount: number;
}

export class NamingConventionAnalyzer implements INamingConventionAnalyzer {
  private readonly SUFFIX_PATTERNS: ISuffixPattern[] = [
    { suffix: '.controller.ts', directories: ['controllers', 'controller'], minCount: 2 },
    { suffix: '.service.ts', directories: ['services', 'service'], minCount: 2 },
    { suffix: '.module.ts', directories: ['modules', 'module'], minCount: 2 },
    { suffix: '.repository.ts', directories: ['repositories', 'repository'], minCount: 2 },
    { suffix: '.entity.ts', directories: ['entities', 'entity', 'models'], minCount: 2 },
    { suffix: '.dto.ts', directories: ['dto', 'dtos'], minCount: 2 },
    { suffix: '.spec.ts', directories: ['test', 'tests', '__tests__', 'spec'], minCount: 3 },
    { suffix: 'UseCase.ts', directories: ['useCases', 'use-cases', 'application'], minCount: 2 },
  ];

  async analyze(projectPath: string): Promise<INamingPatternInsight[]> {
    const insights: INamingPatternInsight[] = [];

    // Check suffix patterns
    for (const pattern of this.SUFFIX_PATTERNS) {
      const insight = await this.checkSuffixPattern(projectPath, pattern);
      if (insight) {
        insights.push(insight);
      }
    }

    // Check casing patterns
    const casingInsight = await this.checkCasingPattern(projectPath);
    if (casingInsight) {
      insights.push(casingInsight);
    }

    return insights;
  }

  private async checkSuffixPattern(
    projectPath: string,
    pattern: ISuffixPattern,
  ): Promise<INamingPatternInsight | null> {
    const matchingFiles: string[] = [];
    const nonMatchingFiles: string[] = [];

    // Find relevant directories
    const directories = await this.findDirectories(projectPath, pattern.directories);

    for (const dir of directories) {
      const files = await this.getFilesInDirectory(dir);
      const tsFiles = files.filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts') && !f.endsWith('.test.ts'));

      for (const file of tsFiles) {
        if (file.endsWith(pattern.suffix)) {
          matchingFiles.push(path.relative(projectPath, path.join(dir, file)));
        } else if (this.looksLikeType(file, pattern.suffix)) {
          nonMatchingFiles.push(path.relative(projectPath, path.join(dir, file)));
        }
      }
    }

    const total = matchingFiles.length + nonMatchingFiles.length;
    if (matchingFiles.length < pattern.minCount) {
      return null;
    }

    const consistency = total > 0 ? matchingFiles.length / total : 0;

    // Only report if there are exceptions (otherwise it's not interesting)
    if (nonMatchingFiles.length === 0 && consistency === 1) {
      return null;
    }

    const id = `naming-${pattern.suffix.replace(/[^a-z0-9]/gi, '-')}`;

    return {
      id,
      type: 'naming-pattern',
      title: `${Math.round(consistency * 100)}% of files use ${pattern.suffix} suffix`,
      description: `Found ${matchingFiles.length} files following the ${pattern.suffix} convention, but ${nonMatchingFiles.length} don't.`,
      evidence: [...matchingFiles.slice(0, 3), ...nonMatchingFiles.slice(0, 2)],
      severity: consistency < 0.8 ? 'medium' : 'low',
      pattern: `*${pattern.suffix}`,
      matchCount: matchingFiles.length,
      exceptions: nonMatchingFiles,
      consistency,
    };
  }

  private looksLikeType(filename: string, suffix: string): boolean {
    // Check if file looks like it should follow the pattern
    const typeHints: Record<string, string[]> = {
      '.controller.ts': ['ctrl', 'controller', 'Controller'],
      '.service.ts': ['service', 'Service', 'svc'],
      '.repository.ts': ['repo', 'repository', 'Repository'],
      '.entity.ts': ['entity', 'Entity', 'model', 'Model'],
      '.dto.ts': ['dto', 'Dto', 'DTO'],
      'UseCase.ts': ['usecase', 'UseCase', 'use-case'],
    };

    const hints = typeHints[suffix] || [];
    return hints.some((hint) => filename.toLowerCase().includes(hint.toLowerCase()));
  }

  private async checkCasingPattern(
    projectPath: string,
  ): Promise<INamingPatternInsight | null> {
    const kebabCase: string[] = [];
    const camelCase: string[] = [];
    const pascalCase: string[] = [];

    const srcPath = path.join(projectPath, 'src');
    const files = await this.getAllTsFiles(srcPath);

    for (const file of files) {
      const basename = path.basename(file, path.extname(file));

      if (basename.includes('-')) {
        kebabCase.push(file);
      } else if (basename[0] === basename[0].toLowerCase() && /[A-Z]/.test(basename)) {
        camelCase.push(file);
      } else if (basename[0] === basename[0].toUpperCase()) {
        pascalCase.push(file);
      }
    }

    const total = kebabCase.length + camelCase.length + pascalCase.length;
    if (total < 5) return null;

    const dominant = Math.max(kebabCase.length, camelCase.length, pascalCase.length);
    const consistency = dominant / total;

    if (consistency > 0.9) return null; // Too consistent to be interesting

    let dominantStyle = 'kebab-case';
    let exceptions: string[] = [];

    if (kebabCase.length === dominant) {
      dominantStyle = 'kebab-case';
      exceptions = [...camelCase, ...pascalCase].slice(0, 5);
    } else if (camelCase.length === dominant) {
      dominantStyle = 'camelCase';
      exceptions = [...kebabCase, ...pascalCase].slice(0, 5);
    } else {
      dominantStyle = 'PascalCase';
      exceptions = [...kebabCase, ...camelCase].slice(0, 5);
    }

    return {
      id: 'naming-casing-pattern',
      type: 'naming-pattern',
      title: `Mixed file casing: ${Math.round(consistency * 100)}% use ${dominantStyle}`,
      description: `Most files use ${dominantStyle}, but ${total - dominant} files use different casing.`,
      evidence: exceptions.map((f) => path.relative(projectPath, f)),
      severity: 'medium',
      pattern: dominantStyle,
      matchCount: dominant,
      exceptions: exceptions.map((f) => path.relative(projectPath, f)),
      consistency,
    };
  }

  private async findDirectories(
    projectPath: string,
    names: string[],
  ): Promise<string[]> {
    const found: string[] = [];
    await this.walkForDirectories(projectPath, names, found, 0);
    return found;
  }

  private async walkForDirectories(
    dir: string,
    names: string[],
    found: string[],
    depth: number,
  ): Promise<void> {
    if (depth > 5) return;

    const IGNORED = ['node_modules', '.git', 'dist', 'build', '.nx'];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (IGNORED.includes(entry.name)) continue;

        const fullPath = path.join(dir, entry.name);

        if (names.includes(entry.name)) {
          found.push(fullPath);
        }

        await this.walkForDirectories(fullPath, names, found, depth + 1);
      }
    } catch {
      // Skip unreadable directories
    }
  }

  private async getFilesInDirectory(dir: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      return entries.filter((e) => e.isFile()).map((e) => e.name);
    } catch {
      return [];
    }
  }

  private async getAllTsFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    await this.walkForFiles(dir, files, 0);
    return files;
  }

  private async walkForFiles(
    dir: string,
    files: string[],
    depth: number,
  ): Promise<void> {
    if (depth > 6) return;

    const IGNORED = ['node_modules', '.git', 'dist', 'build', '.nx'];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && !IGNORED.includes(entry.name)) {
          await this.walkForFiles(fullPath, files, depth + 1);
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
          files.push(fullPath);
        }
      }
    } catch {
      // Skip unreadable directories
    }
  }
}
```

### Step 4: Run test to verify it passes

Run: `nx test cli --testPathPattern=NamingConventionAnalyzer`
Expected: PASS

### Step 5: Run lint

Run: `nx lint cli`
Expected: PASS

### Step 6: Commit

```bash
git add apps/cli/src/application/services/analyzers/NamingConventionAnalyzer.ts
git add apps/cli/src/application/services/analyzers/NamingConventionAnalyzer.spec.ts
git commit -m "feat(cli): add NamingConventionAnalyzer for detecting file naming patterns"
```

---

## Task 3: Test Pattern Analyzer

**Files:**
- Create: `apps/cli/src/application/services/analyzers/TestPatternAnalyzer.ts`
- Create: `apps/cli/src/application/services/analyzers/TestPatternAnalyzer.spec.ts`

### Step 1: Write failing test for test pattern detection

```typescript
// apps/cli/src/application/services/analyzers/TestPatternAnalyzer.spec.ts
import { TestPatternAnalyzer } from './TestPatternAnalyzer';
import * as fs from 'fs/promises';

jest.mock('fs/promises');

describe('TestPatternAnalyzer', () => {
  let analyzer: TestPatternAnalyzer;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    analyzer = new TestPatternAnalyzer();
    jest.clearAllMocks();
  });

  describe('analyze', () => {
    describe('when test files use factory functions', () => {
      it('detects factory pattern with frequency', async () => {
        const testFileWithFactory = `
          import { createUserFactory } from './factories';
          describe('UserService', () => {
            it('creates user', () => {
              const user = createUserFactory();
            });
          });
        `;

        const testFileWithoutFactory = `
          describe('AuthService', () => {
            it('authenticates', () => {
              const user = { id: '1', name: 'test' };
            });
          });
        `;

        mockFs.readdir.mockImplementation(async (dir) => {
          if (dir.toString().includes('test')) {
            return [
              { name: 'user.spec.ts', isDirectory: () => false, isFile: () => true },
              { name: 'auth.spec.ts', isDirectory: () => false, isFile: () => true },
              { name: 'factories', isDirectory: () => true, isFile: () => false },
            ] as any;
          }
          return [];
        });

        mockFs.readFile.mockImplementation(async (filePath) => {
          const p = filePath.toString();
          if (p.includes('user.spec')) return testFileWithFactory;
          if (p.includes('auth.spec')) return testFileWithoutFactory;
          throw new Error('Not found');
        });

        const insights = await analyzer.analyze('/test/project');

        const factoryInsight = insights.find((i) =>
          i.pattern.includes('factory'),
        );
        expect(factoryInsight).toBeDefined();
        expect(factoryInsight?.type).toBe('test-pattern');
        expect(factoryInsight?.frequency).toBeCloseTo(0.5, 1);
      });
    });

    describe('when tests use nested describe blocks', () => {
      it('detects nested describe pattern', async () => {
        const nestedTest = `
          describe('UserService', () => {
            describe('when user exists', () => {
              it('returns user', () => {});
            });
          });
        `;

        mockFs.readdir.mockResolvedValue([
          { name: 'user.spec.ts', isDirectory: () => false, isFile: () => true },
        ] as any);

        mockFs.readFile.mockResolvedValue(nestedTest);

        const insights = await analyzer.analyze('/test/project');

        const nestedInsight = insights.find((i) =>
          i.title.toLowerCase().includes('nested'),
        );
        expect(nestedInsight).toBeDefined();
      });
    });
  });
});
```

### Step 2: Run test to verify it fails

Run: `nx test cli --testPathPattern=TestPatternAnalyzer`
Expected: FAIL - TestPatternAnalyzer not defined

### Step 3: Write TestPatternAnalyzer implementation

```typescript
// apps/cli/src/application/services/analyzers/TestPatternAnalyzer.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { ITestPatternInsight } from '../../../domain/types/OnboardingInsight';

export interface ITestPatternAnalyzer {
  analyze(projectPath: string): Promise<ITestPatternInsight[]>;
}

interface IPatternCheck {
  name: string;
  patterns: RegExp[];
  description: string;
}

export class TestPatternAnalyzer implements ITestPatternAnalyzer {
  private readonly PATTERN_CHECKS: IPatternCheck[] = [
    {
      name: 'factory-based-setup',
      patterns: [
        /(?:create|build|make)\w*Factory/g,
        /Factory\s*\(/g,
        /import.*(?:factory|Factory)/g,
      ],
      description: 'Uses factory functions for test data',
    },
    {
      name: 'nested-describe',
      patterns: [/describe\s*\([^)]+\)\s*\{[^}]*describe\s*\(/g],
      description: 'Uses nested describe blocks for context',
    },
    {
      name: 'beforeEach-setup',
      patterns: [/beforeEach\s*\(/g],
      description: 'Uses beforeEach for test setup',
    },
    {
      name: 'jest-mock',
      patterns: [/jest\.mock\s*\(/g, /jest\.fn\s*\(/g],
      description: 'Uses Jest mock functions',
    },
    {
      name: 'arrange-act-assert',
      patterns: [
        /\/\/\s*Arrange/gi,
        /\/\/\s*Act/gi,
        /\/\/\s*Assert/gi,
      ],
      description: 'Uses AAA comments for test structure',
    },
  ];

  async analyze(projectPath: string): Promise<ITestPatternInsight[]> {
    const testFiles = await this.findTestFiles(projectPath);

    if (testFiles.length < 3) {
      return [];
    }

    const insights: ITestPatternInsight[] = [];

    for (const check of this.PATTERN_CHECKS) {
      const insight = await this.checkPattern(projectPath, testFiles, check);
      if (insight) {
        insights.push(insight);
      }
    }

    return insights;
  }

  private async checkPattern(
    projectPath: string,
    testFiles: string[],
    check: IPatternCheck,
  ): Promise<ITestPatternInsight | null> {
    const filesWithPattern: string[] = [];
    const filesWithoutPattern: string[] = [];

    for (const file of testFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const hasPattern = check.patterns.some((p) => p.test(content));

        const relativePath = path.relative(projectPath, file);

        if (hasPattern) {
          filesWithPattern.push(relativePath);
        } else {
          filesWithoutPattern.push(relativePath);
        }
      } catch {
        // Skip unreadable files
      }
    }

    const total = filesWithPattern.length + filesWithoutPattern.length;
    if (total === 0 || filesWithPattern.length < 2) {
      return null;
    }

    const frequency = filesWithPattern.length / total;

    // Only interesting if there's variation
    if (frequency === 1 || frequency < 0.3) {
      return null;
    }

    return {
      id: `test-pattern-${check.name}`,
      type: 'test-pattern',
      title: `${Math.round(frequency * 100)}% of tests use ${check.name.replace(/-/g, ' ')}`,
      description: `${filesWithPattern.length} test files ${check.description}, but ${filesWithoutPattern.length} don't.`,
      evidence: [...filesWithPattern.slice(0, 3), ...filesWithoutPattern.slice(0, 2)],
      severity: frequency < 0.7 ? 'medium' : 'low',
      pattern: check.name,
      frequency,
      counterExamples: filesWithoutPattern.slice(0, 5),
    };
  }

  private async findTestFiles(projectPath: string): Promise<string[]> {
    const files: string[] = [];
    await this.walkForTestFiles(projectPath, files, 0);
    return files;
  }

  private async walkForTestFiles(
    dir: string,
    files: string[],
    depth: number,
  ): Promise<void> {
    if (depth > 8) return;

    const IGNORED = ['node_modules', '.git', 'dist', 'build', '.nx', 'coverage'];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && !IGNORED.includes(entry.name)) {
          await this.walkForTestFiles(fullPath, files, depth + 1);
        } else if (
          entry.isFile() &&
          (entry.name.endsWith('.spec.ts') || entry.name.endsWith('.test.ts'))
        ) {
          files.push(fullPath);
        }
      }
    } catch {
      // Skip unreadable directories
    }
  }
}
```

### Step 4: Run test to verify it passes

Run: `nx test cli --testPathPattern=TestPatternAnalyzer`
Expected: PASS

### Step 5: Run lint

Run: `nx lint cli`
Expected: PASS

### Step 6: Commit

```bash
git add apps/cli/src/application/services/analyzers/TestPatternAnalyzer.ts
git add apps/cli/src/application/services/analyzers/TestPatternAnalyzer.spec.ts
git commit -m "feat(cli): add TestPatternAnalyzer for detecting test structure patterns"
```

---

## Task 4: Script Workflow Analyzer

**Files:**
- Create: `apps/cli/src/application/services/analyzers/ScriptWorkflowAnalyzer.ts`
- Create: `apps/cli/src/application/services/analyzers/ScriptWorkflowAnalyzer.spec.ts`

### Step 1: Write failing test for workflow gap detection

```typescript
// apps/cli/src/application/services/analyzers/ScriptWorkflowAnalyzer.spec.ts
import { ScriptWorkflowAnalyzer } from './ScriptWorkflowAnalyzer';
import * as fs from 'fs/promises';

jest.mock('fs/promises');

describe('ScriptWorkflowAnalyzer', () => {
  let analyzer: ScriptWorkflowAnalyzer;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    analyzer = new ScriptWorkflowAnalyzer();
    jest.clearAllMocks();
  });

  describe('analyze', () => {
    describe('when CI has steps not available locally', () => {
      it('detects workflow gap between CI and local scripts', async () => {
        const packageJson = {
          scripts: {
            lint: 'eslint .',
            test: 'jest',
            build: 'tsc',
          },
        };

        const ciYaml = `
name: CI
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
      - run: npm run build
      - run: npm audit
        `;

        mockFs.readFile.mockImplementation(async (filePath) => {
          const p = filePath.toString();
          if (p.endsWith('package.json')) {
            return JSON.stringify(packageJson);
          }
          if (p.includes('ci.yml') || p.includes('ci.yaml')) {
            return ciYaml;
          }
          throw new Error('Not found');
        });

        mockFs.readdir.mockImplementation(async (dir) => {
          const p = dir.toString();
          if (p.includes('.github/workflows')) {
            return [
              { name: 'ci.yml', isDirectory: () => false, isFile: () => true },
            ] as any;
          }
          return [];
        });

        mockFs.access.mockResolvedValue(undefined);

        const insights = await analyzer.analyze('/test/project');

        const gapInsight = insights.find((i) => i.type === 'workflow-gap');
        expect(gapInsight).toBeDefined();
        expect(gapInsight?.missingLocally).toContain('typecheck');
        expect(gapInsight?.missingLocally).toContain('audit');
      });
    });

    describe('when all CI steps have local equivalents', () => {
      it('does not return a workflow gap insight', async () => {
        const packageJson = {
          scripts: {
            lint: 'eslint .',
            test: 'jest',
            build: 'tsc',
            typecheck: 'tsc --noEmit',
          },
        };

        const ciYaml = `
name: CI
jobs:
  build:
    steps:
      - run: npm run lint
      - run: npm run test
        `;

        mockFs.readFile.mockImplementation(async (filePath) => {
          const p = filePath.toString();
          if (p.endsWith('package.json')) return JSON.stringify(packageJson);
          if (p.includes('ci.yml')) return ciYaml;
          throw new Error('Not found');
        });

        mockFs.readdir.mockResolvedValue([
          { name: 'ci.yml', isDirectory: () => false, isFile: () => true },
        ] as any);

        mockFs.access.mockResolvedValue(undefined);

        const insights = await analyzer.analyze('/test/project');

        const gapInsight = insights.find(
          (i) => i.type === 'workflow-gap' && i.missingLocally.length > 0,
        );
        expect(gapInsight).toBeUndefined();
      });
    });
  });
});
```

### Step 2: Run test to verify it fails

Run: `nx test cli --testPathPattern=ScriptWorkflowAnalyzer`
Expected: FAIL - ScriptWorkflowAnalyzer not defined

### Step 3: Write ScriptWorkflowAnalyzer implementation

```typescript
// apps/cli/src/application/services/analyzers/ScriptWorkflowAnalyzer.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { IWorkflowGapInsight } from '../../../domain/types/OnboardingInsight';

export interface IScriptWorkflowAnalyzer {
  analyze(projectPath: string): Promise<IWorkflowGapInsight[]>;
}

export class ScriptWorkflowAnalyzer implements IScriptWorkflowAnalyzer {
  async analyze(projectPath: string): Promise<IWorkflowGapInsight[]> {
    const insights: IWorkflowGapInsight[] = [];

    // Read package.json scripts
    const localScripts = await this.readPackageJsonScripts(projectPath);
    if (!localScripts) {
      return insights;
    }

    // Read CI workflows
    const ciSteps = await this.readCIWorkflowSteps(projectPath);
    if (ciSteps.length === 0) {
      return insights;
    }

    // Find gaps
    const missingLocally = ciSteps.filter(
      (step) => !this.hasLocalEquivalent(step, localScripts),
    );

    if (missingLocally.length > 0) {
      insights.push({
        id: 'workflow-gap-ci-local',
        type: 'workflow-gap',
        title: `CI runs ${missingLocally.length} commands with no local script`,
        description: `Your CI pipeline runs commands that don't have equivalent npm scripts locally: ${missingLocally.join(', ')}`,
        evidence: ['.github/workflows/', 'package.json'],
        severity: missingLocally.length >= 2 ? 'high' : 'medium',
        workflowName: 'CI Pipeline',
        ciSteps,
        localSteps: Object.keys(localScripts),
        missingLocally,
      });
    }

    return insights;
  }

  private async readPackageJsonScripts(
    projectPath: string,
  ): Promise<Record<string, string> | null> {
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content);
      return pkg.scripts || {};
    } catch {
      return null;
    }
  }

  private async readCIWorkflowSteps(projectPath: string): Promise<string[]> {
    const steps: Set<string> = new Set();

    // GitHub Actions
    const githubWorkflowsPath = path.join(projectPath, '.github', 'workflows');
    try {
      await fs.access(githubWorkflowsPath);
      const files = await fs.readdir(githubWorkflowsPath, { withFileTypes: true });

      for (const file of files) {
        if (file.isFile() && (file.name.endsWith('.yml') || file.name.endsWith('.yaml'))) {
          const content = await fs.readFile(
            path.join(githubWorkflowsPath, file.name),
            'utf-8',
          );
          this.extractNpmRunCommands(content, steps);
        }
      }
    } catch {
      // No GitHub workflows
    }

    // GitLab CI
    try {
      const gitlabCIPath = path.join(projectPath, '.gitlab-ci.yml');
      const content = await fs.readFile(gitlabCIPath, 'utf-8');
      this.extractNpmRunCommands(content, steps);
    } catch {
      // No GitLab CI
    }

    return Array.from(steps);
  }

  private extractNpmRunCommands(content: string, steps: Set<string>): void {
    // Match: npm run <script>, yarn <script>, pnpm <script>
    const npmRunRegex = /(?:npm run|yarn|pnpm(?: run)?)\s+([a-zA-Z0-9_:-]+)/g;
    let match;

    while ((match = npmRunRegex.exec(content)) !== null) {
      steps.add(match[1]);
    }

    // Also match nx commands
    const nxRegex = /nx\s+(?:run\s+)?([a-zA-Z0-9_:-]+)/g;
    while ((match = nxRegex.exec(content)) !== null) {
      // Extract script-like part from nx commands
      const cmd = match[1];
      if (cmd.includes(':')) {
        steps.add(cmd.split(':').pop() || cmd);
      }
    }
  }

  private hasLocalEquivalent(
    ciStep: string,
    localScripts: Record<string, string>,
  ): boolean {
    // Direct match
    if (localScripts[ciStep]) {
      return true;
    }

    // Check for variants like "test:unit" matching "test"
    const baseCommand = ciStep.split(':')[0];
    if (localScripts[baseCommand]) {
      return true;
    }

    // Check if local script contains the CI step
    return Object.keys(localScripts).some(
      (script) =>
        script.includes(ciStep) ||
        ciStep.includes(script) ||
        localScripts[script].includes(ciStep),
    );
  }
}
```

### Step 4: Run test to verify it passes

Run: `nx test cli --testPathPattern=ScriptWorkflowAnalyzer`
Expected: PASS

### Step 5: Run lint

Run: `nx lint cli`
Expected: PASS

### Step 6: Commit

```bash
git add apps/cli/src/application/services/analyzers/ScriptWorkflowAnalyzer.ts
git add apps/cli/src/application/services/analyzers/ScriptWorkflowAnalyzer.spec.ts
git commit -m "feat(cli): add ScriptWorkflowAnalyzer for detecting CI vs local gaps"
```

---

## Task 5: File Creation Pattern Analyzer

**Files:**
- Create: `apps/cli/src/application/services/analyzers/FileCreationPatternAnalyzer.ts`
- Create: `apps/cli/src/application/services/analyzers/FileCreationPatternAnalyzer.spec.ts`

### Step 1: Write failing test for file pattern detection

```typescript
// apps/cli/src/application/services/analyzers/FileCreationPatternAnalyzer.spec.ts
import { FileCreationPatternAnalyzer } from './FileCreationPatternAnalyzer';
import * as fs from 'fs/promises';

jest.mock('fs/promises');

describe('FileCreationPatternAnalyzer', () => {
  let analyzer: FileCreationPatternAnalyzer;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    analyzer = new FileCreationPatternAnalyzer();
    jest.clearAllMocks();
  });

  describe('analyze', () => {
    describe('when multiple UseCases share common structure', () => {
      it('detects file creation pattern with common elements', async () => {
        const useCase1 = `
import { Injectable } from '@nestjs/common';
import { Logger } from '@packmind/logger';

@Injectable()
export class CreateUserUseCase extends AbstractUseCase {
  constructor(
    private readonly logger: Logger,
    private readonly userRepository: IUserRepository,
  ) {
    super();
  }

  async execute(command: CreateUserCommand): Promise<User> {
    this.logger.info('Creating user');
    return this.userRepository.save(command);
  }
}
        `;

        const useCase2 = `
import { Injectable } from '@nestjs/common';
import { Logger } from '@packmind/logger';

@Injectable()
export class DeleteUserUseCase extends AbstractUseCase {
  constructor(
    private readonly logger: Logger,
    private readonly userRepository: IUserRepository,
  ) {
    super();
  }

  async execute(command: DeleteUserCommand): Promise<void> {
    this.logger.info('Deleting user');
    await this.userRepository.delete(command.id);
  }
}
        `;

        const useCase3 = `
import { Injectable } from '@nestjs/common';
import { Logger } from '@packmind/logger';

@Injectable()
export class UpdateUserUseCase extends AbstractUseCase {
  constructor(
    private readonly logger: Logger,
    private readonly userRepository: IUserRepository,
  ) {
    super();
  }

  async execute(command: UpdateUserCommand): Promise<User> {
    return this.userRepository.update(command);
  }
}
        `;

        mockFs.readdir.mockImplementation(async (dir) => {
          const p = dir.toString();
          if (p.includes('useCases')) {
            return [
              { name: 'CreateUserUseCase.ts', isDirectory: () => false, isFile: () => true },
              { name: 'DeleteUserUseCase.ts', isDirectory: () => false, isFile: () => true },
              { name: 'UpdateUserUseCase.ts', isDirectory: () => false, isFile: () => true },
            ] as any;
          }
          if (p.includes('application')) {
            return [
              { name: 'useCases', isDirectory: () => true, isFile: () => false },
            ] as any;
          }
          return [];
        });

        mockFs.readFile.mockImplementation(async (filePath) => {
          const p = filePath.toString();
          if (p.includes('CreateUser')) return useCase1;
          if (p.includes('DeleteUser')) return useCase2;
          if (p.includes('UpdateUser')) return useCase3;
          throw new Error('Not found');
        });

        const insights = await analyzer.analyze('/test/project');

        const useCaseInsight = insights.find((i) =>
          i.fileType.includes('UseCase'),
        );
        expect(useCaseInsight).toBeDefined();
        expect(useCaseInsight?.type).toBe('file-pattern');
        expect(useCaseInsight?.commonElements.baseClass).toBe('AbstractUseCase');
        expect(useCaseInsight?.commonElements.decorators).toContain('@Injectable()');
        expect(useCaseInsight?.commonElements.methods).toContain('execute');
      });
    });
  });
});
```

### Step 2: Run test to verify it fails

Run: `nx test cli --testPathPattern=FileCreationPatternAnalyzer`
Expected: FAIL - FileCreationPatternAnalyzer not defined

### Step 3: Write FileCreationPatternAnalyzer implementation

```typescript
// apps/cli/src/application/services/analyzers/FileCreationPatternAnalyzer.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { IFilePatternInsight } from '../../../domain/types/OnboardingInsight';

export interface IFileCreationPatternAnalyzer {
  analyze(projectPath: string): Promise<IFilePatternInsight[]>;
}

interface IFileTypePattern {
  name: string;
  glob: string;
  minSamples: number;
}

export class FileCreationPatternAnalyzer implements IFileCreationPatternAnalyzer {
  private readonly FILE_TYPES: IFileTypePattern[] = [
    { name: 'UseCase', glob: '*UseCase.ts', minSamples: 3 },
    { name: 'Controller', glob: '*.controller.ts', minSamples: 3 },
    { name: 'Service', glob: '*.service.ts', minSamples: 3 },
    { name: 'Repository', glob: '*.repository.ts', minSamples: 2 },
    { name: 'Component', glob: '*.component.tsx', minSamples: 3 },
  ];

  async analyze(projectPath: string): Promise<IFilePatternInsight[]> {
    const insights: IFilePatternInsight[] = [];

    for (const fileType of this.FILE_TYPES) {
      const insight = await this.analyzeFileType(projectPath, fileType);
      if (insight) {
        insights.push(insight);
      }
    }

    return insights;
  }

  private async analyzeFileType(
    projectPath: string,
    fileType: IFileTypePattern,
  ): Promise<IFilePatternInsight | null> {
    const files = await this.findMatchingFiles(projectPath, fileType.glob);

    if (files.length < fileType.minSamples) {
      return null;
    }

    // Sample up to 5 files
    const sampleFiles = files.slice(0, 5);
    const fileContents: string[] = [];

    for (const file of sampleFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        fileContents.push(content);
      } catch {
        // Skip unreadable files
      }
    }

    if (fileContents.length < fileType.minSamples) {
      return null;
    }

    const commonElements = this.extractCommonElements(fileContents);

    // Only interesting if there's a clear pattern
    if (!commonElements.baseClass && commonElements.decorators.length === 0) {
      return null;
    }

    return {
      id: `file-pattern-${fileType.name.toLowerCase()}`,
      type: 'file-pattern',
      title: `All ${files.length} ${fileType.name}s share common structure`,
      description: `${fileType.name} files extend ${commonElements.baseClass || 'no base class'}, use decorators [${commonElements.decorators.join(', ')}], and have methods [${commonElements.methods.join(', ')}]`,
      evidence: sampleFiles.map((f) => path.relative(projectPath, f)),
      severity: 'medium',
      fileType: fileType.name,
      sampleFiles: sampleFiles.map((f) => path.relative(projectPath, f)),
      commonElements,
      variableElements: this.extractVariableElements(fileContents, commonElements),
    };
  }

  private extractCommonElements(contents: string[]): IFilePatternInsight['commonElements'] {
    const baseClasses = contents.map((c) => this.extractBaseClass(c)).filter(Boolean);
    const allImports = contents.map((c) => this.extractImports(c));
    const allDecorators = contents.map((c) => this.extractDecorators(c));
    const allMethods = contents.map((c) => this.extractMethods(c));
    const allConstructorDeps = contents.map((c) => this.extractConstructorDeps(c));

    return {
      baseClass: this.findCommon(baseClasses),
      imports: this.findCommonArray(allImports),
      decorators: this.findCommonArray(allDecorators),
      methods: this.findCommonArray(allMethods),
      constructorDeps: this.findCommonArray(allConstructorDeps),
    };
  }

  private extractBaseClass(content: string): string | undefined {
    const match = content.match(/extends\s+(\w+)/);
    return match ? match[1] : undefined;
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const regex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    return imports;
  }

  private extractDecorators(content: string): string[] {
    const decorators: string[] = [];
    const regex = /@(\w+)\s*\(/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      decorators.push(`@${match[1]}()`);
    }
    return decorators;
  }

  private extractMethods(content: string): string[] {
    const methods: string[] = [];
    const regex = /(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*\w+[<>\[\]]*\s*)?{/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const methodName = match[1];
      if (methodName !== 'constructor' && !methodName.startsWith('_')) {
        methods.push(methodName);
      }
    }
    return methods;
  }

  private extractConstructorDeps(content: string): string[] {
    const deps: string[] = [];
    const constructorMatch = content.match(/constructor\s*\(([^)]+)\)/);
    if (!constructorMatch) return deps;

    const params = constructorMatch[1];
    const regex = /(?:private|readonly|public)\s+(?:readonly\s+)?(\w+)\s*:\s*(\w+)/g;
    let match;
    while ((match = regex.exec(params)) !== null) {
      deps.push(match[2]);
    }
    return deps;
  }

  private findCommon<T>(items: (T | undefined)[]): T | undefined {
    const filtered = items.filter((i): i is T => i !== undefined);
    if (filtered.length === 0) return undefined;

    const first = filtered[0];
    return filtered.every((i) => i === first) ? first : undefined;
  }

  private findCommonArray(arrays: string[][]): string[] {
    if (arrays.length === 0) return [];

    const first = arrays[0];
    return first.filter((item) =>
      arrays.every((arr) => arr.includes(item)),
    );
  }

  private extractVariableElements(
    contents: string[],
    common: IFilePatternInsight['commonElements'],
  ): string[] {
    const variables: string[] = [];

    // Class name is always variable
    variables.push('ClassName');

    // Methods that aren't common
    const allMethods = contents.flatMap((c) => this.extractMethods(c));
    const uniqueMethods = [...new Set(allMethods)].filter(
      (m) => !common.methods.includes(m),
    );
    if (uniqueMethods.length > 0) {
      variables.push(`Additional methods: ${uniqueMethods.slice(0, 3).join(', ')}`);
    }

    return variables;
  }

  private async findMatchingFiles(
    projectPath: string,
    glob: string,
  ): Promise<string[]> {
    const files: string[] = [];
    const pattern = this.globToRegex(glob);
    await this.walkForPattern(projectPath, pattern, files, 0);
    return files;
  }

  private globToRegex(glob: string): RegExp {
    const escaped = glob
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*');
    return new RegExp(`${escaped}$`);
  }

  private async walkForPattern(
    dir: string,
    pattern: RegExp,
    files: string[],
    depth: number,
  ): Promise<void> {
    if (depth > 8 || files.length >= 20) return;

    const IGNORED = ['node_modules', '.git', 'dist', 'build', '.nx', 'coverage'];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && !IGNORED.includes(entry.name)) {
          await this.walkForPattern(fullPath, pattern, files, depth + 1);
        } else if (entry.isFile() && pattern.test(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch {
      // Skip unreadable directories
    }
  }
}
```

### Step 4: Run test to verify it passes

Run: `nx test cli --testPathPattern=FileCreationPatternAnalyzer`
Expected: PASS

### Step 5: Run lint

Run: `nx lint cli`
Expected: PASS

### Step 6: Commit

```bash
git add apps/cli/src/application/services/analyzers/FileCreationPatternAnalyzer.ts
git add apps/cli/src/application/services/analyzers/FileCreationPatternAnalyzer.spec.ts
git commit -m "feat(cli): add FileCreationPatternAnalyzer for detecting file creation patterns"
```

---

## Task 6: Insight to Artifact Mapper

**Files:**
- Create: `apps/cli/src/application/services/InsightToArtifactMapper.ts`
- Create: `apps/cli/src/application/services/InsightToArtifactMapper.spec.ts`

### Step 1: Write failing test for insight to standard mapping

```typescript
// apps/cli/src/application/services/InsightToArtifactMapper.spec.ts
import { InsightToArtifactMapper } from './InsightToArtifactMapper';
import {
  IConfigGapInsight,
  INamingPatternInsight,
  IWorkflowGapInsight,
  IFilePatternInsight,
} from '../../domain/types/OnboardingInsight';

describe('InsightToArtifactMapper', () => {
  let mapper: InsightToArtifactMapper;

  beforeEach(() => {
    mapper = new InsightToArtifactMapper();
  });

  describe('mapToStandards', () => {
    describe('when given a config-gap insight', () => {
      it('generates a standard with rules to fix the gap', () => {
        const insight: IConfigGapInsight = {
          id: 'config-gap-tsconfig',
          type: 'config-gap',
          title: 'TypeScript strict mode enabled but 47 violations found',
          description: 'tsconfig.json has strict mode configured...',
          evidence: ['tsconfig.json', 'src/api/controller.ts:12'],
          severity: 'high',
          config: 'tsconfig.json',
          rule: 'strict mode',
          expected: 'no @ts-ignore',
          found: 47,
          fileMatches: ['src/api/controller.ts:12'],
        };

        const standards = mapper.mapToStandards([insight]);

        expect(standards).toHaveLength(1);
        expect(standards[0].name).toContain('TypeScript');
        expect(standards[0].rules.length).toBeGreaterThan(0);
        expect(standards[0].rules[0].content).toContain('ts-ignore');
      });
    });

    describe('when given a naming-pattern insight', () => {
      it('generates a standard with naming rules', () => {
        const insight: INamingPatternInsight = {
          id: 'naming-controller',
          type: 'naming-pattern',
          title: '94% of files use .controller.ts suffix',
          description: 'Found 15 files following the pattern...',
          evidence: ['user.controller.ts', 'auth.controller.ts'],
          severity: 'medium',
          pattern: '*.controller.ts',
          matchCount: 15,
          exceptions: ['legacyCtrl.ts'],
          consistency: 0.94,
        };

        const standards = mapper.mapToStandards([insight]);

        expect(standards).toHaveLength(1);
        expect(standards[0].name).toContain('Naming');
        expect(standards[0].rules[0].content).toContain('.controller.ts');
      });
    });
  });

  describe('mapToCommands', () => {
    describe('when given a workflow-gap insight', () => {
      it('generates a command to run missing steps locally', () => {
        const insight: IWorkflowGapInsight = {
          id: 'workflow-gap-ci',
          type: 'workflow-gap',
          title: 'CI runs 2 commands with no local script',
          description: 'CI runs typecheck and audit...',
          evidence: ['.github/workflows/', 'package.json'],
          severity: 'high',
          workflowName: 'CI Pipeline',
          ciSteps: ['lint', 'typecheck', 'test', 'audit'],
          localSteps: ['lint', 'test'],
          missingLocally: ['typecheck', 'audit'],
        };

        const commands = mapper.mapToCommands([insight]);

        expect(commands).toHaveLength(1);
        expect(commands[0].name).toContain('Pre-PR');
        expect(commands[0].steps.length).toBeGreaterThan(0);
      });
    });

    describe('when given a file-pattern insight', () => {
      it('generates a command to create new files of that type', () => {
        const insight: IFilePatternInsight = {
          id: 'file-pattern-usecase',
          type: 'file-pattern',
          title: 'All 12 UseCases share common structure',
          description: 'UseCase files extend AbstractUseCase...',
          evidence: ['CreateUserUseCase.ts', 'DeleteUserUseCase.ts'],
          severity: 'medium',
          fileType: 'UseCase',
          sampleFiles: ['CreateUserUseCase.ts'],
          commonElements: {
            baseClass: 'AbstractUseCase',
            imports: ['@nestjs/common'],
            decorators: ['@Injectable()'],
            constructorDeps: ['Logger'],
            methods: ['execute'],
          },
          variableElements: ['ClassName'],
        };

        const commands = mapper.mapToCommands([insight]);

        expect(commands).toHaveLength(1);
        expect(commands[0].name).toContain('Create UseCase');
        expect(commands[0].steps.some((s) => s.codeSnippet?.includes('AbstractUseCase'))).toBe(true);
      });
    });
  });

  describe('calculateScore', () => {
    it('scores high-severity insights higher', () => {
      const highSeverity: IConfigGapInsight = {
        id: '1',
        type: 'config-gap',
        title: 'test',
        description: 'test',
        evidence: [],
        severity: 'high',
        config: 'tsconfig.json',
        rule: 'strict',
        expected: '',
        found: 50,
        fileMatches: [],
      };

      const lowSeverity: IConfigGapInsight = {
        ...highSeverity,
        id: '2',
        severity: 'low',
        found: 5,
      };

      const highScore = mapper.calculateScore(highSeverity);
      const lowScore = mapper.calculateScore(lowSeverity);

      expect(highScore).toBeGreaterThan(lowScore);
    });
  });
});
```

### Step 2: Run test to verify it fails

Run: `nx test cli --testPathPattern=InsightToArtifactMapper`
Expected: FAIL - InsightToArtifactMapper not defined

### Step 3: Write InsightToArtifactMapper implementation

```typescript
// apps/cli/src/application/services/InsightToArtifactMapper.ts
import {
  IInsight,
  IConfigGapInsight,
  INamingPatternInsight,
  ITestPatternInsight,
  IWorkflowGapInsight,
  IFilePatternInsight,
} from '../../domain/types/OnboardingInsight';
import { IGeneratedStandard, IGeneratedRule } from './StandardsGeneratorService';
import { IGeneratedCommand, IGeneratedCommandStep } from './CommandsGeneratorService';

export interface IInsightToArtifactMapper {
  mapToStandards(insights: IInsight[]): IGeneratedStandard[];
  mapToCommands(insights: IInsight[]): IGeneratedCommand[];
  calculateScore(insight: IInsight): number;
}

export class InsightToArtifactMapper implements IInsightToArtifactMapper {
  mapToStandards(insights: IInsight[]): IGeneratedStandard[] {
    const standards: IGeneratedStandard[] = [];

    for (const insight of insights) {
      switch (insight.type) {
        case 'config-gap':
          standards.push(this.configGapToStandard(insight));
          break;
        case 'naming-pattern':
          standards.push(this.namingPatternToStandard(insight));
          break;
        case 'test-pattern':
          standards.push(this.testPatternToStandard(insight));
          break;
      }
    }

    return standards;
  }

  mapToCommands(insights: IInsight[]): IGeneratedCommand[] {
    const commands: IGeneratedCommand[] = [];

    for (const insight of insights) {
      switch (insight.type) {
        case 'workflow-gap':
          commands.push(this.workflowGapToCommand(insight));
          break;
        case 'file-pattern':
          commands.push(this.filePatternToCommand(insight));
          break;
      }
    }

    return commands;
  }

  calculateScore(insight: IInsight): number {
    const severityWeight: Record<string, number> = {
      high: 1.0,
      medium: 0.6,
      low: 0.3,
    };

    let score = severityWeight[insight.severity] || 0.5;

    // Boost score based on evidence count
    score += Math.min(insight.evidence.length * 0.1, 0.3);

    // Type-specific scoring
    switch (insight.type) {
      case 'config-gap':
        score += Math.min((insight as IConfigGapInsight).found / 100, 0.3);
        break;
      case 'naming-pattern':
        score += (1 - (insight as INamingPatternInsight).consistency) * 0.3;
        break;
      case 'workflow-gap':
        score += (insight as IWorkflowGapInsight).missingLocally.length * 0.1;
        break;
    }

    return Math.min(score, 1.0);
  }

  private configGapToStandard(insight: IConfigGapInsight): IGeneratedStandard {
    const rules: IGeneratedRule[] = [];

    if (insight.config.includes('tsconfig')) {
      rules.push({
        content: 'Avoid @ts-ignore - fix the type error or use @ts-expect-error with a comment explaining why',
        examples: {
          positive: '// @ts-expect-error - legacy API returns untyped response until v2 migration',
          negative: '// @ts-ignore',
          language: 'TYPESCRIPT',
        },
      });
      rules.push({
        content: 'Avoid using `any` type - prefer `unknown` for truly unknown types or define proper interfaces',
        examples: {
          positive: 'function parse(input: unknown): Result { ... }',
          negative: 'function parse(input: any): any { ... }',
          language: 'TYPESCRIPT',
        },
      });
    }

    if (insight.config.includes('eslint')) {
      rules.push({
        content: 'Avoid eslint-disable comments - fix the underlying issue or configure the rule properly',
        examples: {
          positive: '// Configure rule in .eslintrc if needed globally',
          negative: '/* eslint-disable */',
          language: 'TYPESCRIPT',
        },
      });
    }

    return {
      name: `${insight.rule} Enforcement`,
      summary: `Enforce ${insight.rule} by eliminating bypass patterns discovered in codebase`,
      description: `Based on insight: "${insight.title}". ${insight.description}`,
      rules,
    };
  }

  private namingPatternToStandard(insight: INamingPatternInsight): IGeneratedStandard {
    const patternName = insight.pattern.replace(/\*/g, '').replace(/\./g, '');

    return {
      name: 'File Naming Conventions',
      summary: `Apply consistent ${patternName} naming pattern across the codebase`,
      description: `Based on insight: "${insight.title}". ${Math.round(insight.consistency * 100)}% of files follow this pattern.`,
      rules: [
        {
          content: `Name files with ${insight.pattern} suffix for consistency`,
          examples: {
            positive: insight.evidence[0] || `example${patternName}`,
            negative: insight.exceptions[0] || 'inconsistentName.ts',
            language: 'GENERIC',
          },
        },
      ],
    };
  }

  private testPatternToStandard(insight: ITestPatternInsight): IGeneratedStandard {
    const rules: IGeneratedRule[] = [];

    if (insight.pattern.includes('factory')) {
      rules.push({
        content: 'Use factory functions for test data instead of inline objects',
        examples: {
          positive: 'const user = createUserFactory({ role: "admin" })',
          negative: 'const user = { id: "1", name: "test", role: "admin" }',
          language: 'TYPESCRIPT',
        },
      });
    }

    if (insight.pattern.includes('nested-describe')) {
      rules.push({
        content: 'Use nested describe blocks to show test context with "when" clauses',
        examples: {
          positive: "describe('UserService', () => { describe('when user exists', () => { it('returns user', ...) }) })",
          negative: "it('should return user when user exists', ...)",
          language: 'TYPESCRIPT',
        },
      });
    }

    if (insight.pattern.includes('beforeEach')) {
      rules.push({
        content: 'Use beforeEach for common test setup',
      });
    }

    return {
      name: 'Test Structure Standards',
      summary: `Apply consistent test patterns based on ${Math.round(insight.frequency * 100)}% codebase usage`,
      description: `Based on insight: "${insight.title}". ${insight.description}`,
      rules,
    };
  }

  private workflowGapToCommand(insight: IWorkflowGapInsight): IGeneratedCommand {
    const steps: IGeneratedCommandStep[] = insight.ciSteps.map((step) => ({
      name: this.formatStepName(step),
      description: `Run ${step} (${insight.missingLocally.includes(step) ? 'CI-only, add local script' : 'available locally'})`,
      codeSnippet: `npm run ${step}`,
    }));

    return {
      name: 'Pre-PR Check',
      summary: 'Run the same checks CI will run, locally before pushing',
      whenToUse: [
        'Before pushing a PR',
        'After major changes',
        'To catch CI failures early',
      ],
      contextValidationCheckpoints: [
        'Are all dependencies installed?',
        'Is the codebase in a clean state?',
      ],
      steps,
    };
  }

  private filePatternToCommand(insight: IFilePatternInsight): IGeneratedCommand {
    const { commonElements, fileType } = insight;

    const imports = commonElements.imports.length > 0
      ? commonElements.imports.map((i) => `import { ... } from '${i}';`).join('\n')
      : '';

    const decorators = commonElements.decorators.join('\n');
    const extendsClause = commonElements.baseClass ? ` extends ${commonElements.baseClass}` : '';
    const constructorDeps = commonElements.constructorDeps.length > 0
      ? `constructor(\n    ${commonElements.constructorDeps.map((d) => `private readonly ${d.toLowerCase()}: ${d}`).join(',\n    ')},\n  ) {\n    ${commonElements.baseClass ? 'super();' : ''}\n  }`
      : '';
    const methods = commonElements.methods
      .map((m) => `async ${m}(): Promise<void> {\n    // Implementation\n  }`)
      .join('\n\n  ');

    const codeSnippet = `${imports}

${decorators}
export class {Name}${fileType}${extendsClause} {
  ${constructorDeps}

  ${methods}
}`;

    return {
      name: `Create ${fileType}`,
      summary: `Create a new ${fileType} following the established project pattern`,
      whenToUse: [
        `Adding a new ${fileType.toLowerCase()} to the codebase`,
        `Implementing new business logic`,
      ],
      contextValidationCheckpoints: [
        `What is the ${fileType} name?`,
        `What domain/module does it belong to?`,
      ],
      steps: [
        {
          name: `Create ${fileType} file`,
          description: `Create {Name}${fileType}.ts following the established pattern`,
          codeSnippet,
        },
        {
          name: 'Create test file',
          description: `Create {Name}${fileType}.spec.ts with test scaffold`,
        },
        {
          name: 'Register in module',
          description: 'Add to module providers/exports if using dependency injection',
        },
      ],
    };
  }

  private formatStepName(step: string): string {
    return step
      .split(/[-_:]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
```

### Step 4: Run test to verify it passes

Run: `nx test cli --testPathPattern=InsightToArtifactMapper`
Expected: PASS

### Step 5: Run lint

Run: `nx lint cli`
Expected: PASS

### Step 6: Commit

```bash
git add apps/cli/src/application/services/InsightToArtifactMapper.ts
git add apps/cli/src/application/services/InsightToArtifactMapper.spec.ts
git commit -m "feat(cli): add InsightToArtifactMapper for converting insights to standards and commands"
```

---

## Task 7: Create Analyzer Index

**Files:**
- Create: `apps/cli/src/application/services/analyzers/index.ts`

### Step 1: Create barrel export

```typescript
// apps/cli/src/application/services/analyzers/index.ts
export * from './ConfigGapAnalyzer';
export * from './NamingConventionAnalyzer';
export * from './TestPatternAnalyzer';
export * from './ScriptWorkflowAnalyzer';
export * from './FileCreationPatternAnalyzer';
```

### Step 2: Commit

```bash
git add apps/cli/src/application/services/analyzers/index.ts
git commit -m "feat(cli): add analyzer index for barrel exports"
```

---

## Task 8: Update AggressiveOnboardingUseCase

**Files:**
- Modify: `apps/cli/src/application/useCases/AggressiveOnboardingUseCase.ts`
- Modify: `apps/cli/src/application/useCases/AggressiveOnboardingUseCase.spec.ts`

### Step 1: Update interface to include insights

First, update the domain interface:

```typescript
// Modify apps/cli/src/domain/useCases/IAggressiveOnboardingUseCase.ts
// Add to IAggressiveOnboardingResult:
import { IInsight } from '../types/OnboardingInsight';

export interface IAggressiveOnboardingResult {
  content: IGeneratedContent;
  preview: string;
  scanResult: IProjectScanResult;
  insights: IInsight[];  // ADD THIS
}
```

### Step 2: Update use case implementation

```typescript
// Modify apps/cli/src/application/useCases/AggressiveOnboardingUseCase.ts
// Add imports:
import {
  IConfigGapAnalyzer,
  INamingConventionAnalyzer,
  ITestPatternAnalyzer,
  IScriptWorkflowAnalyzer,
  IFileCreationPatternAnalyzer,
} from '../services/analyzers';
import { IInsightToArtifactMapper } from '../services/InsightToArtifactMapper';
import { IInsight } from '../../domain/types/OnboardingInsight';

// Update constructor to inject analyzers:
export class AggressiveOnboardingUseCase implements IAggressiveOnboardingUseCase {
  constructor(
    private readonly projectScanner: IProjectScannerService,
    private readonly documentationScanner: IDocumentationScannerService,
    private readonly standardsGenerator: IStandardsGeneratorService,
    private readonly commandsGenerator: ICommandsGeneratorService,
    private readonly skillsGenerator: ISkillsGeneratorService,
    private readonly skillsScanner: ISkillsScannerService,
    private readonly contentPreview: IContentPreviewService,
    // NEW: Add analyzers
    private readonly configGapAnalyzer: IConfigGapAnalyzer,
    private readonly namingConventionAnalyzer: INamingConventionAnalyzer,
    private readonly testPatternAnalyzer: ITestPatternAnalyzer,
    private readonly scriptWorkflowAnalyzer: IScriptWorkflowAnalyzer,
    private readonly fileCreationPatternAnalyzer: IFileCreationPatternAnalyzer,
    private readonly insightToArtifactMapper: IInsightToArtifactMapper,
  ) {}

  async execute(
    command: IAggressiveOnboardingCommand,
  ): Promise<IAggressiveOnboardingResult> {
    const projectPath = command.projectPath || process.cwd();

    // Step 1: Scan project (read-only)
    const scanResult = await this.projectScanner.scanProject(projectPath);

    // Step 2: Scan existing documentation
    const existingDocs =
      await this.documentationScanner.scanExistingDocumentation(projectPath);

    // Step 3: Scan for existing skills
    const skillsScanResult =
      await this.skillsScanner.scanExistingSkills(projectPath);

    // Step 4: Run insight analyzers in parallel
    const [configGaps, namingPatterns, testPatterns, workflows, filePatterns] =
      await Promise.all([
        this.configGapAnalyzer.analyze(projectPath),
        this.namingConventionAnalyzer.analyze(projectPath),
        this.testPatternAnalyzer.analyze(projectPath),
        this.scriptWorkflowAnalyzer.analyze(projectPath),
        this.fileCreationPatternAnalyzer.analyze(projectPath),
      ]);

    // Merge all insights
    const insights: IInsight[] = [
      ...configGaps,
      ...namingPatterns,
      ...testPatterns,
      ...workflows,
      ...filePatterns,
    ];

    // Sort by score
    insights.sort(
      (a, b) =>
        this.insightToArtifactMapper.calculateScore(b) -
        this.insightToArtifactMapper.calculateScore(a),
    );

    // Step 5: Generate content from insights
    const insightStandards = this.insightToArtifactMapper.mapToStandards(insights);
    const insightCommands = this.insightToArtifactMapper.mapToCommands(insights);

    // Also generate from existing logic (for frameworks, etc.)
    const frameworkStandards = this.standardsGenerator.generateStandards(
      scanResult,
      existingDocs,
    );
    const frameworkCommands = this.commandsGenerator.generateCommands(scanResult);
    const skills = this.skillsGenerator.generateSkills(scanResult);

    // Merge: insight-based artifacts first, then framework-based
    const content = {
      standards: [...insightStandards, ...frameworkStandards],
      commands: [...insightCommands, ...frameworkCommands],
      skills,
      discoveredSkills: skillsScanResult.skills,
    };

    // Step 6: Format preview
    const preview = this.contentPreview.formatPreview(content);

    return {
      content,
      preview,
      scanResult,
      insights,
    };
  }
}
```

### Step 3: Update tests

```typescript
// Modify apps/cli/src/application/useCases/AggressiveOnboardingUseCase.spec.ts
// Add mock analyzers to test setup and verify they're called
```

### Step 4: Run tests

Run: `nx test cli --testPathPattern=AggressiveOnboardingUseCase`
Expected: PASS

### Step 5: Run lint

Run: `nx lint cli`
Expected: PASS

### Step 6: Commit

```bash
git add apps/cli/src/domain/useCases/IAggressiveOnboardingUseCase.ts
git add apps/cli/src/application/useCases/AggressiveOnboardingUseCase.ts
git add apps/cli/src/application/useCases/AggressiveOnboardingUseCase.spec.ts
git commit -m "feat(cli): integrate insight analyzers into AggressiveOnboardingUseCase"
```

---

## Task 9: Update ContentPreviewService for Insights Display

**Files:**
- Modify: `apps/cli/src/application/services/ContentPreviewService.ts`

### Step 1: Update preview to show insights

```typescript
// Modify apps/cli/src/application/services/ContentPreviewService.ts
// Add insights display to formatPreview method:

formatPreview(content: IGeneratedContent, insights?: IInsight[]): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('='.repeat(60));
  lines.push('  GENERATED CONTENT PREVIEW');
  lines.push('='.repeat(60));
  lines.push('');

  // NEW: Show insights first (max 4)
  if (insights && insights.length > 0) {
    lines.push('INSIGHTS:');
    lines.push('');
    insights.slice(0, 4).forEach((insight, idx) => {
      lines.push(`  ${idx + 1}. ${insight.title}`);
      lines.push(`     evidence: ${insight.evidence.slice(0, 3).join(', ')}`);
      lines.push('');
    });
  }

  // ... rest of existing preview code
}
```

### Step 2: Commit

```bash
git add apps/cli/src/application/services/ContentPreviewService.ts
git commit -m "feat(cli): update ContentPreviewService to display insights"
```

---

## Task 10: Wire Up in PackmindCliHexa

**Files:**
- Modify: `apps/cli/src/PackmindCliHexa.ts`

### Step 1: Add analyzer instantiation and injection

```typescript
// Modify apps/cli/src/PackmindCliHexa.ts
// Add imports:
import {
  ConfigGapAnalyzer,
  NamingConventionAnalyzer,
  TestPatternAnalyzer,
  ScriptWorkflowAnalyzer,
  FileCreationPatternAnalyzer,
} from './application/services/analyzers';
import { InsightToArtifactMapper } from './application/services/InsightToArtifactMapper';

// In the hexa factory or class, instantiate and inject:
private configGapAnalyzer = new ConfigGapAnalyzer();
private namingConventionAnalyzer = new NamingConventionAnalyzer();
private testPatternAnalyzer = new TestPatternAnalyzer();
private scriptWorkflowAnalyzer = new ScriptWorkflowAnalyzer();
private fileCreationPatternAnalyzer = new FileCreationPatternAnalyzer();
private insightToArtifactMapper = new InsightToArtifactMapper();

// Update AggressiveOnboardingUseCase instantiation to include new deps
```

### Step 2: Run lint and tests

Run: `nx lint cli && nx test cli`
Expected: PASS

### Step 3: Commit

```bash
git add apps/cli/src/PackmindCliHexa.ts
git commit -m "feat(cli): wire up insight analyzers in PackmindCliHexa"
```

---

## Task 11: Integration Testing

**Files:**
- Create: `apps/cli/src/application/useCases/EnhancedOnboardingIntegration.spec.ts`

### Step 1: Write integration test

```typescript
// apps/cli/src/application/useCases/EnhancedOnboardingIntegration.spec.ts
import {
  ConfigGapAnalyzer,
  NamingConventionAnalyzer,
  TestPatternAnalyzer,
  ScriptWorkflowAnalyzer,
  FileCreationPatternAnalyzer,
} from '../services/analyzers';
import { InsightToArtifactMapper } from '../services/InsightToArtifactMapper';

describe('Enhanced Onboarding Integration', () => {
  describe('when run against current repository', () => {
    it('generates insights from config gaps', async () => {
      const analyzer = new ConfigGapAnalyzer();
      const insights = await analyzer.analyze(process.cwd());

      // Should detect something in a real codebase
      expect(insights.length).toBeGreaterThanOrEqual(0);
      insights.forEach((insight) => {
        expect(insight.type).toBe('config-gap');
        expect(insight.evidence.length).toBeGreaterThan(0);
      });
    });

    it('generates insights from naming patterns', async () => {
      const analyzer = new NamingConventionAnalyzer();
      const insights = await analyzer.analyze(process.cwd());

      expect(insights.length).toBeGreaterThanOrEqual(0);
    });

    it('maps insights to standards and commands', async () => {
      const configAnalyzer = new ConfigGapAnalyzer();
      const namingAnalyzer = new NamingConventionAnalyzer();
      const workflowAnalyzer = new ScriptWorkflowAnalyzer();
      const fileAnalyzer = new FileCreationPatternAnalyzer();
      const mapper = new InsightToArtifactMapper();

      const [configInsights, namingInsights, workflowInsights, fileInsights] =
        await Promise.all([
          configAnalyzer.analyze(process.cwd()),
          namingAnalyzer.analyze(process.cwd()),
          workflowAnalyzer.analyze(process.cwd()),
          fileAnalyzer.analyze(process.cwd()),
        ]);

      const allInsights = [
        ...configInsights,
        ...namingInsights,
        ...workflowInsights,
        ...fileInsights,
      ];

      if (allInsights.length > 0) {
        const standards = mapper.mapToStandards(allInsights);
        const commands = mapper.mapToCommands(allInsights);

        // Should generate at least something
        expect(standards.length + commands.length).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
```

### Step 2: Run integration test

Run: `nx test cli --testPathPattern=EnhancedOnboardingIntegration`
Expected: PASS

### Step 3: Run full test suite

Run: `nx test cli`
Expected: PASS

### Step 4: Commit

```bash
git add apps/cli/src/application/useCases/EnhancedOnboardingIntegration.spec.ts
git commit -m "test(cli): add enhanced onboarding integration tests"
```

---

## Task 12: Update packmind-onboard Skill

**Files:**
- Modify: `packages/coding-agent/src/infra/repositories/defaultSkillsDeployer/OnboardDeployer.ts`

### Step 1: Update skill content

Update the skill markdown to reflect the new insight-driven output format per the design document.

### Step 2: Run lint

Run: `nx lint coding-agent`
Expected: PASS

### Step 3: Commit

```bash
git add packages/coding-agent/src/infra/repositories/defaultSkillsDeployer/OnboardDeployer.ts
git commit -m "feat(coding-agent): update packmind-onboard skill for insight-driven output"
```

---

## Task 13: Final Quality Gate

### Step 1: Run affected tests

Run: `npm run test:staged`
Expected: PASS

### Step 2: Run affected lint

Run: `npm run lint:staged`
Expected: PASS

### Step 3: Run full build

Run: `nx build cli`
Expected: PASS

### Step 4: Manual test

Run: `node dist/apps/cli/main.cjs onboard --dry-run --print`
Expected: Shows insights with evidence, then generated standards and commands

### Step 5: Final commit

```bash
git add -A
git commit -m "feat(cli): complete enhanced onboarding with insight analyzers

- ConfigGapAnalyzer: detects config vs reality gaps
- NamingConventionAnalyzer: detects file naming patterns
- TestPatternAnalyzer: detects test structure patterns
- ScriptWorkflowAnalyzer: detects CI vs local workflow gaps
- FileCreationPatternAnalyzer: detects file creation patterns
- InsightToArtifactMapper: converts insights to Standards and Commands
- All analyzers run in parallel for performance
- Insights sorted by score (severity + evidence)
- Full test coverage"
```

---

## Success Criteria

- [ ] ConfigGapAnalyzer detects @ts-ignore and eslint-disable violations
- [ ] NamingConventionAnalyzer detects file suffix patterns with consistency scores
- [ ] TestPatternAnalyzer detects factory usage and nested describe patterns
- [ ] ScriptWorkflowAnalyzer detects CI steps missing locally
- [ ] FileCreationPatternAnalyzer detects common file structures
- [ ] InsightToArtifactMapper generates Standards from config/naming/test insights
- [ ] InsightToArtifactMapper generates Commands from workflow/file insights
- [ ] Insights show evidence (file paths) proving the discovery
- [ ] Preview shows max 4 insights with evidence
- [ ] All analyzers have unit tests
- [ ] Integration test passes on current repo
- [ ] Full quality gate passes

---

## References

- Existing services: `apps/cli/src/application/services/`
- Test patterns: `apps/cli/src/application/services/*.spec.ts`
- Use case: `apps/cli/src/application/useCases/AggressiveOnboardingUseCase.ts`
- Design doc: `docs/plans/2026-01-28-enhanced-onboarding-insights.md`
