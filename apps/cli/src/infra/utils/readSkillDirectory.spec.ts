import { readSkillDirectory } from './readSkillDirectory';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('readSkillDirectory', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('when reading basic files', () => {
    describe('when reading single file', () => {
      it('returns one file', async () => {
        await fs.writeFile(path.join(tempDir, 'SKILL.md'), 'content');

        const files = await readSkillDirectory(tempDir);

        expect(files).toHaveLength(1);
      });

      it('returns correct relative path', async () => {
        await fs.writeFile(path.join(tempDir, 'SKILL.md'), 'content');

        const files = await readSkillDirectory(tempDir);

        expect(files[0].relativePath).toBe('SKILL.md');
      });

      it('returns correct content', async () => {
        await fs.writeFile(path.join(tempDir, 'SKILL.md'), 'content');

        const files = await readSkillDirectory(tempDir);

        expect(files[0].content).toBe('content');
      });
    });

    describe('when reading multiple files', () => {
      it('returns two files', async () => {
        await fs.writeFile(path.join(tempDir, 'SKILL.md'), 'skill content');
        await fs.writeFile(path.join(tempDir, 'README.md'), 'readme content');

        const files = await readSkillDirectory(tempDir);

        expect(files).toHaveLength(2);
      });

      it('includes SKILL.md', async () => {
        await fs.writeFile(path.join(tempDir, 'SKILL.md'), 'skill content');
        await fs.writeFile(path.join(tempDir, 'README.md'), 'readme content');

        const files = await readSkillDirectory(tempDir);

        expect(files.find((f) => f.relativePath === 'SKILL.md')).toBeDefined();
      });

      it('includes README.md', async () => {
        await fs.writeFile(path.join(tempDir, 'SKILL.md'), 'skill content');
        await fs.writeFile(path.join(tempDir, 'README.md'), 'readme content');

        const files = await readSkillDirectory(tempDir);

        expect(files.find((f) => f.relativePath === 'README.md')).toBeDefined();
      });
    });

    describe('when reading nested files', () => {
      it('returns two files', async () => {
        await fs.mkdir(path.join(tempDir, 'subdir'), { recursive: true });
        await fs.writeFile(path.join(tempDir, 'SKILL.md'), 'root file');
        await fs.writeFile(
          path.join(tempDir, 'subdir', 'nested.md'),
          'nested file',
        );

        const files = await readSkillDirectory(tempDir);

        expect(files).toHaveLength(2);
      });

      it('includes root file', async () => {
        await fs.mkdir(path.join(tempDir, 'subdir'), { recursive: true });
        await fs.writeFile(path.join(tempDir, 'SKILL.md'), 'root file');
        await fs.writeFile(
          path.join(tempDir, 'subdir', 'nested.md'),
          'nested file',
        );

        const files = await readSkillDirectory(tempDir);

        expect(files.find((f) => f.relativePath === 'SKILL.md')).toBeDefined();
      });

      it('includes nested file', async () => {
        await fs.mkdir(path.join(tempDir, 'subdir'), { recursive: true });
        await fs.writeFile(path.join(tempDir, 'SKILL.md'), 'root file');
        await fs.writeFile(
          path.join(tempDir, 'subdir', 'nested.md'),
          'nested file',
        );

        const files = await readSkillDirectory(tempDir);

        expect(
          files.find((f) => f.relativePath === 'subdir/nested.md'),
        ).toBeDefined();
      });
    });
  });

  describe('when normalizing paths', () => {
    it('uses forward slashes for nested paths', async () => {
      await fs.mkdir(path.join(tempDir, 'subdir'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'subdir', 'file.md'), 'content');

      const files = await readSkillDirectory(tempDir);
      const file = files.find((f) => f.relativePath.includes('file.md'));

      expect(file?.relativePath).toBe('subdir/file.md');
    });

    it('does not contain backslashes for nested paths', async () => {
      await fs.mkdir(path.join(tempDir, 'subdir'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'subdir', 'file.md'), 'content');

      const files = await readSkillDirectory(tempDir);
      const file = files.find((f) => f.relativePath.includes('file.md'));

      expect(file?.relativePath).not.toContain('\\');
    });

    it('uses forward slashes for deeply nested paths', async () => {
      await fs.mkdir(path.join(tempDir, 'dir1', 'dir2', 'dir3'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(tempDir, 'dir1', 'dir2', 'dir3', 'deep.md'),
        'content',
      );

      const files = await readSkillDirectory(tempDir);
      const file = files.find((f) => f.relativePath.includes('deep.md'));

      expect(file?.relativePath).toBe('dir1/dir2/dir3/deep.md');
    });

    it('does not contain backslashes for deeply nested paths', async () => {
      await fs.mkdir(path.join(tempDir, 'dir1', 'dir2', 'dir3'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(tempDir, 'dir1', 'dir2', 'dir3', 'deep.md'),
        'content',
      );

      const files = await readSkillDirectory(tempDir);
      const file = files.find((f) => f.relativePath.includes('deep.md'));

      expect(file?.relativePath).not.toContain('\\');
    });

    it('returns simple filename for root file', async () => {
      await fs.writeFile(path.join(tempDir, 'SKILL.md'), 'content');

      const files = await readSkillDirectory(tempDir);
      const file = files.find((f) => f.relativePath === 'SKILL.md');

      expect(file?.relativePath).toBe('SKILL.md');
    });

    it('does not have leading forward slash for root file', async () => {
      await fs.writeFile(path.join(tempDir, 'SKILL.md'), 'content');

      const files = await readSkillDirectory(tempDir);
      const file = files.find((f) => f.relativePath === 'SKILL.md');

      expect(file?.relativePath.startsWith('/')).toBe(false);
    });

    it('does not have leading backslash for root file', async () => {
      await fs.writeFile(path.join(tempDir, 'SKILL.md'), 'content');

      const files = await readSkillDirectory(tempDir);
      const file = files.find((f) => f.relativePath === 'SKILL.md');

      expect(file?.relativePath.startsWith('\\')).toBe(false);
    });
  });

  describe('when normalizing line endings', () => {
    it('converts CRLF to LF', async () => {
      await fs.writeFile(path.join(tempDir, 'test.md'), 'line1\r\nline2\r\n');

      const files = await readSkillDirectory(tempDir);
      const file = files[0];

      expect(file.content).toBe('line1\nline2\n');
    });

    it('removes carriage returns from CRLF', async () => {
      await fs.writeFile(path.join(tempDir, 'test.md'), 'line1\r\nline2\r\n');

      const files = await readSkillDirectory(tempDir);
      const file = files[0];

      expect(file.content).not.toContain('\r');
    });

    it('converts CR to LF', async () => {
      await fs.writeFile(path.join(tempDir, 'test.md'), 'line1\rline2\r');

      const files = await readSkillDirectory(tempDir);
      const file = files[0];

      expect(file.content).toBe('line1\nline2\n');
    });

    it('removes carriage returns from CR', async () => {
      await fs.writeFile(path.join(tempDir, 'test.md'), 'line1\rline2\r');

      const files = await readSkillDirectory(tempDir);
      const file = files[0];

      expect(file.content).not.toContain('\r');
    });

    it('converts mixed line endings to LF', async () => {
      await fs.writeFile(
        path.join(tempDir, 'test.md'),
        'line1\r\nline2\rline3\n',
      );

      const files = await readSkillDirectory(tempDir);
      const file = files[0];

      expect(file.content).toBe('line1\nline2\nline3\n');
    });

    it('removes all carriage returns from mixed line endings', async () => {
      await fs.writeFile(
        path.join(tempDir, 'test.md'),
        'line1\r\nline2\rline3\n',
      );

      const files = await readSkillDirectory(tempDir);
      const file = files[0];

      expect(file.content).not.toContain('\r');
    });

    it('preserves LF line endings', async () => {
      await fs.writeFile(path.join(tempDir, 'test.md'), 'line1\nline2\n');

      const files = await readSkillDirectory(tempDir);
      const file = files[0];

      expect(file.content).toBe('line1\nline2\n');
    });

    it('preserves empty file content', async () => {
      await fs.writeFile(path.join(tempDir, 'empty.md'), '');

      const files = await readSkillDirectory(tempDir);
      const file = files[0];

      expect(file.content).toBe('');
    });

    it('sets size to zero for empty files', async () => {
      await fs.writeFile(path.join(tempDir, 'empty.md'), '');

      const files = await readSkillDirectory(tempDir);
      const file = files[0];

      expect(file.size).toBe(0);
    });

    it('preserves single line without newline', async () => {
      await fs.writeFile(path.join(tempDir, 'test.md'), 'single line');

      const files = await readSkillDirectory(tempDir);
      const file = files[0];

      expect(file.content).toBe('single line');
    });
  });

  describe('when calculating file size', () => {
    it('calculates size correctly after normalization', async () => {
      // CRLF takes 2 bytes per line ending
      await fs.writeFile(path.join(tempDir, 'test.md'), 'line1\r\nline2\r\n');

      const files = await readSkillDirectory(tempDir);
      const file = files[0];

      // After normalization: "line1\nline2\n" = 12 bytes
      expect(file.size).toBe(Buffer.byteLength('line1\nline2\n', 'utf-8'));
    });

    it('preserves UTF-8 content', async () => {
      const content = 'Hello 世界\n';
      await fs.writeFile(path.join(tempDir, 'utf8.md'), content);

      const files = await readSkillDirectory(tempDir);
      const file = files[0];

      expect(file.content).toBe(content);
    });

    it('calculates UTF-8 size correctly', async () => {
      const content = 'Hello 世界\n';
      await fs.writeFile(path.join(tempDir, 'utf8.md'), content);

      const files = await readSkillDirectory(tempDir);
      const file = files[0];

      expect(file.size).toBe(Buffer.byteLength(content, 'utf-8'));
    });
  });

  describe('when reading file metadata', () => {
    it('includes full path', async () => {
      await fs.writeFile(path.join(tempDir, 'SKILL.md'), 'content');

      const files = await readSkillDirectory(tempDir);
      const file = files[0];

      expect(file.path).toBe(path.join(tempDir, 'SKILL.md'));
    });

    it('sets default permissions', async () => {
      await fs.writeFile(path.join(tempDir, 'test.md'), 'content');

      const files = await readSkillDirectory(tempDir);
      const file = files[0];

      expect(file.permissions).toBe('rw-r--r--');
    });
  });
});
