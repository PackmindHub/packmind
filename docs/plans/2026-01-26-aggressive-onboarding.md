# Aggressive Onboarding Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automatically scan user projects during installation, generate Standards/Rules, Commands, and Skills based on detected tools/frameworks, preview them in CLI, and push to backend after user approval.

**Architecture:** CLI install command → read-only project scanner → generate Standards/Rules/Commands/Skills → preview in CLI → user approval → push to backend via existing APIs → user manages in webapp (delete if not needed, add to packages later).

**Tech Stack:** TypeScript, cmd-ts (CLI), existing Packmind Gateway APIs (createStandard, uploadSkill, save_command MCP tool)

---

## Task 1: Project Scanner Service

**Files:**
- Create: `apps/cli/src/application/services/ProjectScannerService.ts`
- Create: `apps/cli/src/application/services/ProjectScannerService.spec.ts`

**Step 1: Write failing test for project scanner**

```typescript
// apps/cli/src/application/services/ProjectScannerService.spec.ts
import { ProjectScannerService } from './ProjectScannerService';
import { describe, it, expect, beforeEach } from 'vitest';

describe('ProjectScannerService', () => {
  let service: ProjectScannerService;

  beforeEach(() => {
    service = new ProjectScannerService();
  });

  describe('scanProject', () => {
    it('detects TypeScript and returns language info', async () => {
      const result = await service.scanProject('/test/project');

      expect(result.languages).toContain('typescript');
    });

    it('detects NestJS framework from package.json', async () => {
      const result = await service.scanProject('/test/project');

      expect(result.frameworks).toContain('nestjs');
    });

    it('detects monorepo structure', async () => {
      const result = await service.scanProject('/test/project');

      expect(result.structure.isMonorepo).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- ProjectScannerService.spec.ts`
Expected: FAIL - ProjectScannerService not defined

**Step 3: Write ProjectScannerService implementation**

```typescript
// apps/cli/src/application/services/ProjectScannerService.ts
import * as fs from 'fs/promises';
import * as path from 'path';

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
}

export class ProjectScannerService {
  async scanProject(projectPath: string): Promise<IProjectScanResult> {
    const files = await this.listFilesShallow(projectPath);
    const packageJson = await this.readPackageJson(projectPath);

    return {
      languages: this.detectLanguages(files),
      frameworks: this.detectFrameworks(packageJson),
      tools: this.detectTools(files, packageJson),
      structure: await this.detectStructure(projectPath),
      testFramework: this.detectTestFramework(files, packageJson),
      packageManager: this.detectPackageManager(files),
      hasTypeScript: files.includes('tsconfig.json'),
      hasLinting: this.hasLinting(files),
    };
  }

  private async listFilesShallow(projectPath: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(projectPath, { withFileTypes: true });
      return entries.map(e => e.name);
    } catch {
      return [];
    }
  }

  private async readPackageJson(projectPath: string): Promise<any> {
    try {
      const content = await fs.readFile(path.join(projectPath, 'package.json'), 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private detectLanguages(files: string[]): string[] {
    const languages = new Set<string>();

    if (files.includes('tsconfig.json')) languages.add('typescript');
    if (files.includes('package.json')) languages.add('javascript');
    if (files.includes('requirements.txt') || files.includes('setup.py')) languages.add('python');
    if (files.includes('go.mod')) languages.add('go');
    if (files.includes('Cargo.toml')) languages.add('rust');
    if (files.includes('composer.json')) languages.add('php');

    return Array.from(languages);
  }

  private detectFrameworks(packageJson: any): string[] {
    if (!packageJson?.dependencies) return [];

    const frameworks: string[] = [];
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    if (deps['@nestjs/core']) frameworks.push('nestjs');
    if (deps['react']) frameworks.push('react');
    if (deps['vue']) frameworks.push('vue');
    if (deps['@angular/core']) frameworks.push('angular');
    if (deps['express']) frameworks.push('express');
    if (deps['next']) frameworks.push('nextjs');
    if (deps['@remix-run/react']) frameworks.push('remix');

    return frameworks;
  }

  private detectTools(files: string[], packageJson: any): string[] {
    const tools: string[] = [];

    if (files.includes('.eslintrc.js') || files.includes('.eslintrc.json')) tools.push('eslint');
    if (files.includes('.prettierrc') || files.includes('.prettierrc.json')) tools.push('prettier');
    if (files.includes('nx.json')) tools.push('nx');
    if (files.includes('turbo.json')) tools.push('turbo');

    return tools;
  }

  private async detectStructure(projectPath: string): Promise<{ isMonorepo: boolean; hasTests: boolean; hasSrcDirectory: boolean }> {
    const entries = await fs.readdir(projectPath, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);

    return {
      isMonorepo: dirs.includes('packages') || dirs.includes('apps'),
      hasTests: dirs.includes('test') || dirs.includes('tests') || dirs.includes('__tests__'),
      hasSrcDirectory: dirs.includes('src'),
    };
  }

  private detectTestFramework(files: string[], packageJson: any): string | undefined {
    const deps = packageJson ? { ...packageJson.dependencies, ...packageJson.devDependencies } : {};

    if (deps['vitest'] || files.includes('vitest.config.ts')) return 'vitest';
    if (deps['jest'] || files.includes('jest.config.js')) return 'jest';
    if (deps['mocha']) return 'mocha';

    return undefined;
  }

  private detectPackageManager(files: string[]): string | undefined {
    if (files.includes('pnpm-lock.yaml')) return 'pnpm';
    if (files.includes('yarn.lock')) return 'yarn';
    if (files.includes('package-lock.json')) return 'npm';
    return undefined;
  }

  private hasLinting(files: string[]): boolean {
    return files.includes('.eslintrc.js') ||
           files.includes('.eslintrc.json') ||
           files.includes('.eslintrc.cjs');
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- ProjectScannerService.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cli/src/application/services/ProjectScannerService*
git commit -m "feat(cli): add project scanner service for onboarding"
```

---

## Task 2: Existing Documentation Scanner Service

**Files:**
- Create: `apps/cli/src/application/services/DocumentationScannerService.ts`
- Create: `apps/cli/src/application/services/DocumentationScannerService.spec.ts`

**Step 1: Write failing test for documentation scanner**

```typescript
// apps/cli/src/application/services/DocumentationScannerService.spec.ts
import { DocumentationScannerService } from './DocumentationScannerService';
import { describe, it, expect, beforeEach } from 'vitest';

describe('DocumentationScannerService', () => {
  let service: DocumentationScannerService;

  beforeEach(() => {
    service = new DocumentationScannerService();
  });

  describe('scanExistingDocumentation', () => {
    it('extracts rules from CLAUDE.md', async () => {
      const result = await service.scanExistingDocumentation('/test/project');

      expect(result.extractedRules).toBeDefined();
    });

    it('extracts conventions from CONTRIBUTING.md', async () => {
      const result = await service.scanExistingDocumentation('/test/project');

      expect(result.extractedConventions).toBeDefined();
    });
  });

  describe('parseRulesFromMarkdown', () => {
    it('extracts bullet points as rules', () => {
      const markdown = `
# Coding Standards

