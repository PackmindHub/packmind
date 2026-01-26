import * as fs from 'fs';
import * as path from 'path';
import { DocumentationScannerService } from './DocumentationScannerService';

jest.mock('fs');

describe('DocumentationScannerService', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('parseRulesFromMarkdown', () => {
    describe('when markdown contains bullet points', () => {
      it('extracts bullet points as rules', () => {
        const service = new DocumentationScannerService();
        const markdown = `# Coding Standards

- Use TypeScript for all new code
- Prefer const over let
- Write unit tests for all functions`;

        const rules = service.parseRulesFromMarkdown(markdown);

        expect(rules).toEqual([
          'Use TypeScript for all new code',
          'Prefer const over let',
          'Write unit tests for all functions',
        ]);
      });
    });

    describe('when markdown contains numbered lists', () => {
      it('extracts numbered items as rules', () => {
        const service = new DocumentationScannerService();
        const markdown = `# Guidelines

1. Run tests before committing
2. Follow naming conventions
3. Document public APIs`;

        const rules = service.parseRulesFromMarkdown(markdown);

        expect(rules).toEqual([
          'Run tests before committing',
          'Follow naming conventions',
          'Document public APIs',
        ]);
      });
    });

    describe('when markdown contains mixed bullet and numbered lists', () => {
      it('extracts all items as rules', () => {
        const service = new DocumentationScannerService();
        const markdown = `# Standards

- Use async/await
- No console.log

## Also

1. Write tests
2. Run linter`;

        const rules = service.parseRulesFromMarkdown(markdown);

        expect(rules).toEqual([
          'Use async/await',
          'No console.log',
          'Write tests',
          'Run linter',
        ]);
      });
    });

    describe('when markdown has no lists', () => {
      it('returns empty array', () => {
        const service = new DocumentationScannerService();
        const markdown = `# Just a heading

Some paragraph text.`;

        const rules = service.parseRulesFromMarkdown(markdown);

        expect(rules).toEqual([]);
      });
    });
  });

  describe('parseConventionsFromMarkdown', () => {
    describe('when markdown contains convention sections', () => {
      it('extracts conventions from convention headers', () => {
        const service = new DocumentationScannerService();
        const markdown = `# Conventions

## Naming Conventions

- Use camelCase for variables
- Use PascalCase for classes

## Other stuff

- Not a convention`;

        const conventions = service.parseConventionsFromMarkdown(markdown);

        expect(conventions).toEqual([
          'Use camelCase for variables',
          'Use PascalCase for classes',
        ]);
      });
    });

    describe('when markdown has no convention sections', () => {
      it('returns empty array', () => {
        const service = new DocumentationScannerService();
        const markdown = `# Standards

- Some rule
- Another rule`;

        const conventions = service.parseConventionsFromMarkdown(markdown);

        expect(conventions).toEqual([]);
      });
    });
  });

  describe('parseWorkflowsFromMarkdown', () => {
    describe('when markdown contains workflows with 3+ steps', () => {
      it('extracts workflow descriptions', () => {
        const service = new DocumentationScannerService();
        const markdown = `# Release Process

1. Update version in package.json
2. Run build
3. Create git tag
4. Push to repository

## Quick fix

1. Make change
2. Commit`;

        const workflows = service.parseWorkflowsFromMarkdown(markdown);

        expect(workflows).toEqual(['Release Process: 4 steps']);
      });
    });

    describe('when markdown has workflows with less than 3 steps', () => {
      it('does not extract short workflows', () => {
        const service = new DocumentationScannerService();
        const markdown = `# Process

1. Do this
2. Do that`;

        const workflows = service.parseWorkflowsFromMarkdown(markdown);

        expect(workflows).toEqual([]);
      });
    });
  });

  describe('deduplicateRules', () => {
    describe('when rules contain duplicates', () => {
      it('removes duplicate rules', () => {
        const service = new DocumentationScannerService();
        const rules = [
          'Use TypeScript',
          'Write tests',
          'Use TypeScript',
          'Write tests',
          'Follow style guide',
        ];

        const deduplicated = service.deduplicateRules(rules);

        expect(deduplicated).toEqual([
          'Use TypeScript',
          'Write tests',
          'Follow style guide',
        ]);
      });
    });

    describe('when rules have no duplicates', () => {
      it('returns all rules', () => {
        const service = new DocumentationScannerService();
        const rules = ['Use TypeScript', 'Write tests', 'Follow style guide'];

        const deduplicated = service.deduplicateRules(rules);

        expect(deduplicated).toEqual(rules);
      });
    });
  });

  describe('scanExistingDocumentation', () => {
    describe('when project has CLAUDE.md', () => {
      let result: Awaited<
        ReturnType<DocumentationScannerService['scanExistingDocumentation']>
      >;

      beforeEach(async () => {
        mockFs.existsSync.mockImplementation((filePath: any) => {
          return filePath === '/project/CLAUDE.md';
        });
        mockFs.readFileSync.mockReturnValue(`# CLAUDE.md

- Use TypeScript
- Write unit tests`);

        const service = new DocumentationScannerService();
        result = await service.scanExistingDocumentation('/project');
      });

      it('includes extracted rules', () => {
        expect(result.extractedRules).toContain('Use TypeScript');
        expect(result.extractedRules).toContain('Write unit tests');
      });

      it('includes source file path', () => {
        expect(result.sourceFiles).toContain('/project/CLAUDE.md');
      });
    });

    describe('when project has CONTRIBUTING.md', () => {
      let result: Awaited<
        ReturnType<DocumentationScannerService['scanExistingDocumentation']>
      >;

      beforeEach(async () => {
        mockFs.existsSync.mockImplementation((filePath: any) => {
          return filePath === '/project/CONTRIBUTING.md';
        });
        mockFs.readFileSync.mockReturnValue(`# Contributing

1. Fork the repository
2. Create a branch
3. Make changes`);

        const service = new DocumentationScannerService();
        result = await service.scanExistingDocumentation('/project');
      });

      it('includes extracted rules', () => {
        expect(result.extractedRules).toContain('Fork the repository');
      });

      it('includes source file path', () => {
        expect(result.sourceFiles).toContain('/project/CONTRIBUTING.md');
      });
    });

    describe('when project has .cursorrules', () => {
      it('scans .cursorrules file', async () => {
        mockFs.existsSync.mockImplementation((filePath: any) => {
          return filePath === '/project/.cursorrules';
        });
        mockFs.readFileSync.mockReturnValue(`- Always use async/await`);

        const service = new DocumentationScannerService();
        const result = await service.scanExistingDocumentation('/project');

        expect(result.extractedRules).toContain('Always use async/await');
        expect(result.sourceFiles).toContain('/project/.cursorrules');
      });
    });

    describe('when project has CONVENTIONS.md', () => {
      it('scans CONVENTIONS.md file', async () => {
        mockFs.existsSync.mockImplementation((filePath: any) => {
          return filePath === '/project/CONVENTIONS.md';
        });
        mockFs.readFileSync.mockReturnValue(`- Naming convention: camelCase`);

        const service = new DocumentationScannerService();
        const result = await service.scanExistingDocumentation('/project');

        expect(result.extractedRules).toContain('Naming convention: camelCase');
        expect(result.sourceFiles).toContain('/project/CONVENTIONS.md');
      });
    });

    describe('when project has CODE_STYLE.md', () => {
      it('scans CODE_STYLE.md file', async () => {
        mockFs.existsSync.mockImplementation((filePath: any) => {
          return filePath === '/project/CODE_STYLE.md';
        });
        mockFs.readFileSync.mockReturnValue(`- Indent with 2 spaces`);

        const service = new DocumentationScannerService();
        const result = await service.scanExistingDocumentation('/project');

        expect(result.extractedRules).toContain('Indent with 2 spaces');
      });
    });

    describe('when project has docs/standards directory', () => {
      it('scans markdown files in docs/standards', async () => {
        mockFs.existsSync.mockImplementation((filePath: any) => {
          return (
            filePath === '/project/docs/standards' ||
            filePath === '/project/docs/standards/api.md'
          );
        });
        mockFs.readdirSync.mockReturnValue(['api.md'] as any);
        mockFs.statSync.mockReturnValue({ isFile: () => true } as any);
        mockFs.readFileSync.mockReturnValue(`- Use REST conventions`);

        const service = new DocumentationScannerService();
        const result = await service.scanExistingDocumentation('/project');

        expect(result.extractedRules).toContain('Use REST conventions');
        expect(result.sourceFiles).toContain('/project/docs/standards/api.md');
      });
    });

    describe('when project has docs/conventions directory', () => {
      it('scans markdown files in docs/conventions', async () => {
        mockFs.existsSync.mockImplementation((filePath: any) => {
          return (
            filePath === '/project/docs/conventions' ||
            filePath === '/project/docs/conventions/naming.md'
          );
        });
        mockFs.readdirSync.mockReturnValue(['naming.md'] as any);
        mockFs.statSync.mockReturnValue({ isFile: () => true } as any);
        mockFs.readFileSync.mockReturnValue(`- Use snake_case for files`);

        const service = new DocumentationScannerService();
        const result = await service.scanExistingDocumentation('/project');

        expect(result.extractedRules).toContain('Use snake_case for files');
      });
    });

    describe('when project has .claude/rules directory', () => {
      it('scans markdown files in .claude/rules', async () => {
        mockFs.existsSync.mockImplementation((filePath: any) => {
          return (
            filePath === '/project/.claude/rules' ||
            filePath === '/project/.claude/rules/testing.md'
          );
        });
        mockFs.readdirSync.mockReturnValue(['testing.md'] as any);
        mockFs.statSync.mockReturnValue({ isFile: () => true } as any);
        mockFs.readFileSync.mockReturnValue(`- Write tests first`);

        const service = new DocumentationScannerService();
        const result = await service.scanExistingDocumentation('/project');

        expect(result.extractedRules).toContain('Write tests first');
      });
    });

    describe('when project has .packmind/standards directory', () => {
      it('scans markdown files in .packmind/standards', async () => {
        mockFs.existsSync.mockImplementation((filePath: any) => {
          return (
            filePath === '/project/.packmind/standards' ||
            filePath === '/project/.packmind/standards/quality.md'
          );
        });
        mockFs.readdirSync.mockReturnValue(['quality.md'] as any);
        mockFs.statSync.mockReturnValue({ isFile: () => true } as any);
        mockFs.readFileSync.mockReturnValue(`- Run quality gate before commit`);

        const service = new DocumentationScannerService();
        const result = await service.scanExistingDocumentation('/project');

        expect(result.extractedRules).toContain(
          'Run quality gate before commit',
        );
      });
    });

    describe('when project has multiple documentation files', () => {
      let result: Awaited<
        ReturnType<DocumentationScannerService['scanExistingDocumentation']>
      >;

      beforeEach(async () => {
        mockFs.existsSync.mockImplementation((filePath: any) => {
          return (
            filePath === '/project/CLAUDE.md' ||
            filePath === '/project/CONTRIBUTING.md'
          );
        });
        mockFs.readFileSync.mockImplementation((filePath: any) => {
          if (filePath === '/project/CLAUDE.md') {
            return `- Use TypeScript\n- Use TypeScript`;
          }
          return `- Fork repository\n- Use TypeScript`;
        });

        const service = new DocumentationScannerService();
        result = await service.scanExistingDocumentation('/project');
      });

      it('deduplicates rules from multiple files', () => {
        const tsCount = result.extractedRules.filter(
          (r) => r === 'Use TypeScript',
        ).length;
        expect(tsCount).toBe(1);
      });

      it('includes all unique rules', () => {
        expect(result.extractedRules).toContain('Use TypeScript');
        expect(result.extractedRules).toContain('Fork repository');
      });

      it('includes all source files', () => {
        expect(result.sourceFiles).toContain('/project/CLAUDE.md');
        expect(result.sourceFiles).toContain('/project/CONTRIBUTING.md');
      });
    });

    describe('when project has no documentation files', () => {
      it('returns empty results', async () => {
        mockFs.existsSync.mockReturnValue(false);

        const service = new DocumentationScannerService();
        const result = await service.scanExistingDocumentation('/project');

        expect(result.extractedRules).toEqual([]);
        expect(result.extractedConventions).toEqual([]);
        expect(result.extractedWorkflows).toEqual([]);
        expect(result.sourceFiles).toEqual([]);
      });
    });

    describe('when extracting conventions from documentation', () => {
      it('separates conventions into their own list', async () => {
        mockFs.existsSync.mockImplementation((filePath: any) => {
          return filePath === '/project/CLAUDE.md';
        });
        mockFs.readFileSync.mockReturnValue(`# Conventions

- Use camelCase

# Standards

- Write tests`);

        const service = new DocumentationScannerService();
        const result = await service.scanExistingDocumentation('/project');

        expect(result.extractedConventions).toContain('Use camelCase');
        expect(result.extractedRules).toContain('Write tests');
      });
    });

    describe('when extracting workflows from documentation', () => {
      it('identifies multi-step workflows', async () => {
        mockFs.existsSync.mockImplementation((filePath: any) => {
          return filePath === '/project/CONTRIBUTING.md';
        });
        mockFs.readFileSync.mockReturnValue(`# Release Process

1. Update version
2. Build project
3. Create tag
4. Push changes`);

        const service = new DocumentationScannerService();
        const result = await service.scanExistingDocumentation('/project');

        expect(result.extractedWorkflows.length).toBeGreaterThan(0);
      });
    });
  });
});
