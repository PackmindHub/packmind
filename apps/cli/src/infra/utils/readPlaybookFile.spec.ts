import { readPlaybookFile, ReadPlaybookResult } from './readPlaybookFile';
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

  describe('when reading a valid playbook JSON file', () => {
    let result: ReadPlaybookResult;
    const playbook = {
      name: 'Test',
      description: 'Test description',
      scope: 'Test scope',
      rules: [{ content: 'Use something' }],
    };

    beforeEach(async () => {
      const filePath = path.join(tempDir, 'playbook.json');
      await fs.writeFile(filePath, JSON.stringify(playbook));
      result = await readPlaybookFile(filePath);
    });

    it('returns valid status', () => {
      expect(result.isValid).toBe(true);
    });

    it('returns parsed playbook data', () => {
      expect(result.data).toEqual(playbook);
    });
  });

  describe('when reading a missing file', () => {
    let result: ReadPlaybookResult;

    beforeEach(async () => {
      result = await readPlaybookFile('/nonexistent/path.json');
    });

    it('returns invalid status', () => {
      expect(result.isValid).toBe(false);
    });

    it('returns errors', () => {
      expect(result.errors).toBeDefined();
    });
  });

  describe('when reading invalid JSON', () => {
    let result: ReadPlaybookResult;

    beforeEach(async () => {
      const filePath = path.join(tempDir, 'invalid.json');
      await fs.writeFile(filePath, '{invalid json}');
      result = await readPlaybookFile(filePath);
    });

    it('returns invalid status', () => {
      expect(result.isValid).toBe(false);
    });

    it('returns errors', () => {
      expect(result.errors).toBeDefined();
    });
  });

  describe('when reading an invalid playbook structure', () => {
    let result: ReadPlaybookResult;

    beforeEach(async () => {
      const playbook = {
        name: 'Test',
        // missing required fields
      };
      const filePath = path.join(tempDir, 'incomplete.json');
      await fs.writeFile(filePath, JSON.stringify(playbook));
      result = await readPlaybookFile(filePath);
    });

    it('returns invalid status', () => {
      expect(result.isValid).toBe(false);
    });

    it('returns errors', () => {
      expect(result.errors).toBeDefined();
    });
  });
});
