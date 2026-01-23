import { createStandardHandler } from './createStandardHandler';
import { ICreateStandardFromPlaybookUseCase } from '../../domain/useCases/ICreateStandardFromPlaybookUseCase';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

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
    it('returns success with standard details', async () => {
      const playbook = {
        name: 'Test Standard',
        description: 'Test',
        scope: 'Test',
        rules: [{ content: 'Use something' }],
      };

      const filePath = path.join(tempDir, 'playbook.json');
      await fs.writeFile(filePath, JSON.stringify(playbook));

      const result = await createStandardHandler(filePath, mockUseCase);

      expect(result.success).toBe(true);
      expect(result.standardId).toBe('test-standard-123');
      expect(result.standardName).toBe('Test Standard');
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
    it('returns error', async () => {
      const result = await createStandardHandler(
        '/nonexistent.json',
        mockUseCase,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('when playbook is invalid', () => {
    it('returns error', async () => {
      const filePath = path.join(tempDir, 'invalid.json');
      await fs.writeFile(filePath, '{ "invalid": "structure" }');

      const result = await createStandardHandler(filePath, mockUseCase);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('when use case throws error', () => {
    it('returns error', async () => {
      mockUseCase.execute.mockRejectedValue(new Error('API failed'));
      const playbook = {
        name: 'Test',
        description: 'Test',
        scope: 'Test',
        rules: [{ content: 'Rule' }],
      };
      const filePath = path.join(tempDir, 'playbook.json');
      await fs.writeFile(filePath, JSON.stringify(playbook));

      const result = await createStandardHandler(filePath, mockUseCase);

      expect(result.success).toBe(false);
      expect(result.error).toContain('API failed');
    });
  });
});
