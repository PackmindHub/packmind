import { ContentWriterService } from './ContentWriterService';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('ContentWriterService', () => {
  let service: ContentWriterService;
  let testDir: string;

  beforeEach(async () => {
    service = new ContentWriterService();
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'content-writer-test-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('writeContent', () => {
    describe('when writing standards', () => {
      it('creates standard file in .packmind/standards/', async () => {
        const content = {
          standards: [
            {
              name: 'TypeScript Standards',
              description: 'Best practices for TypeScript',
              summary: 'Use TS properly',
              rules: [{ content: 'Use interfaces for object shapes' }],
            },
          ],
          commands: [],
          skills: [],
        };

        const result = await service.writeContent(testDir, content);

        expect(result.filesCreated).toBe(1);
        expect(result.paths.standards).toContain(
          '.packmind/standards/typescript-standards.md',
        );

        const fileContent = await fs.readFile(
          path.join(testDir, '.packmind/standards/typescript-standards.md'),
          'utf-8',
        );
        expect(fileContent).toContain('# TypeScript Standards');
        expect(fileContent).toContain('Best practices for TypeScript');
        expect(fileContent).toContain('* Use interfaces for object shapes');
      });

      it('writes multiple rules', async () => {
        const content = {
          standards: [
            {
              name: 'Code Style',
              description: 'Coding conventions',
              summary: 'Follow style guide',
              rules: [
                { content: 'Use 2 spaces for indentation' },
                { content: 'Use single quotes for strings' },
                { content: 'Add trailing commas' },
              ],
            },
          ],
          commands: [],
          skills: [],
        };

        await service.writeContent(testDir, content);

        const fileContent = await fs.readFile(
          path.join(testDir, '.packmind/standards/code-style.md'),
          'utf-8',
        );
        expect(fileContent).toContain('* Use 2 spaces for indentation');
        expect(fileContent).toContain('* Use single quotes for strings');
        expect(fileContent).toContain('* Add trailing commas');
      });
    });

    describe('when writing commands', () => {
      it('creates command file in .packmind/commands/', async () => {
        const content = {
          standards: [],
          commands: [
            {
              name: 'Create Module',
              summary: 'Create a new NestJS module',
              whenToUse: ['Adding new features', 'Organizing code'],
              contextValidationCheckpoints: [
                'What is the module name?',
                'What entities will it contain?',
              ],
              steps: [
                {
                  name: 'Create folder structure',
                  description: 'Create the module folder with subfolders',
                },
                {
                  name: 'Create module file',
                  description: 'Create the module.ts file',
                  codeSnippet:
                    '```typescript\n@Module({})\nexport class MyModule {}\n```',
                },
              ],
            },
          ],
          skills: [],
        };

        const result = await service.writeContent(testDir, content);

        expect(result.filesCreated).toBe(1);
        expect(result.paths.commands).toContain(
          '.packmind/commands/create-module.md',
        );

        const fileContent = await fs.readFile(
          path.join(testDir, '.packmind/commands/create-module.md'),
          'utf-8',
        );
        expect(fileContent).toContain('Create a new NestJS module');
        expect(fileContent).toContain('## When to Use');
        expect(fileContent).toContain('- Adding new features');
        expect(fileContent).toContain('## Context Validation Checkpoints');
        expect(fileContent).toContain('* [ ] What is the module name?');
        expect(fileContent).toContain('## Recipe Steps');
        expect(fileContent).toContain('### Step 1: Create folder structure');
        expect(fileContent).toContain('### Step 2: Create module file');
        expect(fileContent).toContain('@Module({})');
      });
    });

    describe('when writing skills', () => {
      it('creates skill file in .claude/skills/{name}/SKILL.md', async () => {
        const content = {
          standards: [],
          commands: [],
          skills: [
            {
              name: 'debugging-jest',
              description: 'Debug applications with Jest',
              prompt: '# Debugging with Jest\n\nWhen debugging...',
            },
          ],
        };

        const result = await service.writeContent(testDir, content);

        expect(result.filesCreated).toBe(1);
        expect(result.paths.skills).toContain(
          '.claude/skills/debugging-jest/SKILL.md',
        );

        const fileContent = await fs.readFile(
          path.join(testDir, '.claude/skills/debugging-jest/SKILL.md'),
          'utf-8',
        );
        expect(fileContent).toContain("name: 'debugging-jest'");
        expect(fileContent).toContain(
          "description: 'Debug applications with Jest'",
        );
        expect(fileContent).toContain('# Debugging with Jest');
      });

      it('escapes single quotes in description', async () => {
        const content = {
          standards: [],
          commands: [],
          skills: [
            {
              name: 'test-skill',
              description: "It's a test skill with 'quotes'",
              prompt: '# Test',
            },
          ],
        };

        await service.writeContent(testDir, content);

        const fileContent = await fs.readFile(
          path.join(testDir, '.claude/skills/test-skill/SKILL.md'),
          'utf-8',
        );
        expect(fileContent).toContain(
          "description: 'It''s a test skill with ''quotes'''",
        );
      });
    });

    describe('when writing mixed content', () => {
      it('writes all content types and returns combined result', async () => {
        const content = {
          standards: [
            {
              name: 'Standard 1',
              description: 'Desc 1',
              summary: 'Sum 1',
              rules: [{ content: 'Rule 1' }],
            },
          ],
          commands: [
            {
              name: 'Command 1',
              summary: 'Summary 1',
              whenToUse: ['When needed'],
              contextValidationCheckpoints: ['Check 1'],
              steps: [{ name: 'Step', description: 'Do it' }],
            },
          ],
          skills: [
            {
              name: 'skill-1',
              description: 'Skill 1',
              prompt: '# Skill',
            },
          ],
        };

        const result = await service.writeContent(testDir, content);

        expect(result.filesCreated).toBe(3);
        expect(result.errors).toHaveLength(0);
        expect(result.paths.standards).toHaveLength(1);
        expect(result.paths.commands).toHaveLength(1);
        expect(result.paths.skills).toHaveLength(1);
      });
    });

    describe('when handling errors', () => {
      it('collects errors without stopping other writes', async () => {
        const content = {
          standards: [
            {
              name: 'Valid Standard',
              description: 'Valid',
              summary: 'Valid',
              rules: [{ content: 'Rule' }],
            },
          ],
          commands: [],
          skills: [
            {
              name: 'valid-skill',
              description: 'Valid skill',
              prompt: '# Valid',
            },
          ],
        };

        const result = await service.writeContent(testDir, content);

        expect(result.filesCreated).toBe(2);
        expect(result.paths.standards).toHaveLength(1);
        expect(result.paths.skills).toHaveLength(1);
      });
    });

    describe('slugify', () => {
      it('converts name to lowercase kebab-case', async () => {
        const content = {
          standards: [
            {
              name: 'TypeScript Best Practices',
              description: 'Desc',
              summary: 'Sum',
              rules: [{ content: 'Rule' }],
            },
          ],
          commands: [],
          skills: [],
        };

        const result = await service.writeContent(testDir, content);

        expect(result.paths.standards).toContain(
          '.packmind/standards/typescript-best-practices.md',
        );
      });

      it('removes special characters', async () => {
        const content = {
          standards: [
            {
              name: 'C# & .NET Standards!',
              description: 'Desc',
              summary: 'Sum',
              rules: [{ content: 'Rule' }],
            },
          ],
          commands: [],
          skills: [],
        };

        const result = await service.writeContent(testDir, content);

        expect(result.paths.standards).toContain(
          '.packmind/standards/c-net-standards.md',
        );
      });
    });
  });
});
