import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
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
    describe('when handler succeeds', () => {
      let result: Awaited<ReturnType<typeof createStandardHandler>>;

      beforeEach(async () => {
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

        const mockGateway: IPackmindGateway = {
          createStandardFromPlaybook: jest.fn().mockResolvedValue({
            success: true,
            standardId: 'std-complete-123',
            name: 'Complete Test Standard',
          }),
        } as unknown as IPackmindGateway;

        result = await createStandardHandler(filePath, mockGateway);
      });

      it('returns success as true', () => {
        expect(result.success).toBe(true);
      });

      it('returns the standard id', () => {
        expect(result.standardId).toBe('std-complete-123');
      });

      it('returns the standard name', () => {
        expect(result.standardName).toBe('Complete Test Standard');
      });
    });

    it('passes all rule data to gateway including examples', async () => {
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

      const mockGateway: IPackmindGateway = {
        createStandardFromPlaybook: jest.fn().mockResolvedValue({
          success: true,
          standardId: 'std-complete-123',
          name: 'Complete Test Standard',
        }),
      } as unknown as IPackmindGateway;

      await createStandardHandler(filePath, mockGateway);

      expect(mockGateway.createStandardFromPlaybook).toHaveBeenCalledWith(
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
    describe('when playbook has mixed examples', () => {
      let result: Awaited<ReturnType<typeof createStandardHandler>>;

      beforeEach(async () => {
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

        const mockGateway: IPackmindGateway = {
          createStandardFromPlaybook: jest.fn().mockResolvedValue({
            success: true,
            standardId: 'std-mixed-456',
            name: 'Mixed Examples Standard',
          }),
        } as unknown as IPackmindGateway;

        result = await createStandardHandler(filePath, mockGateway);
      });

      it('returns success as true', () => {
        expect(result.success).toBe(true);
      });

      it('returns the standard id', () => {
        expect(result.standardId).toBe('std-mixed-456');
      });
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

      const mockGateway: IPackmindGateway = {
        createStandardFromPlaybook: jest.fn().mockResolvedValue({
          success: true,
          standardId: 'std-mixed-456',
          name: 'Mixed Examples Standard',
        }),
      } as unknown as IPackmindGateway;

      await createStandardHandler(filePath, mockGateway);

      expect(mockGateway.createStandardFromPlaybook).toHaveBeenCalledWith(
        expect.objectContaining({
          rules: expect.arrayContaining([
            expect.objectContaining({
              content: 'Document public functions',
              examples: undefined,
            }),
          ]),
        }),
      );
    });
  });

  describe('when gateway returns an error', () => {
    describe('when gateway returns specific error message', () => {
      let result: Awaited<ReturnType<typeof createStandardHandler>>;

      beforeEach(async () => {
        const playbook = {
          name: 'Test Standard',
          description: 'Test',
          scope: 'Test',
          rules: [{ content: 'Use something' }],
        };

        const filePath = path.join(tempDir, 'playbook.json');
        await fs.writeFile(filePath, JSON.stringify(playbook));

        const mockGateway: IPackmindGateway = {
          createStandardFromPlaybook: jest.fn().mockResolvedValue({
            success: false,
            error: 'Standard with this name already exists',
          }),
        } as unknown as IPackmindGateway;

        result = await createStandardHandler(filePath, mockGateway);
      });

      it('returns success as false', () => {
        expect(result.success).toBe(false);
      });

      it('returns the gateway error message', () => {
        expect(result.error).toBe('Standard with this name already exists');
      });
    });

    describe('when gateway returns no error message', () => {
      let result: Awaited<ReturnType<typeof createStandardHandler>>;

      beforeEach(async () => {
        const playbook = {
          name: 'Test Standard',
          description: 'Test',
          scope: 'Test',
          rules: [{ content: 'Use something' }],
        };

        const filePath = path.join(tempDir, 'playbook.json');
        await fs.writeFile(filePath, JSON.stringify(playbook));

        const mockGateway: IPackmindGateway = {
          createStandardFromPlaybook: jest.fn().mockResolvedValue({
            success: false,
          }),
        } as unknown as IPackmindGateway;

        result = await createStandardHandler(filePath, mockGateway);
      });

      it('returns success as false', () => {
        expect(result.success).toBe(false);
      });

      it('returns fallback error message', () => {
        expect(result.error).toBe('Failed to create standard');
      });
    });
  });

  describe('when gateway throws an exception', () => {
    let result: Awaited<ReturnType<typeof createStandardHandler>>;

    beforeEach(async () => {
      const playbook = {
        name: 'Test Standard',
        description: 'Test',
        scope: 'Test',
        rules: [{ content: 'Use something' }],
      };

      const filePath = path.join(tempDir, 'playbook.json');
      await fs.writeFile(filePath, JSON.stringify(playbook));

      const mockGateway: IPackmindGateway = {
        createStandardFromPlaybook: jest
          .fn()
          .mockRejectedValue(new Error('Network error')),
      } as unknown as IPackmindGateway;

      result = await createStandardHandler(filePath, mockGateway);
    });

    it('returns success as false', () => {
      expect(result.success).toBe(false);
    });

    it('includes error creating standard message', () => {
      expect(result.error).toContain('Error creating standard');
    });

    it('includes the original error message', () => {
      expect(result.error).toContain('Network error');
    });
  });

  describe('when handling file system operations', () => {
    let fileContent: string;
    let result: Awaited<ReturnType<typeof createStandardHandler>>;
    let mockGateway: IPackmindGateway;

    beforeEach(async () => {
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

      fileContent = await fs.readFile(filePath, 'utf-8');

      mockGateway = {
        createStandardFromPlaybook: jest.fn().mockResolvedValue({
          success: true,
          standardId: 'std-fs-789',
          name: 'File System Standard',
        }),
      } as unknown as IPackmindGateway;

      result = await createStandardHandler(filePath, mockGateway);
    });

    it('writes the playbook file correctly', () => {
      expect(fileContent).toContain('File System Standard');
    });

    it('returns success as true', () => {
      expect(result.success).toBe(true);
    });

    it('calls gateway createStandardFromPlaybook', () => {
      expect(mockGateway.createStandardFromPlaybook).toHaveBeenCalled();
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

      const mockGateway: IPackmindGateway = {
        createStandardFromPlaybook: jest.fn().mockResolvedValue({
          success: true,
          standardId: 'std-metadata-999',
          name: 'Metadata Test Standard',
        }),
      } as unknown as IPackmindGateway;

      await createStandardHandler(filePath, mockGateway);

      expect(mockGateway.createStandardFromPlaybook).toHaveBeenCalledWith(
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

      const mockGateway: IPackmindGateway = {
        createStandardFromPlaybook: jest.fn().mockResolvedValue({
          success: true,
          standardId: 'std-multi-rules-111',
          name: 'Multiple Rules Standard',
        }),
      } as unknown as IPackmindGateway;

      await createStandardHandler(filePath, mockGateway);

      expect(mockGateway.createStandardFromPlaybook).toHaveBeenCalledWith(
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
