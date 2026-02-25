import { createStandardHandler } from './createStandardHandler';
import { ICreateStandardFromPlaybookUseCase } from '../../domain/useCases/ICreateStandardFromPlaybookUseCase';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

jest.mock('../utils/readStdin');
import { readStdin } from '../utils/readStdin';
const mockReadStdin = readStdin as jest.MockedFunction<typeof readStdin>;

describe('createStandardHandler', () => {
  let mockUseCase: jest.Mocked<ICreateStandardFromPlaybookUseCase>;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'handler-test-'));
    mockUseCase = {
      execute: jest.fn().mockResolvedValue({
        standardId: 'test-standard-123',
        name: 'Test Standard',
      }),
    };
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  describe('when creating a standard from valid playbook file', () => {
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

      result = await createStandardHandler(filePath, mockUseCase);
    });

    it('returns success', () => {
      expect(result.success).toBe(true);
    });

    it('returns the standard id', () => {
      expect(result.standardId).toBe('test-standard-123');
    });

    it('returns the standard name', () => {
      expect(result.standardName).toBe('Test Standard');
    });

    it('calls use case with playbook data', () => {
      expect(mockUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Standard',
          description: 'Test',
          scope: 'Test',
          rules: [{ content: 'Use something' }],
        }),
      );
    });
  });

  describe('when file is not found', () => {
    let result: Awaited<ReturnType<typeof createStandardHandler>>;

    beforeEach(async () => {
      result = await createStandardHandler('/nonexistent.json', mockUseCase);
    });

    it('returns failure', () => {
      expect(result.success).toBe(false);
    });

    it('returns an error', () => {
      expect(result.error).toBeDefined();
    });

    it('does not call use case', () => {
      expect(mockUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('when playbook is invalid', () => {
    let result: Awaited<ReturnType<typeof createStandardHandler>>;

    beforeEach(async () => {
      const filePath = path.join(tempDir, 'invalid.json');
      await fs.writeFile(filePath, '{ "invalid": "structure" }');

      result = await createStandardHandler(filePath, mockUseCase);
    });

    it('returns failure', () => {
      expect(result.success).toBe(false);
    });

    it('returns an error', () => {
      expect(result.error).toBeDefined();
    });

    it('does not call use case', () => {
      expect(mockUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('when use case throws error', () => {
    let result: Awaited<ReturnType<typeof createStandardHandler>>;

    beforeEach(async () => {
      mockUseCase.execute.mockRejectedValue(new Error('API failed'));
      const playbook = {
        name: 'Test',
        description: 'Test',
        scope: 'Test',
        rules: [{ content: 'Rule' }],
      };
      const filePath = path.join(tempDir, 'playbook.json');
      await fs.writeFile(filePath, JSON.stringify(playbook));

      result = await createStandardHandler(filePath, mockUseCase);
    });

    it('returns failure', () => {
      expect(result.success).toBe(false);
    });

    it('returns the error message', () => {
      expect(result.error).toContain('API failed');
    });
  });

  describe('when reading from stdin (no file path)', () => {
    describe('with valid JSON from stdin', () => {
      let result: Awaited<ReturnType<typeof createStandardHandler>>;

      beforeEach(async () => {
        const playbook = {
          name: 'Stdin Standard',
          description: 'Created from stdin',
          scope: 'Test scope',
          rules: [{ content: 'Use something' }],
        };
        mockReadStdin.mockResolvedValue(JSON.stringify(playbook));

        result = await createStandardHandler(undefined, mockUseCase);
      });

      it('returns success', () => {
        expect(result.success).toBe(true);
      });

      it('calls use case with parsed data', () => {
        expect(mockUseCase.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Stdin Standard',
            description: 'Created from stdin',
            scope: 'Test scope',
            rules: [{ content: 'Use something' }],
          }),
        );
      });
    });

    describe('when stdin contains invalid JSON', () => {
      let result: Awaited<ReturnType<typeof createStandardHandler>>;

      beforeEach(async () => {
        mockReadStdin.mockResolvedValue('{invalid json}');
        result = await createStandardHandler(undefined, mockUseCase);
      });

      it('returns failure', () => {
        expect(result.success).toBe(false);
      });

      it('returns validation error', () => {
        expect(result.error).toBeDefined();
      });
    });

    describe('when stdin read fails', () => {
      let result: Awaited<ReturnType<typeof createStandardHandler>>;

      beforeEach(async () => {
        mockReadStdin.mockRejectedValue(
          new Error('No file argument provided and no piped input detected'),
        );
        result = await createStandardHandler(undefined, mockUseCase);
      });

      it('returns failure', () => {
        expect(result.success).toBe(false);
      });

      it('returns the stdin error message', () => {
        expect(result.error).toContain('No file argument provided');
      });
    });
  });
});
