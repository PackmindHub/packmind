import {
  readCommandPlaybookFile,
  ReadCommandPlaybookResult,
} from './readCommandPlaybookFile';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('readCommandPlaybookFile', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'command-playbook-test-'),
    );
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('when reading a valid command playbook JSON file', () => {
    let result: ReadCommandPlaybookResult;
    const playbook = {
      name: 'Setup React Component',
      summary: 'Creates a new React component with tests',
      whenToUse: ['When creating a new UI component'],
      contextValidationCheckpoints: ['Is this a frontend project?'],
      steps: [
        {
          name: 'Create component file',
          description: 'Create the component TSX file',
        },
      ],
    };

    beforeEach(async () => {
      const filePath = path.join(tempDir, 'command-playbook.json');
      await fs.writeFile(filePath, JSON.stringify(playbook));
      result = await readCommandPlaybookFile(filePath);
    });

    it('returns valid status', () => {
      expect(result.isValid).toBe(true);
    });

    it('returns parsed playbook data', () => {
      expect(result.data).toEqual(playbook);
    });
  });

  describe('when reading a missing file', () => {
    let result: ReadCommandPlaybookResult;

    beforeEach(async () => {
      result = await readCommandPlaybookFile('/nonexistent/path.json');
    });

    it('returns invalid status', () => {
      expect(result.isValid).toBe(false);
    });

    it('returns errors', () => {
      expect(result.errors).toBeDefined();
    });

    it('includes file read error message', () => {
      expect(result.errors?.[0]).toContain('Failed to read file');
    });
  });

  describe('when reading invalid JSON', () => {
    let result: ReadCommandPlaybookResult;

    beforeEach(async () => {
      const filePath = path.join(tempDir, 'invalid.json');
      await fs.writeFile(filePath, '{invalid json}');
      result = await readCommandPlaybookFile(filePath);
    });

    it('returns invalid status', () => {
      expect(result.isValid).toBe(false);
    });

    it('returns errors', () => {
      expect(result.errors).toBeDefined();
    });

    it('includes JSON parse error message', () => {
      expect(result.errors?.[0]).toContain('Invalid JSON');
    });
  });

  describe('when reading an invalid command playbook structure', () => {
    let result: ReadCommandPlaybookResult;

    beforeEach(async () => {
      const playbook = {
        name: 'Test',
        // missing required fields
      };
      const filePath = path.join(tempDir, 'incomplete.json');
      await fs.writeFile(filePath, JSON.stringify(playbook));
      result = await readCommandPlaybookFile(filePath);
    });

    it('returns invalid status', () => {
      expect(result.isValid).toBe(false);
    });

    it('returns errors', () => {
      expect(result.errors).toBeDefined();
    });
  });
});
