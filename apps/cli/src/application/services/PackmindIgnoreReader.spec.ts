import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { PackmindIgnoreReader } from './PackmindIgnoreReader';

describe('PackmindIgnoreReader', () => {
  let reader: PackmindIgnoreReader;
  let tmpDir: string;

  beforeEach(async () => {
    reader = new PackmindIgnoreReader();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'packmindignore-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('when no .packmindignore file exists', () => {
    it('returns empty array', async () => {
      const result = await reader.readIgnorePatterns(tmpDir, tmpDir);
      expect(result).toEqual([]);
    });
  });

  describe('when .packmindignore exists at start directory', () => {
    it('returns parsed patterns', async () => {
      await fs.writeFile(
        path.join(tmpDir, '.packmindignore'),
        'node_modules\ndist\n*.min.js\n',
      );

      const result = await reader.readIgnorePatterns(tmpDir, tmpDir);
      expect(result).toEqual(['node_modules', 'dist', '*.min.js']);
    });
  });

  describe('when .packmindignore has comments and empty lines', () => {
    it('strips comments and empty lines', async () => {
      await fs.writeFile(
        path.join(tmpDir, '.packmindignore'),
        '# This is a comment\nnode_modules\n\n# Another comment\ndist\n   \n',
      );

      const result = await reader.readIgnorePatterns(tmpDir, tmpDir);
      expect(result).toEqual(['node_modules', 'dist']);
    });
  });

  describe('when .packmindignore has lines with whitespace', () => {
    it('trims whitespace from patterns', async () => {
      await fs.writeFile(
        path.join(tmpDir, '.packmindignore'),
        '  node_modules  \n  dist\n',
      );

      const result = await reader.readIgnorePatterns(tmpDir, tmpDir);
      expect(result).toEqual(['node_modules', 'dist']);
    });
  });

  describe('when .packmindignore files exist at multiple levels', () => {
    it('merges patterns from all levels', async () => {
      const childDir = path.join(tmpDir, 'child');
      await fs.mkdir(childDir);

      await fs.writeFile(
        path.join(tmpDir, '.packmindignore'),
        'root-pattern\n',
      );
      await fs.writeFile(
        path.join(childDir, '.packmindignore'),
        'child-pattern\n',
      );

      const result = await reader.readIgnorePatterns(childDir, tmpDir);
      expect(result).toEqual(['child-pattern', 'root-pattern']);
    });
  });

  describe('when stopDirectory is null', () => {
    it('walks up until filesystem root (stops at some point)', async () => {
      await fs.writeFile(
        path.join(tmpDir, '.packmindignore'),
        'some-pattern\n',
      );

      const result = await reader.readIgnorePatterns(tmpDir, null);
      expect(result).toContain('some-pattern');
    });
  });

  describe('when start and stop are the same directory', () => {
    it('only reads from that directory', async () => {
      const childDir = path.join(tmpDir, 'child');
      await fs.mkdir(childDir);

      await fs.writeFile(
        path.join(tmpDir, '.packmindignore'),
        'root-pattern\n',
      );

      const result = await reader.readIgnorePatterns(tmpDir, tmpDir);
      expect(result).toEqual(['root-pattern']);
    });
  });
});