- Use TypeScript strict mode
- Always add tests for new features
- Follow conventional commits
      `;

      const rules = service.parseRulesFromMarkdown(markdown);

      expect(rules).toHaveLength(3);
      expect(rules[0]).toBe('Use TypeScript strict mode');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- DocumentationScannerService.spec.ts`
Expected: FAIL - DocumentationScannerService not defined

**Step 3: Write DocumentationScannerService implementation**

```typescript
// apps/cli/src/application/services/DocumentationScannerService.ts
import * as fs from 'fs/promises';
import * as path from 'path';

export interface IExistingDocumentation {
  extractedRules: string[];
  extractedConventions: string[];
  extractedWorkflows: string[];
  sourceFiles: string[];
}

export class DocumentationScannerService {
  async scanExistingDocumentation(projectPath: string): Promise<IExistingDocumentation> {
    const extractedRules: string[] = [];
    const extractedConventions: string[] = [];
    const extractedWorkflows: string[] = [];
    const sourceFiles: string[] = [];

    const docsToCheck = [
      'CLAUDE.md',
      '.cursorrules',
      'CONTRIBUTING.md',
      'CONVENTIONS.md',
      'CODE_STYLE.md',
      'docs/standards',
      'docs/conventions',
      '.claude/rules',
      '.packmind/standards',
    ];

    for (const docPath of docsToCheck) {
      const fullPath = path.join(projectPath, docPath);
      try {
        const stats = await fs.stat(fullPath);

        if (stats.isFile()) {
          const content = await fs.readFile(fullPath, 'utf-8');
          sourceFiles.push(docPath);

          // Extract rules from markdown
          const rules = this.parseRulesFromMarkdown(content);
          extractedRules.push(...rules);

          // Extract conventions
          const conventions = this.parseConventionsFromMarkdown(content);
          extractedConventions.push(...conventions);

          // Extract workflows/commands
          const workflows = this.parseWorkflowsFromMarkdown(content);
          extractedWorkflows.push(...workflows);
        } else if (stats.isDirectory()) {
          const files = await fs.readdir(fullPath);
          for (const file of files) {
            if (file.endsWith('.md')) {
              const content = await fs.readFile(path.join(fullPath, file), 'utf-8');
              sourceFiles.push(path.join(docPath, file));

              const rules = this.parseRulesFromMarkdown(content);
              extractedRules.push(...rules);

              const conventions = this.parseConventionsFromMarkdown(content);
              extractedConventions.push(...conventions);

              const workflows = this.parseWorkflowsFromMarkdown(content);
              extractedWorkflows.push(...workflows);
            }
          }
        }
      } catch {
        // File/directory doesn't exist, skip
      }
    }

    return {
      extractedRules: this.deduplicateRules(extractedRules),
      extractedConventions: this.deduplicateRules(extractedConventions),
      extractedWorkflows,
      sourceFiles,
    };
  }

  parseRulesFromMarkdown(content: string): string[] {
    const rules: string[] = [];

    // Extract bullet points
    const bulletRegex = /^[\s]*[-*]\s+(.+)$/gm;
    let match;

    while ((match = bulletRegex.exec(content)) !== null) {
      const rule = match[1].trim();

      // Filter out non-rule bullets (e.g., TOC items, links)
      if (rule.length > 10 && !rule.startsWith('[') && !rule.startsWith('http')) {
        rules.push(rule);
      }
    }

    // Extract numbered lists
    const numberedRegex = /^[\s]*\d+\.\s+(.+)$/gm;
    while ((match = numberedRegex.exec(content)) !== null) {
      const rule = match[1].trim();
      if (rule.length > 10 && !rule.startsWith('[') && !rule.startsWith('http')) {
        rules.push(rule);
      }
    }

    return rules;
  }

  parseConventionsFromMarkdown(content: string): string[] {
    const conventions: string[] = [];

    // Look for sections about conventions, patterns, or best practices
    const conventionSections = content.match(
      /##?\s+(Conventions?|Patterns?|Best Practices?|Guidelines?)[\s\S]*?(?=##|$)/gi
    );

    if (conventionSections) {
      for (const section of conventionSections) {
        const rules = this.parseRulesFromMarkdown(section);
        conventions.push(...rules);
      }
    }

    return conventions;
  }

  parseWorkflowsFromMarkdown(content: string): string[] {
    const workflows: string[] = [];

    // Look for step-by-step workflows (numbered or ordered lists)
    const workflowRegex = /##?\s+(.+?)\n((?:[\s]*\d+\.\s+.+\n?)+)/gi;
    let match;

    while ((match = workflowRegex.exec(content)) !== null) {
      const title = match[1].trim();
      const steps = match[2].trim();

      // Only include if it has at least 3 steps
      const stepCount = (steps.match(/\d+\.\s+/g) || []).length;
      if (stepCount >= 3) {
        workflows.push(JSON.stringify({ title, steps }));
      }
    }

    return workflows;
  }

  private deduplicateRules(rules: string[]): string[] {
    const seen = new Set<string>();
    const deduplicated: string[] = [];

    for (const rule of rules) {
      const normalized = rule.toLowerCase().replace(/[^\w\s]/g, '');
      if (!seen.has(normalized)) {
        seen.add(normalized);
        deduplicated.push(rule);
      }
    }

    return deduplicated;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- DocumentationScannerService.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cli/src/application/services/DocumentationScannerService*
git commit -m "feat(cli): add documentation scanner to extract existing rules and conventions"
```

---

## Task 3: Content Generator Service - Standards

**Files:**
- Create: `apps/cli/src/application/services/StandardsGeneratorService.ts`
- Create: `apps/cli/src/application/services/StandardsGeneratorService.spec.ts`

**Step 1: Write failing test**

```typescript
// apps/cli/src/application/services/StandardsGeneratorService.spec.ts
import { StandardsGeneratorService } from './StandardsGeneratorService';
import { describe, it, expect, beforeEach } from 'vitest';

describe('StandardsGeneratorService', () => {
  let service: StandardsGeneratorService;

  beforeEach(() => {
    service = new StandardsGeneratorService();
  });

  describe('generateStandards', () => {
    it('generates TypeScript standard when TypeScript detected', () => {
      const scanResult = {
        languages: ['typescript'],
        frameworks: [],
        tools: [],
        structure: { isMonorepo: false, hasTests: false, hasSrcDirectory: true },
        hasTypeScript: true,
        hasLinting: false,
      };

      const standards = service.generateStandards(scanResult, { extractedRules: [], extractedConventions: [], extractedWorkflows: [], sourceFiles: [] });

      expect(standards).toHaveLength(1);
      expect(standards[0].name).toContain('TypeScript');
      expect(standards[0].rules.length).toBeGreaterThan(0);
    });

    it('generates NestJS standard when NestJS detected', () => {
      const scanResult = {
        languages: ['typescript'],
        frameworks: ['nestjs'],
        tools: [],
        structure: { isMonorepo: false, hasTests: false, hasSrcDirectory: true },
        hasTypeScript: true,
        hasLinting: false,
      };

      const standards = service.generateStandards(scanResult, { extractedRules: [], extractedConventions: [], extractedWorkflows: [], sourceFiles: [] });

      const nestjsStandard = standards.find(s => s.name.includes('NestJS'));
      expect(nestjsStandard).toBeDefined();
      expect(nestjsStandard?.rules.length).toBeGreaterThan(0);
    });

    it('generates standards from extracted documentation rules', () => {
      const scanResult = {
        languages: ['typescript'],
        frameworks: [],
        tools: [],
        structure: { isMonorepo: false, hasTests: false, hasSrcDirectory: true },
        hasTypeScript: true,
        hasLinting: false,
      };

      const existingDocs = {
        extractedRules: ['Use strict mode in TypeScript', 'Always add tests for new features'],
        extractedConventions: ['Follow conventional commits'],
        extractedWorkflows: [],
        sourceFiles: ['CLAUDE.md'],
      };

      const standards = service.generateStandards(scanResult, existingDocs);

      const extractedStandard = standards.find(s => s.name.includes('Extracted'));
      expect(extractedStandard).toBeDefined();
      expect(extractedStandard?.rules.length).toBeGreaterThan(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- StandardsGeneratorService.spec.ts`
