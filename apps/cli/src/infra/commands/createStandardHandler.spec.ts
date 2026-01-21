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

  it('creates a standard from valid playbook file', async () => {
    const playbook = {
      name: 'Test Standard',
      description: 'Test',
      scope: 'Test',
      rules: [{ content: 'Use something' }],
    };

    const filePath = path.join(tempDir, 'playbook.json');
    await fs.writeFile(filePath, JSON.stringify(playbook));

    const result = await createStandardHandler(filePath, mockGateway);

    expect(result.success).toBe(true);
    expect(mockGateway.createStandardFromPlaybook).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Standard',
      }),
    );
  });

  it('returns error when file is not found', async () => {
    const result = await createStandardHandler(
      '/nonexistent.json',
      mockGateway,
    );
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns error when playbook is invalid', async () => {
    const filePath = path.join(tempDir, 'invalid.json');
    await fs.writeFile(filePath, '{ "invalid": "structure" }');

    const result = await createStandardHandler(filePath, mockGateway);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
