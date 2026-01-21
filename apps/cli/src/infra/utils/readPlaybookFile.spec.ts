import { readPlaybookFile } from './readPlaybookFile';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('readPlaybookFile', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'playbook-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('reads and parses a valid playbook JSON file', async () => {
    const playbook = {
      name: 'Test',
      description: 'Test description',
      scope: 'Test scope',
      rules: [{ content: 'Use something' }],
    };

    const filePath = path.join(tempDir, 'playbook.json');
    await fs.writeFile(filePath, JSON.stringify(playbook));

    const result = await readPlaybookFile(filePath);
    expect(result.isValid).toBe(true);
    expect(result.data).toEqual(playbook);
  });

  it('returns error for missing file', async () => {
    const result = await readPlaybookFile('/nonexistent/path.json');
    expect(result.isValid).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('returns error for invalid JSON', async () => {
    const filePath = path.join(tempDir, 'invalid.json');
    await fs.writeFile(filePath, '{invalid json}');

    const result = await readPlaybookFile(filePath);
    expect(result.isValid).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('returns error for invalid playbook structure', async () => {
    const playbook = {
      name: 'Test',
      // missing required fields
    };

    const filePath = path.join(tempDir, 'incomplete.json');
    await fs.writeFile(filePath, JSON.stringify(playbook));

    const result = await readPlaybookFile(filePath);
    expect(result.isValid).toBe(false);
    expect(result.errors).toBeDefined();
  });
});