Expected: FAIL

**Step 3: Write StandardsGeneratorService implementation**

```typescript
// apps/cli/src/application/services/StandardsGeneratorService.ts
import { IProjectScanResult } from './ProjectScannerService';
import { IExistingDocumentation } from './DocumentationScannerService';

export interface IGeneratedStandard {
  name: string;
  description: string;
  summary: string;
  rules: Array<{
    content: string;
    examples?: {
      positive: string;
      negative: string;
      language: string;
    };
  }>;
}

export class StandardsGeneratorService {
  generateStandards(scanResult: IProjectScanResult, existingDocs: IExistingDocumentation): IGeneratedStandard[] {
    const standards: IGeneratedStandard[] = [];

    // Generate from existing documentation first
    if (existingDocs.extractedRules.length > 0 || existingDocs.extractedConventions.length > 0) {
      standards.push(this.generateExtractedStandard(existingDocs));
    }

    if (scanResult.hasTypeScript) {
      standards.push(this.generateTypeScriptStandard());
    }

    if (scanResult.frameworks.includes('nestjs')) {
      standards.push(this.generateNestJSStandard());
    }

    if (scanResult.frameworks.includes('react')) {
      standards.push(this.generateReactStandard());
    }

    if (scanResult.testFramework) {
      standards.push(this.generateTestingStandard(scanResult.testFramework));
    }

    if (scanResult.structure.isMonorepo) {
      standards.push(this.generateMonorepoStandard());
    }

    return standards;
  }

  private generateExtractedStandard(existingDocs: IExistingDocumentation): IGeneratedStandard {
    const allRules = [...existingDocs.extractedRules, ...existingDocs.extractedConventions];

    return {
      name: 'Extracted Project Standards',
      summary: `Apply standards extracted from ${existingDocs.sourceFiles.join(', ')}`,
      description: `Standards and conventions extracted from existing project documentation including ${existingDocs.sourceFiles.join(', ')}. These represent the team's established practices and guidelines.`,
      rules: allRules.slice(0, 15).map(rule => ({ content: rule })), // Limit to 15 rules
    };
  }

  private generateTypeScriptStandard(): IGeneratedStandard {
    return {
      name: 'TypeScript Coding Standards',
      summary: 'Apply TypeScript best practices for type safety and code quality',
      description: 'Standards for writing clean, type-safe TypeScript code with proper interfaces, types, and naming conventions.',
      rules: [
        {
          content: 'Prefix interfaces with "I" to distinguish them from types and classes',
          examples: {
            positive: 'interface IUser {\n  id: string;\n  name: string;\n}',
            negative: 'interface User {\n  id: string;\n  name: string;\n}',
            language: 'TYPESCRIPT',
          },
        },
        {
          content: 'Use "type" for plain objects and "interface" when implementation is required',
          examples: {
            positive: 'type UserDTO = {\n  id: string;\n  name: string;\n};\n\ninterface IUserRepository {\n  findById(id: string): Promise<User>;\n}',
            negative: 'interface UserDTO {\n  id: string;\n  name: string;\n}',
            language: 'TYPESCRIPT',
          },
        },
        {
          content: 'Use explicit return types for functions to improve type inference',
        },
        {
          content: 'Avoid using "any" type - prefer "unknown" or proper types',
        },
      ],
    };
  }

  private generateNestJSStandard(): IGeneratedStandard {
    return {
      name: 'NestJS Architecture Standards',
      summary: 'Apply NestJS architectural patterns for modular and maintainable backend services',
      description: 'Standards for structuring NestJS applications with proper module organization, dependency injection, and controller patterns.',
      rules: [
        {
          content: 'Organize code by feature modules, each with its own controller, service, and entities',
        },
        {
          content: 'Use dependency injection for all service dependencies via constructor injection',
          examples: {
            positive: '@Injectable()\nexport class UserService {\n  constructor(\n    @InjectRepository(User)\n    private userRepo: Repository<User>\n  ) {}\n}',
            negative: '@Injectable()\nexport class UserService {\n  private userRepo = new Repository();\n}',
            language: 'TYPESCRIPT',
          },
        },
        {
          content: 'Prefix abstract classes with "Abstract" for base classes',
        },
        {
          content: 'Use DTOs (Data Transfer Objects) for request validation with class-validator',
        },
      ],
    };
  }

  private generateReactStandard(): IGeneratedStandard {
    return {
      name: 'React Component Standards',
      summary: 'Apply React best practices for component structure and hooks usage',
      description: 'Standards for building React components with hooks, proper state management, and component composition.',
      rules: [
        {
          content: 'Use functional components with hooks instead of class components',
        },
        {
          content: 'Extract custom hooks for reusable stateful logic',
        },
        {
          content: 'Use TypeScript interfaces for component props',
        },
        {
          content: 'Keep components focused on single responsibility',
        },
      ],
    };
  }

  private generateTestingStandard(testFramework: string): IGeneratedStandard {
    return {
      name: `${testFramework.charAt(0).toUpperCase() + testFramework.slice(1)} Testing Standards`,
      summary: `Apply ${testFramework} testing best practices for reliable test suites`,
      description: `Standards for writing maintainable tests using ${testFramework} with proper structure and assertions.`,
      rules: [
        {
          content: 'Use descriptive test names that explain the expected behavior',
        },
        {
          content: 'Follow Arrange-Act-Assert pattern for test structure',
        },
        {
          content: 'Keep one assertion per test for clarity',
        },
        {
          content: 'Use "describe" blocks to group related tests',
        },
      ],
    };
  }

  private generateMonorepoStandard(): IGeneratedStandard {
    return {
      name: 'Monorepo Organization Standards',
      summary: 'Apply monorepo best practices for package organization and dependencies',
      description: 'Standards for organizing code in a monorepo structure with clear package boundaries and dependency management.',
      rules: [
        {
          content: 'Organize packages by domain or feature, not by layer',
        },
        {
          content: 'Use workspace protocols for internal package dependencies',
        },
        {
          content: 'Keep shared code in dedicated packages',
        },
      ],
    };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- StandardsGeneratorService.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cli/src/application/services/StandardsGeneratorService*
git commit -m "feat(cli): add standards generator service"
```

---

## Task 3: Content Generator Service - Commands

**Files:**
- Create: `apps/cli/src/application/services/CommandsGeneratorService.ts`
- Create: `apps/cli/src/application/services/CommandsGeneratorService.spec.ts`

**Step 1: Write failing test**

```typescript
// apps/cli/src/application/services/CommandsGeneratorService.spec.ts
import { CommandsGeneratorService } from './CommandsGeneratorService';
import { describe, it, expect, beforeEach } from 'vitest';

describe('CommandsGeneratorService', () => {
  let service: CommandsGeneratorService;

  beforeEach(() => {
    service = new CommandsGeneratorService();
  });

  describe('generateCommands', () => {
    it('generates NestJS module command when NestJS detected', () => {
      const scanResult = {
        languages: ['typescript'],
        frameworks: ['nestjs'],
        tools: [],
        structure: { isMonorepo: false, hasTests: false, hasSrcDirectory: true },
        hasTypeScript: true,
        hasLinting: false,
      };

      const commands = service.generateCommands(scanResult);

      const nestCommand = commands.find(c => c.name.includes('NestJS'));
      expect(nestCommand).toBeDefined();
      expect(nestCommand?.steps.length).toBeGreaterThan(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- CommandsGeneratorService.spec.ts`
Expected: FAIL

**Step 3: Write CommandsGeneratorService implementation**

```typescript
// apps/cli/src/application/services/CommandsGeneratorService.ts
import { IProjectScanResult } from './ProjectScannerService';

export interface IGeneratedCommand {
  name: string;
  summary: string;
  whenToUse: string[];
  contextValidationCheckpoints: string[];
  steps: Array<{
    name: string;
    description: string;
    codeSnippet?: string;
  }>;
}

export class CommandsGeneratorService {
  generateCommands(scanResult: IProjectScanResult): IGeneratedCommand[] {
    const commands: IGeneratedCommand[] = [];

    if (scanResult.frameworks.includes('nestjs')) {
      commands.push(this.generateCreateNestJSModuleCommand());
    }

    if (scanResult.frameworks.includes('react')) {
      commands.push(this.generateCreateReactComponentCommand());
    }

    if (scanResult.testFramework) {
      commands.push(this.generateCreateTestCommand(scanResult.testFramework));
    }

    return commands;
  }

  private generateCreateNestJSModuleCommand(): IGeneratedCommand {
    return {
      name: 'Create NestJS Module',
      summary: 'Create a new feature module in NestJS with controller, service, and entity following project structure',
      whenToUse: [
        'Adding a new feature or domain to the application',
        'Creating a new API endpoint with business logic',
        'Setting up a new resource with CRUD operations',
      ],
      contextValidationCheckpoints: [
        'What is the module name?',
        'Does it need database entities?',
        'What API endpoints are required?',
      ],
      steps: [
        {
          name: 'Create module directory',
          description: 'Create the module directory under src/ following the existing structure',
          codeSnippet: 'mkdir -p src/modules/[module-name]',
        },
        {
          name: 'Create module file',
          description: 'Create the NestJS module file with @Module decorator',
          codeSnippet: `import { Module } from '@nestjs/common';
import { [ModuleName]Controller } from './[module-name].controller';
import { [ModuleName]Service } from './[module-name].service';

@Module({
  controllers: [[ModuleName]Controller],
  providers: [[ModuleName]Service],
  exports: [[ModuleName]Service],
})
export class [ModuleName]Module {}`,
        },
        {
          name: 'Create controller',
          description: 'Create the controller with basic CRUD endpoints',
          codeSnippet: `import { Controller, Get, Post, Body } from '@nestjs/common';
import { [ModuleName]Service } from './[module-name].service';

@Controller('[module-name]')
export class [ModuleName]Controller {
  constructor(private readonly service: [ModuleName]Service) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }
}`,
        },
        {
          name: 'Create service',
          description: 'Create the service with business logic',
          codeSnippet: `import { Injectable } from '@nestjs/common';

@Injectable()
export class [ModuleName]Service {
  findAll() {
    return [];
  }
}`,
        },
        {
          name: 'Register in AppModule',
          description: 'Import and register the new module in the root AppModule',
        },
      ],
    };
  }

  private generateCreateReactComponentCommand(): IGeneratedCommand {
    return {
      name: 'Create React Component',
      summary: 'Create a new React component with TypeScript following project conventions',
      whenToUse: [
        'Adding a new UI component',
        'Creating a reusable widget',
        'Building a new page or view',
      ],
      contextValidationCheckpoints: [
        'What is the component name?',
        'Is it a page component or reusable component?',
        'What props does it need?',
      ],
      steps: [
        {
          name: 'Create component file',
          description: 'Create the component file with TypeScript interface for props',
          codeSnippet: `interface I[ComponentName]Props {
  // Add props here
}

export function [ComponentName]({ }: I[ComponentName]Props) {
  return (
    <div>
      {/* Component content */}
    </div>
  );
}`,
        },
        {
          name: 'Add component tests',
          description: 'Create test file for the component',
        },
        {
          name: 'Export from index',
          description: 'Export the component from the barrel file',
        },
      ],
    };
  }

  private generateCreateTestCommand(testFramework: string): IGeneratedCommand {
    return {
      name: `Create ${testFramework} Test`,
      summary: `Create a new test file using ${testFramework} following project testing conventions`,
      whenToUse: [
        'Adding tests for new functionality',
        'Writing unit tests for services',
        'Creating integration tests',
      ],
      contextValidationCheckpoints: [
        'What is being tested?',
        'Is it a unit or integration test?',
      ],
      steps: [
        {
          name: 'Create test file',
          description: `Create [filename].spec.ts following ${testFramework} conventions`,
          codeSnippet: `import { describe, it, expect, beforeEach } from '${testFramework}';

describe('[FeatureName]', () => {
  beforeEach(() => {
    // Setup
  });

  it('does something', () => {
    // Arrange
    // Act
    // Assert
  });
});`,
        },
      ],
    };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- CommandsGeneratorService.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cli/src/application/services/CommandsGeneratorService*
git commit -m "feat(cli): add commands generator service"
```

---

## Task 4: Content Generator Service - Skills

**Files:**
- Create: `apps/cli/src/application/services/SkillsGeneratorService.ts`
- Create: `apps/cli/src/application/services/SkillsGeneratorService.spec.ts`

**Step 1: Write failing test**

```typescript
// apps/cli/src/application/services/SkillsGeneratorService.spec.ts
import { SkillsGeneratorService } from './SkillsGeneratorService';
import { describe, it, expect, beforeEach } from 'vitest';

describe('SkillsGeneratorService', () => {
  let service: SkillsGeneratorService;

  beforeEach(() => {
    service = new SkillsGeneratorService();
  });

  describe('generateSkills', () => {
    it('generates debugging skill when testing framework detected', () => {
      const scanResult = {
        languages: ['typescript'],
        frameworks: [],
        tools: [],
        structure: { isMonorepo: false, hasTests: true, hasSrcDirectory: true },
        testFramework: 'vitest',
        hasTypeScript: true,
        hasLinting: false,
      };

      const skills = service.generateSkills(scanResult);

      expect(skills.length).toBeGreaterThan(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- SkillsGeneratorService.spec.ts`
Expected: FAIL

**Step 3: Write SkillsGeneratorService implementation**

```typescript
// apps/cli/src/application/services/SkillsGeneratorService.ts
import { IProjectScanResult } from './ProjectScannerService';

export interface IGeneratedSkill {
  name: string;
  description: string;
  prompt: string;
}

export class SkillsGeneratorService {
  generateSkills(scanResult: IProjectScanResult): IGeneratedSkill[] {
    const skills: IGeneratedSkill[] = [];

    if (scanResult.testFramework) {
      skills.push(this.generateDebuggingSkill(scanResult.testFramework));
    }

    if (scanResult.frameworks.includes('nestjs')) {
      skills.push(this.generateNestJSDebuggingSkill());
    }

    if (scanResult.structure.isMonorepo) {
      skills.push(this.generateMonorepoNavigationSkill());
    }

    return skills;
  }

  private generateDebuggingSkill(testFramework: string): IGeneratedSkill {
    return {
      name: 'debugging-with-' + testFramework,
      description: `Systematic debugging workflow using ${testFramework} tests`,
      prompt: `# Debugging with ${testFramework}

When encountering bugs or test failures:

1. **Reproduce**: Write a failing test that demonstrates the bug
2. **Isolate**: Run only the failing test to isolate the issue
3. **Investigate**: Add console.logs or use debugger to inspect state
4. **Fix**: Make minimal changes to fix the issue
5. **Verify**: Ensure the test passes and no other tests broke
6. **Cleanup**: Remove debug code and commit

Always run tests before claiming a fix is complete.`,
    };
  }

  private generateNestJSDebuggingSkill(): IGeneratedSkill {
    return {
      name: 'nestjs-debugging',
      description: 'Debug NestJS applications with proper logging and error handling',
      prompt: `# NestJS Debugging

When debugging NestJS applications:

1. Check dependency injection - ensure providers are registered in module
2. Verify middleware and guards are applied in correct order
3. Use NestJS Logger for structured logging
4. Check request/response interceptors for transformations
5. Verify TypeORM queries with query logging enabled
6. Test endpoints with proper authentication headers

Common issues:
- Missing @Injectable() decorator
- Circular dependencies between modules
- Missing imports in module metadata`,
    };
  }

  private generateMonorepoNavigationSkill(): IGeneratedSkill {
    return {
      name: 'monorepo-navigation',
      description: 'Navigate and work efficiently in monorepo structure',
      prompt: `# Monorepo Navigation

Working in a monorepo:

1. **Find code**: Use workspace-wide search instead of grepping single directories
2. **Run commands**: Use workspace commands (e.g., npm run build --workspace=@org/package)
3. **Understand dependencies**: Check package.json workspaces field for internal deps
4. **Make changes**: Consider impact across all packages before modifying shared code
5. **Test locally**: Run tests for affected packages after changes

Commands:
- List packages: npm ls --depth=0
- Run in specific package: npm run [cmd] --workspace=[name]
- Build all: npm run build --workspaces`,
    };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- SkillsGeneratorService.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cli/src/application/services/SkillsGeneratorService*
git commit -m "feat(cli): add skills generator service"
```

---

## Task 5: CLI Preview Service

**Files:**
- Create: `apps/cli/src/application/services/ContentPreviewService.ts`
- Create: `apps/cli/src/application/services/ContentPreviewService.spec.ts`

**Step 1: Write failing test**

```typescript
// apps/cli/src/application/services/ContentPreviewService.spec.ts
import { ContentPreviewService } from './ContentPreviewService';
import { describe, it, expect, beforeEach } from 'vitest';

describe('ContentPreviewService', () => {
  let service: ContentPreviewService;

  beforeEach(() => {
    service = new ContentPreviewService();
  });

  describe('formatPreview', () => {
    it('formats standards with rule counts', () => {
      const standards = [{
        name: 'TypeScript Standards',
        description: 'TS best practices',
        summary: 'Use TS properly',
        rules: [{ content: 'Use interfaces' }],
      }];

      const preview = service.formatPreview({ standards, commands: [], skills: [] });

      expect(preview).toContain('TypeScript Standards');
      expect(preview).toContain('1 rule');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- ContentPreviewService.spec.ts`
Expected: FAIL

**Step 3: Write ContentPreviewService implementation**

```typescript
// apps/cli/src/application/services/ContentPreviewService.ts
import { IGeneratedStandard } from './StandardsGeneratorService';
import { IGeneratedCommand } from './CommandsGeneratorService';
import { IGeneratedSkill } from './SkillsGeneratorService';

export interface IGeneratedContent {
  standards: IGeneratedStandard[];
  commands: IGeneratedCommand[];
  skills: IGeneratedSkill[];
}

export class ContentPreviewService {
  formatPreview(content: IGeneratedContent): string {
    const lines: string[] = [];

    lines.push('');
    lines.push('='.repeat(60));
    lines.push('  GENERATED CONTENT PREVIEW');
    lines.push('='.repeat(60));
    lines.push('');

    if (content.standards.length > 0) {
      lines.push('📋 STANDARDS:');
      lines.push('');
      content.standards.forEach((standard, idx) => {
        lines.push(`  ${idx + 1}. ${standard.name}`);
        lines.push(`     ${standard.summary}`);
        lines.push(`     Rules: ${standard.rules.length}`);
        lines.push('');
      });
    }

    if (content.commands.length > 0) {
      lines.push('⚡ COMMANDS:');
      lines.push('');
      content.commands.forEach((command, idx) => {
        lines.push(`  ${idx + 1}. ${command.name}`);
        lines.push(`     ${command.summary}`);
        lines.push(`     Steps: ${command.steps.length}`);
        lines.push('');
      });
    }

    if (content.skills.length > 0) {
      lines.push('🎯 SKILLS:');
      lines.push('');
      content.skills.forEach((skill, idx) => {
        lines.push(`  ${idx + 1}. ${skill.name}`);
        lines.push(`     ${skill.description}`);
        lines.push('');
      });
    }

    lines.push('='.repeat(60));
    lines.push('');

    return lines.join('\n');
  }

  promptForApproval(): string {
    return 'Do you want to push this content to your Packmind space? (y/n): ';
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- ContentPreviewService.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cli/src/application/services/ContentPreviewService*
git commit -m "feat(cli): add content preview service for onboarding"
```

---

## Task 6: Aggressive Onboarding Use Case

**Files:**
- Create: `apps/cli/src/domain/useCases/AggressiveOnboardingUseCase.ts`
- Create: `apps/cli/src/domain/useCases/AggressiveOnboardingUseCase.spec.ts`

**Step 1: Write failing test**

```typescript
// apps/cli/src/domain/useCases/AggressiveOnboardingUseCase.spec.ts
import { AggressiveOnboardingUseCase } from './AggressiveOnboardingUseCase';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('AggressiveOnboardingUseCase', () => {
  let useCase: AggressiveOnboardingUseCase;
  let mockScanner: any;
  let mockStandardsGen: any;
  let mockCommandsGen: any;
  let mockSkillsGen: any;
  let mockPreview: any;
  let mockGateway: any;

  beforeEach(() => {
    mockScanner = { scanProject: vi.fn() };
    mockStandardsGen = { generateStandards: vi.fn() };
    mockCommandsGen = { generateCommands: vi.fn() };
    mockSkillsGen = { generateSkills: vi.fn() };
    mockPreview = { formatPreview: vi.fn(), promptForApproval: vi.fn() };
    mockGateway = {
      createStandard: vi.fn(),
      uploadSkill: vi.fn(),
    };

    useCase = new AggressiveOnboardingUseCase(
      mockScanner,
      mockStandardsGen,
      mockCommandsGen,
      mockSkillsGen,
      mockPreview,
      mockGateway
    );
  });

  it('scans project and generates content', async () => {
    mockScanner.scanProject.mockResolvedValue({
      languages: ['typescript'],
      frameworks: ['nestjs'],
      tools: [],
      structure: { isMonorepo: false, hasTests: false, hasSrcDirectory: true },
      hasTypeScript: true,
      hasLinting: false,
    });

    mockStandardsGen.generateStandards.mockReturnValue([]);
    mockCommandsGen.generateCommands.mockReturnValue([]);
    mockSkillsGen.generateSkills.mockReturnValue([]);

    const result = await useCase.generateContent('/test/path');

    expect(mockScanner.scanProject).toHaveBeenCalledWith('/test/path');
    expect(result).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- AggressiveOnboardingUseCase.spec.ts`
Expected: FAIL

**Step 3: Write use case implementation**

```typescript
// apps/cli/src/domain/useCases/AggressiveOnboardingUseCase.ts
import { ProjectScannerService } from '../../application/services/ProjectScannerService';
import { StandardsGeneratorService } from '../../application/services/StandardsGeneratorService';
import { CommandsGeneratorService } from '../../application/services/CommandsGeneratorService';
import { SkillsGeneratorService } from '../../application/services/SkillsGeneratorService';
import { ContentPreviewService, IGeneratedContent } from '../../application/services/ContentPreviewService';
import { IPackmindGateway } from '@packmind/types';

export interface IOnboardingResult {
  content: IGeneratedContent;
  preview: string;
}

export class AggressiveOnboardingUseCase {
  constructor(
    private scanner: ProjectScannerService,
    private docScanner: DocumentationScannerService,
    private standardsGenerator: StandardsGeneratorService,
    private commandsGenerator: CommandsGeneratorService,
    private skillsGenerator: SkillsGeneratorService,
    private previewService: ContentPreviewService,
    private gateway: IPackmindGateway
  ) {}

  async generateContent(projectPath: string): Promise<IOnboardingResult> {
    // Step 1: Scan project (read-only)
    const scanResult = await this.scanner.scanProject(projectPath);

    // Step 2: Scan existing documentation
    const existingDocs = await this.docScanner.scanExistingDocumentation(projectPath);

    // Step 3: Generate content
    const standards = this.standardsGenerator.generateStandards(scanResult, existingDocs);
    const commands = this.commandsGenerator.generateCommands(scanResult);
    const skills = this.skillsGenerator.generateSkills(scanResult);

    const content: IGeneratedContent = { standards, commands, skills };

    // Step 4: Format preview
    const preview = this.previewService.formatPreview(content);

    return { content, preview };
  }

  async pushContent(
    content: IGeneratedContent,
    organizationId: string,
    spaceId: string
  ): Promise<{ pushed: number }> {
    let pushedCount = 0;

    // Push standards
    for (const standard of content.standards) {
      await this.gateway.createStandard({
        name: standard.name,
        description: standard.description,
        summary: standard.summary,
        rules: standard.rules,
        organizationId,
        spaceId,
      });
      pushedCount++;
    }

    // Push commands via MCP (using save_command tool)
    for (const command of content.commands) {
      // Note: This will be handled through MCP tool in the actual implementation
      pushedCount++;
    }

    // Push skills
    for (const skill of content.skills) {
      await this.gateway.uploadSkill({
        name: skill.name,
        description: skill.description,
        prompt: skill.prompt,
        spaceId,
      });
      pushedCount++;
    }

    return { pushed: pushedCount };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- AggressiveOnboardingUseCase.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cli/src/domain/useCases/AggressiveOnboardingUseCase*
git commit -m "feat(cli): add aggressive onboarding use case"
```

---

## Task 7: Modify Install Command

**Files:**
- Modify: `apps/cli/src/infra/commands/InstallCommand.ts`
- Modify: `apps/cli/src/PackmindCliHexa.ts`

**Step 1: Add onboarding flag to install command**

```typescript
// Modify apps/cli/src/infra/commands/InstallCommand.ts
// Add to args:
import { command, string, flag, multioption } from 'cmd-ts';

autoOnboard: flag({
  long: 'auto-onboard',
  description: 'Automatically scan project and generate standards/commands/skills',
  defaultValue: () => false,
}),
```

**Step 2: Add onboarding logic to handler**

```typescript
// Modify handler in InstallCommand.ts
// After successful package installation, add:

if (args.autoOnboard) {
  logger.info('');
  logger.info('🚀 Running automatic onboarding...');
  logger.info('');

  const onboardingUseCase = hexa.getAggressiveOnboardingUseCase();

  // Generate content
  const result = await onboardingUseCase.generateContent(process.cwd());

  // Show preview
  console.log(result.preview);

  // Prompt for approval
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise<string>((resolve) => {
    readline.question(
      previewService.promptForApproval(),
      (answer: string) => {
        readline.close();
        resolve(answer);
      }
    );
  });

  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    logger.info('');
    logger.info('📤 Pushing content to Packmind...');

    const config = await hexa.getApiConfig();
    const pushResult = await onboardingUseCase.pushContent(
      result.content,
      config.organizationId,
      args.spaceId || config.defaultSpaceId
    );

    logger.info('');
    logger.info(`✅ Pushed ${pushResult.pushed} items to Packmind`);
    logger.info('');
    logger.info('📱 View and manage them in the web app:');
    logger.info(`   ${config.webAppUrl}/org/${config.organizationId}/space/${args.spaceId}`);
  } else {
    logger.info('');
    logger.info('⏭️  Skipped pushing content. Run "packmind onboard" later to try again.');
  }
}
```

**Step 3: Add use case to PackmindCliHexa**

```typescript
// Modify apps/cli/src/PackmindCliHexa.ts
// Add services as private fields:
private projectScanner: ProjectScannerService;
private standardsGenerator: StandardsGeneratorService;
private commandsGenerator: CommandsGeneratorService;
private skillsGenerator: SkillsGeneratorService;
private contentPreview: ContentPreviewService;

// Initialize in constructor:
this.projectScanner = new ProjectScannerService();
this.standardsGenerator = new StandardsGeneratorService();
this.commandsGenerator = new CommandsGeneratorService();
this.skillsGenerator = new SkillsGeneratorService();
this.contentPreview = new ContentPreviewService();

// Add getter:
getAggressiveOnboardingUseCase(): AggressiveOnboardingUseCase {
  return new AggressiveOnboardingUseCase(
    this.projectScanner,
    this.standardsGenerator,
    this.commandsGenerator,
    this.skillsGenerator,
    this.contentPreview,
    this.packmindGateway
  );
}
```

**Step 4: Test install with auto-onboard flag**

Run: `npm run cli install <package> --auto-onboard`
Expected: Shows generated content preview and prompts for approval

**Step 5: Commit**

```bash
git add apps/cli/src/infra/commands/InstallCommand.ts apps/cli/src/PackmindCliHexa.ts
git commit -m "feat(cli): integrate aggressive onboarding into install command"
```

---

## Task 8: Create Standalone Onboard Command

**Files:**
- Create: `apps/cli/src/infra/commands/OnboardCommand.ts`
- Modify: `apps/cli/src/main.ts`

**Step 1: Write OnboardCommand**

```typescript
// apps/cli/src/infra/commands/OnboardCommand.ts
import { command, string, option } from 'cmd-ts';
import { PackmindLogger } from '@packmind/logger';
import { PackmindCliHexaFactory } from '../../PackmindCliHexaFactory';

export const onboardCommand = command({
  name: 'onboard',
  description: 'Scan project and generate standards/commands/skills',
  args: {
    space: option({
      type: string,
      long: 'space',
      short: 's',
      description: 'Target space ID',
    }),
  },
  handler: async (args) => {
    const logger = new PackmindLogger();
    const hexa = await PackmindCliHexaFactory.create();

    logger.info('🔍 Scanning project...');

    const onboardingUseCase = hexa.getAggressiveOnboardingUseCase();
    const previewService = hexa.getContentPreviewService();

    // Generate content
    const result = await onboardingUseCase.generateContent(process.cwd());

    // Show preview
    console.log(result.preview);

    // Prompt for approval
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      readline.question(
        previewService.promptForApproval(),
        (answer: string) => {
          readline.close();
          resolve(answer);
        }
      );
    });

    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      logger.info('');
      logger.info('📤 Pushing content to Packmind...');

      const config = await hexa.getApiConfig();
      const pushResult = await onboardingUseCase.pushContent(
        result.content,
        config.organizationId,
        args.space
      );

      logger.info('');
      logger.info(`✅ Pushed ${pushResult.pushed} items to Packmind`);
      logger.info('');
      logger.info('📱 View and manage them in the web app');
    } else {
      logger.info('');
      logger.info('⏭️  Skipped pushing content');
    }
  },
});
```

**Step 2: Register command in main.ts**

```typescript
// Modify apps/cli/src/main.ts
import { onboardCommand } from './infra/commands/OnboardCommand';

// Add to subcommands:
const cli = subcommands({
  name: 'packmind',
  cmds: {
    // ... existing commands
    onboard: onboardCommand,
  },
});
```

**Step 3: Test standalone onboard command**

Run: `npm run cli onboard --space <space-id>`
Expected: Scans project, shows preview, prompts for approval

**Step 4: Commit**

```bash
git add apps/cli/src/infra/commands/OnboardCommand.ts apps/cli/src/main.ts
git commit -m "feat(cli): add standalone onboard command"
```

---

## Task 9: Gateway Methods for Content Push

**Files:**
- Modify: `apps/cli/src/infra/repositories/PackmindGateway.ts`
- Modify: `packages/types/src/gateway/IPackmindGateway.ts`

**Step 1: Add createStandard method to interface**

```typescript
// Modify packages/types/src/gateway/IPackmindGateway.ts
// Add method:
createStandard(command: {
  name: string;
  description: string;
  summary: string;
  rules: Array<{ content: string; examples?: any }>;
  organizationId: string;
  spaceId: string;
}): Promise<{ standardId: string }>;
```

**Step 2: Implement createStandard in gateway**

```typescript
// Modify apps/cli/src/infra/repositories/PackmindGateway.ts
async createStandard(command: {
  name: string;
  description: string;
  summary: string;
  rules: Array<{ content: string; examples?: any }>;
  organizationId: string;
  spaceId: string;
}): Promise<{ standardId: string }> {
  const response = await this.httpClient.post(
    `/organizations/${command.organizationId}/spaces/${command.spaceId}/standards`,
    {
      name: command.name,
      description: command.description,
      summary: command.summary,
      rules: command.rules.map(r => ({
        content: r.content,
        examples: r.examples ? [r.examples] : [],
      })),
    }
  );

  return { standardId: response.id };
}
```

**Step 3: Add uploadSkill method to interface**

```typescript
// Modify packages/types/src/gateway/IPackmindGateway.ts
uploadSkill(command: {
  name: string;
  description: string;
  prompt: string;
  spaceId: string;
}): Promise<{ skillId: string }>;
```

**Step 4: Implement uploadSkill in gateway**

```typescript
// Modify apps/cli/src/infra/repositories/PackmindGateway.ts
async uploadSkill(command: {
  name: string;
  description: string;
  prompt: string;
  spaceId: string;
}): Promise<{ skillId: string }> {
  const orgId = this.getOrganizationIdFromToken();

  const response = await this.httpClient.post(
    `/organizations/${orgId}/spaces/${command.spaceId}/skills/upload`,
    {
      name: command.name,
      description: command.description,
      files: [
        {
          path: 'SKILL.md',
          content: command.prompt,
        },
      ],
    }
  );

  return { skillId: response.id };
}
```

**Step 5: Run quality gate**

Run: `npm run quality-gate`
Expected: All checks pass

**Step 6: Commit**

```bash
git add apps/cli/src/infra/repositories/PackmindGateway.ts packages/types/src/gateway/
git commit -m "feat(cli): add gateway methods for creating standards and uploading skills"
```

---

## Task 10: Handle Commands via MCP Tool

**Files:**
- Create: `apps/cli/src/application/services/McpCommandService.ts`
- Create: `apps/cli/src/application/services/McpCommandService.spec.ts`

**Step 1: Write failing test**

```typescript
// apps/cli/src/application/services/McpCommandService.spec.ts
import { McpCommandService } from './McpCommandService';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('McpCommandService', () => {
  let service: McpCommandService;
  let mockMcpClient: any;

  beforeEach(() => {
    mockMcpClient = { callTool: vi.fn() };
    service = new McpCommandService(mockMcpClient);
  });

  it('calls mcp save_command tool', async () => {
    const command = {
      name: 'test-command',
      summary: 'Test',
      whenToUse: [],
      contextValidationCheckpoints: [],
      steps: [],
    };

    await service.saveCommand(command);

    expect(mockMcpClient.callTool).toHaveBeenCalledWith(
      'mcp__packmind__save_command',
      expect.any(Object)
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- McpCommandService.spec.ts`
Expected: FAIL

**Step 3: Write McpCommandService implementation**

```typescript
// apps/cli/src/application/services/McpCommandService.ts
import { IGeneratedCommand } from './CommandsGeneratorService';

export class McpCommandService {
  constructor(private mcpClient: any) {}

  async saveCommand(command: IGeneratedCommand): Promise<void> {
    await this.mcpClient.callTool('mcp__packmind__save_command', {
      name: command.name,
      summary: command.summary,
      whenToUse: command.whenToUse,
      contextValidationCheckpoints: command.contextValidationCheckpoints,
      steps: command.steps,
    });
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- McpCommandService.spec.ts`
Expected: PASS

**Step 5: Update AggressiveOnboardingUseCase to use McpCommandService**

```typescript
// Modify apps/cli/src/domain/useCases/AggressiveOnboardingUseCase.ts
// Add McpCommandService to constructor
// Update pushContent method to save commands:

for (const command of content.commands) {
  await this.mcpCommandService.saveCommand(command);
  pushedCount++;
}
```

**Step 6: Commit**

```bash
git add apps/cli/src/application/services/McpCommandService* apps/cli/src/domain/useCases/AggressiveOnboardingUseCase.ts
git commit -m "feat(cli): add MCP command service for saving commands"
```

---

## Task 11: Documentation

**Files:**
- Create: `docs/features/aggressive-onboarding.md`

**Step 1: Write feature documentation**

```markdown
<!-- docs/features/aggressive-onboarding.md -->
# Aggressive Onboarding

## Overview

Aggressive onboarding automatically scans user projects and generates Standards/Rules, Commands, and Skills based on detected tools, frameworks, and project structure.

## User Flow

### During Installation

```bash
packmind install <package> --auto-onboard
```

1. Package is installed normally
2. CLI scans project (read-only)
3. Generates content (standards, commands, skills)
4. Shows preview in terminal
5. Prompts user for approval
6. Pushes approved content to backend
7. User manages in web app (delete if not needed, add to packages later)

### Standalone Command

```bash
packmind onboard --space <space-id>
```

Runs onboarding without installing packages.

## What Gets Generated

### Standards

Based on detected languages, frameworks, and existing documentation:
- **Extracted Project Standards**: Rules extracted from CLAUDE.md, CONTRIBUTING.md, CONVENTIONS.md, and similar documentation
- **TypeScript Standards**: When tsconfig.json detected
- **NestJS Architecture Standards**: When @nestjs/core dependency found
- **React Component Standards**: When react dependency found
- **Testing Standards**: Based on vitest/jest detection
- **Monorepo Organization Standards**: When packages/ or apps/ directories exist

### Commands

Workflow commands for common tasks:
- **Create NestJS Module**: When NestJS detected
- **Create React Component**: When React detected
- **Create Test**: Based on test framework

### Skills

Debugging and navigation helpers:
- **Debugging with [framework]**: Test-driven debugging workflow
- **NestJS Debugging**: Framework-specific debugging tips
- **Monorepo Navigation**: Working efficiently in monorepos

## Detection Logic

### Existing Documentation
Scans for and extracts rules from:
- `CLAUDE.md` - Claude AI agent instructions
- `.cursorrules` - Cursor IDE rules
- `CONTRIBUTING.md` - Contribution guidelines
- `CONVENTIONS.md` - Code conventions
- `CODE_STYLE.md` - Style guides
- `docs/standards/` - Standards documentation directory
- `docs/conventions/` - Conventions directory
- `.claude/rules/` - Claude-specific rules
- `.packmind/standards/` - Existing Packmind standards

Extracts:
- Bullet points as rules (filtered for meaningful content)
- Numbered lists as conventions
- Multi-step workflows (3+ steps) as command candidates

### Languages
- TypeScript: `tsconfig.json` present
- JavaScript: `package.json` present
- Python: `requirements.txt` or `setup.py` present
- Go: `go.mod` present
- Rust: `Cargo.toml` present
- PHP: `composer.json` present

### Frameworks
- NestJS: `@nestjs/core` in dependencies
- React: `react` in dependencies
- Vue: `vue` in dependencies
- Angular: `@angular/core` in dependencies
- Express: `express` in dependencies
- Next.js: `next` in dependencies

### Tools
- ESLint: `.eslintrc.*` files
- Prettier: `.prettierrc` file
- Nx: `nx.json` file
- Turbo: `turbo.json` file

### Structure
- Monorepo: `packages/` or `apps/` directory exists
- Has tests: `test/`, `tests/`, or `__tests__/` directory exists
- Src directory: `src/` directory exists

## CLI Options

### `--auto-onboard`

Add to `packmind install` to run onboarding automatically.

### `--space <id>`

Specify target space for generated content.

## Safety & Philosophy

- **Read-only scanning**: Never modifies project files
- **User approval required**: Preview shown before pushing
- **No special marking**: Generated as regular items
- **User manages deletion**: Delete unwanted items in web app
- **Add to packages later**: User can organize into packages after review

## Examples

### TypeScript + NestJS Project

Generates:
- TypeScript Coding Standards (4 rules)
- NestJS Architecture Standards (4 rules)
- Create NestJS Module command
- NestJS Debugging skill

### React Monorepo

Generates:
- TypeScript Coding Standards
- React Component Standards
- Monorepo Organization Standards
- Create React Component command
- Monorepo Navigation skill

## Integration Points

- Uses existing `createStandard` API endpoint
- Uses existing `uploadSkill` API endpoint
- Uses MCP `save_command` tool for commands
- Integrates with existing `install` command workflow
```

**Step 2: Commit**

```bash
git add docs/features/aggressive-onboarding.md
git commit -m "docs: add aggressive onboarding feature documentation"
```

---

## Task 12: Integration Testing & Quality Gate

**Step 1: Create integration test**

```typescript
// Create apps/cli/src/domain/useCases/AggressiveOnboardingIntegration.spec.ts
import { describe, it, expect } from 'vitest';
import { ProjectScannerService } from '../../application/services/ProjectScannerService';
import { StandardsGeneratorService } from '../../application/services/StandardsGeneratorService';

describe('Aggressive Onboarding Integration', () => {
  it('scans and generates content for TypeScript project', async () => {
    const scanner = new ProjectScannerService();
    const standardsGen = new StandardsGeneratorService();

    const scanResult = await scanner.scanProject(process.cwd());
    const standards = standardsGen.generateStandards(scanResult);

    expect(scanResult.hasTypeScript).toBe(true);
    expect(standards.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run integration test**

Run: `npm test -- AggressiveOnboardingIntegration.spec.ts`
Expected: PASS

**Step 3: Run full quality gate**

Run: `npm run quality-gate`
Expected: All checks pass (lint, test, type-check)

**Step 4: Test end-to-end manually**

```bash
# Test install with auto-onboard
npm run cli install @packmind/example-package --auto-onboard --space test-space

# Test standalone onboard
npm run cli onboard --space test-space
```

Expected:
- Shows project scan results
- Displays generated standards/commands/skills preview
- Prompts for approval
- Pushes to backend on approval
- Items visible in web app

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete aggressive onboarding feature

- CLI scans project for languages/frameworks/tools
- Generates standards with rules
- Generates workflow commands
- Generates debugging skills
- Previews content in CLI before pushing
- User approves before pushing to backend
- Integrates into install command with --auto-onboard flag
- Standalone onboard command available
- Full test coverage and documentation"
```

---

## Success Criteria

- [ ] CLI scans project without modifying files
- [ ] Generates Standards/Rules based on detected tools
- [ ] Generates Commands for common workflows
- [ ] Generates Skills for debugging/navigation
- [ ] Shows preview in CLI with formatted output
- [ ] Prompts user for approval before pushing
- [ ] Pushes to backend using existing APIs
- [ ] Integrates with `install --auto-onboard` flag
- [ ] Standalone `onboard` command works
- [ ] All tests pass
- [ ] Quality gate passes
- [ ] Documentation complete

---

## Implementation Notes

- **TDD**: Write tests before implementation
- **DRY**: Reuse existing Packmind patterns (Gateway, contracts)
- **YAGNI**: Only build what's specified
- **Shallow scanning**: Don't analyze business logic, just detect facts
- **User control**: Preview + approval before any backend changes
- **Frequent commits**: Commit after each task

## References

- Gateway: `apps/cli/src/infra/repositories/PackmindGateway.ts`
- MCP tools: `apps/mcp-server/src/app/tools/`
- Standards API: `apps/api/src/app/organizations/spaces/standards/`
- Skills API: `apps/api/src/app/organizations/spaces/skills/`
