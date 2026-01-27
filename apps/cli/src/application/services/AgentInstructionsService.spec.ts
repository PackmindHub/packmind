import { AgentInstructionsService } from './AgentInstructionsService';
import { IContentWriteResult } from './ContentWriterService';
import { IProjectScanResult } from './ProjectScannerService';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('AgentInstructionsService', () => {
  let service: AgentInstructionsService;
  let testDir: string;

  beforeEach(() => {
    service = new AgentInstructionsService();
  });

  const createWriteResult = (
    overrides: Partial<IContentWriteResult> = {},
  ): IContentWriteResult => ({
    filesCreated: 0,
    filesUpdated: 0,
    errors: [],
    paths: {
      standards: [],
      commands: [],
      skills: [],
    },
    ...overrides,
  });

  const createScanResult = (
    overrides: Partial<IProjectScanResult> = {},
  ): IProjectScanResult => ({
    languages: [],
    frameworks: [],
    tools: [],
    structure: { isMonorepo: false, hasTests: false, hasSrcDirectory: false },
    hasTypeScript: false,
    hasLinting: false,
    ...overrides,
  });

  describe('generateEnhancementInstructions', () => {
    it('includes header and task description', () => {
      const writeResult = createWriteResult();
      const scanResult = createScanResult();

      const instructions = service.generateEnhancementInstructions(
        writeResult,
        scanResult,
        '/test/project',
      );

      expect(instructions).toContain('# Agent Enhancement Instructions');
      expect(instructions).toContain('## Your Task');
      expect(instructions).toContain('Analyze the codebase');
    });

    it('includes standards enhancement instructions', () => {
      const writeResult = createWriteResult({
        paths: {
          standards: [
            '.packmind/standards/typescript-standards.md',
            '.packmind/standards/testing-standards.md',
          ],
          commands: [],
          skills: [],
        },
      });
      const scanResult = createScanResult();

      const instructions = service.generateEnhancementInstructions(
        writeResult,
        scanResult,
        '/test/project',
      );

      expect(instructions).toContain('## Standards to Enhance');
      expect(instructions).toContain(
        '`.packmind/standards/typescript-standards.md`',
      );
      expect(instructions).toContain(
        '`.packmind/standards/testing-standards.md`',
      );
      expect(instructions).toContain('Extract 3-5 specific rules');
      expect(instructions).toContain('positive/negative examples');
    });

    it('includes commands enhancement instructions', () => {
      const writeResult = createWriteResult({
        paths: {
          standards: [],
          commands: ['.packmind/commands/create-module.md'],
          skills: [],
        },
      });
      const scanResult = createScanResult();

      const instructions = service.generateEnhancementInstructions(
        writeResult,
        scanResult,
        '/test/project',
      );

      expect(instructions).toContain('## Commands to Enhance');
      expect(instructions).toContain('`.packmind/commands/create-module.md`');
      expect(instructions).toContain('Find 2-3 existing implementations');
      expect(instructions).toContain('real code snippets');
    });

    it('includes skills enhancement instructions', () => {
      const writeResult = createWriteResult({
        paths: {
          standards: [],
          commands: [],
          skills: ['.claude/skills/debugging-jest/SKILL.md'],
        },
      });
      const scanResult = createScanResult();

      const instructions = service.generateEnhancementInstructions(
        writeResult,
        scanResult,
        '/test/project',
      );

      expect(instructions).toContain('## Skills to Enhance');
      expect(instructions).toContain(
        '`.claude/skills/debugging-jest/SKILL.md`',
      );
      expect(instructions).toContain('project-specific');
      expect(instructions).toContain('real commands and workflows');
    });

    it('includes project context from scan result', () => {
      const writeResult = createWriteResult();
      const scanResult = createScanResult({
        languages: ['TypeScript', 'JavaScript'],
        frameworks: ['NestJS', 'React'],
        tools: ['ESLint', 'Prettier'],
        testFramework: 'jest',
        packageManager: 'npm',
        structure: { isMonorepo: true, hasTests: true, hasSrcDirectory: true },
      });

      const instructions = service.generateEnhancementInstructions(
        writeResult,
        scanResult,
        '/my/project/path',
      );

      expect(instructions).toContain('## Project Context');
      expect(instructions).toContain('`/my/project/path`');
      expect(instructions).toContain('TypeScript, JavaScript');
      expect(instructions).toContain('NestJS, React');
      expect(instructions).toContain('ESLint, Prettier');
      expect(instructions).toContain('jest');
      expect(instructions).toContain('npm');
      expect(instructions).toContain('Monorepo');
    });

    it('includes guidelines section', () => {
      const writeResult = createWriteResult();
      const scanResult = createScanResult();

      const instructions = service.generateEnhancementInstructions(
        writeResult,
        scanResult,
        '/test/project',
      );

      expect(instructions).toContain('## Guidelines');
      expect(instructions).toContain('Be specific');
      expect(instructions).toContain('Use examples');
      expect(instructions).toContain('Stay concise');
      expect(instructions).toContain('3+ occurrences');
    });

    it('includes cleanup instructions', () => {
      const writeResult = createWriteResult();
      const scanResult = createScanResult();

      const instructions = service.generateEnhancementInstructions(
        writeResult,
        scanResult,
        '/test/project',
      );

      expect(instructions).toContain('## Final Step: Cleanup');
      expect(instructions).toContain('CLAUDE.md');
      expect(instructions).toContain('.cursorrules');
      expect(instructions).toContain('.windsurfrules');
      expect(instructions).toContain('copilot-instructions.md');
      expect(instructions).toContain('packmind:enhance-start');
      expect(instructions).toContain('packmind:enhance-end');
    });

    it('omits sections when no files of that type exist', () => {
      const writeResult = createWriteResult({
        paths: {
          standards: ['.packmind/standards/test.md'],
          commands: [],
          skills: [],
        },
      });
      const scanResult = createScanResult();

      const instructions = service.generateEnhancementInstructions(
        writeResult,
        scanResult,
        '/test/project',
      );

      expect(instructions).toContain('## Standards to Enhance');
      expect(instructions).not.toContain('## Commands to Enhance');
      expect(instructions).not.toContain('## Skills to Enhance');
    });
  });

  describe('writeToAllAgentConfigs', () => {
    beforeEach(async () => {
      testDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'agent-instructions-test-'),
      );
    });

    afterEach(async () => {
      await fs.rm(testDir, { recursive: true, force: true });
    });

    it('creates all agent config files', async () => {
      const writeResult = createWriteResult({
        paths: {
          standards: ['.packmind/standards/test.md'],
          commands: [],
          skills: [],
        },
      });
      const scanResult = createScanResult({ languages: ['TypeScript'] });

      const result = await service.writeToAllAgentConfigs(
        testDir,
        writeResult,
        scanResult,
      );

      expect(result.filesCreated).toContain('CLAUDE.md');
      expect(result.filesCreated).toContain('.cursorrules');
      expect(result.filesCreated).toContain('.windsurfrules');
      expect(result.filesCreated).toContain('.github/copilot-instructions.md');
      expect(result.errors).toHaveLength(0);
    });

    it('writes instructions wrapped in section markers', async () => {
      const writeResult = createWriteResult({
        paths: {
          standards: ['.packmind/standards/test.md'],
          commands: [],
          skills: [],
        },
      });
      const scanResult = createScanResult();

      await service.writeToAllAgentConfigs(testDir, writeResult, scanResult);

      const content = await fs.readFile(
        path.join(testDir, 'CLAUDE.md'),
        'utf-8',
      );
      expect(content).toContain('<!-- packmind:enhance-start -->');
      expect(content).toContain('<!-- packmind:enhance-end -->');
      expect(content).toContain('# Agent Enhancement Instructions');
    });

    it('appends to existing files without section markers', async () => {
      const existingContent = '# My Project\n\nSome existing content.';
      await fs.writeFile(
        path.join(testDir, 'CLAUDE.md'),
        existingContent,
        'utf-8',
      );

      const writeResult = createWriteResult();
      const scanResult = createScanResult();

      const result = await service.writeToAllAgentConfigs(
        testDir,
        writeResult,
        scanResult,
      );

      expect(result.filesUpdated).toContain('CLAUDE.md');

      const content = await fs.readFile(
        path.join(testDir, 'CLAUDE.md'),
        'utf-8',
      );
      expect(content).toContain('# My Project');
      expect(content).toContain('Some existing content.');
      expect(content).toContain('<!-- packmind:enhance-start -->');
    });

    it('replaces existing section markers', async () => {
      const existingContent = `# My Project

<!-- packmind:enhance-start -->
Old instructions
<!-- packmind:enhance-end -->

Other content`;
      await fs.writeFile(
        path.join(testDir, 'CLAUDE.md'),
        existingContent,
        'utf-8',
      );

      const writeResult = createWriteResult({
        paths: {
          standards: ['.packmind/standards/new-standard.md'],
          commands: [],
          skills: [],
        },
      });
      const scanResult = createScanResult();

      await service.writeToAllAgentConfigs(testDir, writeResult, scanResult);

      const content = await fs.readFile(
        path.join(testDir, 'CLAUDE.md'),
        'utf-8',
      );
      expect(content).toContain('# My Project');
      expect(content).toContain('Other content');
      expect(content).not.toContain('Old instructions');
      expect(content).toContain('new-standard.md');
    });
  });
});
