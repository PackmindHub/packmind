import { createStandardHandler } from './createStandardHandler';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

describe('createStandardHandler', () => {
  let mockGateway: IPackmindGateway;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'handler-test-'));
    mockGateway = {
      createStandardFromPlaybook: jest.fn().mockResolvedValue({
        success: true,
        standardId: 'test-standard-123',
        name: 'Test Standard',
      }),
    } as unknown as IPackmindGateway;
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
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

      result = await createStandardHandler(filePath, mockGateway);
    });

    it('returns success', () => {
      expect(result.success).toBe(true);
    });

    it('calls gateway with correct playbook data', () => {
      expect(mockGateway.createStandardFromPlaybook).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Standard',
        }),
      );
    });
  });

  describe('when file is not found', () => {
    let result: Awaited<ReturnType<typeof createStandardHandler>>;

    beforeEach(async () => {
      result = await createStandardHandler('/nonexistent.json', mockGateway);
    });

    it('returns failure', () => {
      expect(result.success).toBe(false);
    });

    it('includes error details', () => {
      expect(result.error).toBeDefined();
    });
  });

  describe('when playbook is invalid', () => {
    let result: Awaited<ReturnType<typeof createStandardHandler>>;

    beforeEach(async () => {
      const filePath = path.join(tempDir, 'invalid.json');
      await fs.writeFile(filePath, '{ "invalid": "structure" }');

      result = await createStandardHandler(filePath, mockGateway);
    });

    it('returns failure', () => {
      expect(result.success).toBe(false);
    });

    it('includes error details', () => {
      expect(result.error).toBeDefined();
    });
  });
});
