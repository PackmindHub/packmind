import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { ICreateStandardFromPlaybookUseCase } from '../../domain/useCases/ICreateStandardFromPlaybookUseCase';
import { createStandardHandler } from './createStandardHandler';

describe('Standard Create E2E', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'e2e-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('when creating a standard from complete playbook JSON', () => {
    it('returns success with standard details', async () => {
      const playbook = {
        name: 'Complete Test Standard',
        description: 'A complete standard with all features',
        scope: 'TypeScript and JavaScript files',
        rules: [
          {
            content: 'Use const for variables that do not change',
            examples: {
              positive: 'const API_KEY = "secret";',
              negative: 'let API_KEY = "secret";',
              language: 'TYPESCRIPT',
            },
          },
          {
            content: 'Use arrow functions for callbacks',
            examples: {
              positive: 'array.map((item) => item.id)',
              negative: 'array.map(function(item) { return item.id; })',
              language: 'JAVASCRIPT',
            },
          },
        ],
      };

      const filePath = path.join(tempDir, 'complete-playbook.json');
      await fs.writeFile(filePath, JSON.stringify(playbook, null, 2));

      const mockUseCase: jest.Mocked<ICreateStandardFromPlaybookUseCase> = {
        execute: jest.fn().mockResolvedValue({
          standardId: 'std-complete-123',
          name: 'Complete Test Standard',
        }),
      };

      const result = await createStandardHandler(filePath, mockUseCase);

      expect(result.success).toBe(true);
      expect(result.standardId).toBe('std-complete-123');
      expect(result.standardName).toBe('Complete Test Standard');
    });

    it('passes all rule data to use case including examples', async () => {
      const playbook = {
        name: 'Complete Test Standard',
        description: 'A complete standard with all features',
        scope: 'TypeScript and JavaScript files',
        rules: [
          {
            content: 'Use const for variables that do not change',
            examples: {
              positive: 'const API_KEY = "secret";',
              negative: 'let API_KEY = "secret";',
              language: 'TYPESCRIPT',
            },
          },
        ],
      };

      const filePath = path.join(tempDir, 'complete-playbook.json');
      await fs.writeFile(filePath, JSON.stringify(playbook, null, 2));

      const mockUseCase: jest.Mocked<ICreateStandardFromPlaybookUseCase> = {
        execute: jest.fn().mockResolvedValue({
          standardId: 'std-complete-123',
          name: 'Complete Test Standard',
        }),
      };

      await createStandardHandler(filePath, mockUseCase);

      expect(mockUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Complete Test Standard',
          description: 'A complete standard with all features',
          scope: 'TypeScript and JavaScript files',
          rules: expect.arrayContaining([
            expect.objectContaining({
              content: 'Use const for variables that do not change',
              examples: expect.objectContaining({
                positive: 'const API_KEY = "secret";',
                negative: 'let API_KEY = "secret";',
                language: 'TYPESCRIPT',
              }),
            }),
          ]),
        }),
      );
    });
  });

  describe('when handling multiple rules with optional examples', () => {
    it('returns success for playbook with mixed examples', async () => {
      const playbook = {
        name: 'Mixed Examples Standard',
        description: 'Some rules with examples, some without',
        scope: 'Python files',
        rules: [
          {
            content: 'Use type hints',
            examples: {
              positive: 'def greet(name: str) -> str:',
              negative: 'def greet(name):',
              language: 'PYTHON',
            },
          },
          {
            content: 'Document public functions',
          },
        ],
      };

      const filePath = path.join(tempDir, 'mixed-playbook.json');
      await fs.writeFile(filePath, JSON.stringify(playbook));

      const mockUseCase: jest.Mocked<ICreateStandardFromPlaybookUseCase> = {
        execute: jest.fn().mockResolvedValue({
          standardId: 'std-mixed-456',
          name: 'Mixed Examples Standard',
        }),
      };

      const result = await createStandardHandler(filePath, mockUseCase);

      expect(result.success).toBe(true);
      expect(result.standardId).toBe('std-mixed-456');
    });

    it('handles rules without examples by passing undefined', async () => {
      const playbook = {
        name: 'Mixed Examples Standard',
        description: 'Some rules with examples, some without',
        scope: 'Python files',
        rules: [
          {
            content: 'Use type hints',
            examples: {
              positive: 'def greet(name: str) -> str:',
              negative: 'def greet(name):',
              language: 'PYTHON',
            },
          },
          {
            content: 'Document public functions',
          },
        ],
      };

      const filePath = path.join(tempDir, 'mixed-playbook.json');
      await fs.writeFile(filePath, JSON.stringify(playbook));

      const mockUseCase: jest.Mocked<ICreateStandardFromPlaybookUseCase> = {
        execute: jest.fn().mockResolvedValue({
          standardId: 'std-mixed-456',
          name: 'Mixed Examples Standard',
        }),
      };

      await createStandardHandler(filePath, mockUseCase);

      expect(mockUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          rules: expect.arrayContaining([
            expect.objectContaining({
              content: 'Document public functions',
            }),
          ]),
        }),
      );
    });
  });

  describe('when use case throws an exception', () => {
    it('catches and returns error from use case exception', async () => {
      const playbook = {
        name: 'Test Standard',
        description: 'Test',
        scope: 'Test',
        rules: [{ content: 'Use something' }],
      };

      const filePath = path.join(tempDir, 'playbook.json');
      await fs.writeFile(filePath, JSON.stringify(playbook));

      const mockUseCase: jest.Mocked<ICreateStandardFromPlaybookUseCase> = {
        execute: jest.fn().mockRejectedValue(new Error('Network error')),
      };

      const result = await createStandardHandler(filePath, mockUseCase);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Error creating standard');
      expect(result.error).toContain('Network error');
    });
  });

  describe('when handling file system operations', () => {
    it('reads the playbook file correctly and calls use case', async () => {
      const playbook = {
        name: 'File System Standard',
        description: 'Test reading from actual file',
        scope: 'Java files',
        rules: [
          {
            content: 'Use final for immutable fields',
            examples: {
              positive: 'private final String name;',
              negative: 'private String name;',
              language: 'JAVA',
            },
          },
        ],
      };

      const filePath = path.join(tempDir, 'fs-playbook.json');
      await fs.writeFile(filePath, JSON.stringify(playbook));

      const fileContent = await fs.readFile(filePath, 'utf-8');

      const mockUseCase: jest.Mocked<ICreateStandardFromPlaybookUseCase> = {
        execute: jest.fn().mockResolvedValue({
          standardId: 'std-fs-789',
          name: 'File System Standard',
        }),
      };

      const result = await createStandardHandler(filePath, mockUseCase);

      expect(fileContent).toContain('File System Standard');
      expect(result.success).toBe(true);
      expect(mockUseCase.execute).toHaveBeenCalled();
    });
  });

  describe('when transforming playbook data to standard format', () => {
    it('preserves all metadata during transformation', async () => {
      const playbook = {
        name: 'Metadata Test Standard',
        description: 'Test preserving metadata',
        scope: 'Go files',
        rules: [
          {
            content: 'Use interfaces for abstractions',
            examples: {
              positive: 'type Reader interface { Read() }',
              negative: 'type Reader struct { Read() }',
              language: 'GO',
            },
          },
        ],
      };

      const filePath = path.join(tempDir, 'metadata-playbook.json');
      await fs.writeFile(filePath, JSON.stringify(playbook));

      const mockUseCase: jest.Mocked<ICreateStandardFromPlaybookUseCase> = {
        execute: jest.fn().mockResolvedValue({
          standardId: 'std-metadata-999',
          name: 'Metadata Test Standard',
        }),
      };

      await createStandardHandler(filePath, mockUseCase);

      expect(mockUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Metadata Test Standard',
          description: 'Test preserving metadata',
          scope: 'Go files',
        }),
      );
    });

    it('transforms multiple rules correctly', async () => {
      const playbook = {
        name: 'Multiple Rules Standard',
        description: 'Test multiple rule transformation',
        scope: 'Rust files',
        rules: [
          {
            content: 'Use Result for error handling',
            examples: {
              positive: 'fn read() -> Result<String> {}',
              negative: 'fn read() -> String {}',
              language: 'RUST',
            },
          },
          {
            content: 'Use match for pattern matching',
            examples: {
              positive: 'match result { Ok(v) => {}, Err(e) => {} }',
              negative: 'if result.is_ok() {}',
              language: 'RUST',
            },
          },
          {
            content: 'Document public API',
          },
        ],
      };

      const filePath = path.join(tempDir, 'multi-rules-playbook.json');
      await fs.writeFile(filePath, JSON.stringify(playbook));

      const mockUseCase: jest.Mocked<ICreateStandardFromPlaybookUseCase> = {
        execute: jest.fn().mockResolvedValue({
          standardId: 'std-multi-rules-111',
          name: 'Multiple Rules Standard',
        }),
      };

      await createStandardHandler(filePath, mockUseCase);

      expect(mockUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          rules: expect.arrayContaining([
            expect.objectContaining({
              content: 'Use Result for error handling',
            }),
            expect.objectContaining({
              content: 'Use match for pattern matching',
            }),
            expect.objectContaining({
              content: 'Document public API',
            }),
          ]),
        }),
      );
    });
  });
});
