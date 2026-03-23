import * as fs from 'fs/promises';

import {
  deleteFileOrDirectory,
  removeEmptyParentDirectories,
} from './fileOperations';

jest.mock('fs/promises');

describe('fileOperations', () => {
  beforeEach(() => {
    (fs.unlink as jest.Mock).mockResolvedValue(undefined);
    (fs.rm as jest.Mock).mockResolvedValue(undefined);
    (fs.readdir as jest.Mock).mockResolvedValue([]);
    (fs.rmdir as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deleteFileOrDirectory', () => {
    describe('when path is a file', () => {
      beforeEach(() => {
        (fs.stat as jest.Mock).mockResolvedValue({
          isDirectory: () => false,
          isFile: () => true,
        });
      });

      it('deletes the file and returns true', async () => {
        const result = await deleteFileOrDirectory('/test', 'some/file.md');

        expect(fs.unlink).toHaveBeenCalledWith('/test/some/file.md');
        expect(result).toBe(true);
      });
    });

    describe('when path is a directory', () => {
      beforeEach(() => {
        (fs.stat as jest.Mock).mockResolvedValue({
          isDirectory: () => true,
          isFile: () => false,
        });
      });

      it('removes the directory recursively and returns true', async () => {
        const result = await deleteFileOrDirectory('/test', 'some/dir');

        expect(fs.rm).toHaveBeenCalledWith('/test/some/dir', {
          recursive: true,
          force: true,
        });
        expect(result).toBe(true);
      });
    });

    describe('when path does not exist', () => {
      beforeEach(() => {
        (fs.stat as jest.Mock).mockRejectedValue(new Error('ENOENT'));
      });

      it('returns false without deleting anything', async () => {
        const result = await deleteFileOrDirectory('/test', 'nonexistent.md');

        expect(fs.unlink).not.toHaveBeenCalled();
        expect(fs.rm).not.toHaveBeenCalled();
        expect(result).toBe(false);
      });
    });
  });

  describe('removeEmptyParentDirectories', () => {
    describe('when parent directories are empty', () => {
      beforeEach(() => {
        (fs.readdir as jest.Mock).mockResolvedValue([]);
      });

      it('removes empty parents up to base directory', async () => {
        await removeEmptyParentDirectories(
          '/test/.claude/skills/old-skill/SKILL.md',
          '/test',
        );

        expect(fs.rmdir).toHaveBeenCalledWith('/test/.claude/skills/old-skill');
        expect(fs.rmdir).toHaveBeenCalledWith('/test/.claude/skills');
        expect(fs.rmdir).toHaveBeenCalledWith('/test/.claude');
      });

      it('does not remove the base directory', async () => {
        await removeEmptyParentDirectories('/test/file.md', '/test');

        expect(fs.rmdir).not.toHaveBeenCalledWith('/test');
      });
    });

    describe('when a parent directory is not empty', () => {
      beforeEach(() => {
        (fs.readdir as jest.Mock)
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce(['other-file']);
      });

      it('stops at the non-empty directory', async () => {
        await removeEmptyParentDirectories(
          '/test/.claude/skills/old-skill/SKILL.md',
          '/test',
        );

        expect(fs.rmdir).toHaveBeenCalledWith('/test/.claude/skills/old-skill');
        expect(fs.rmdir).not.toHaveBeenCalledWith('/test/.claude/skills');
      });
    });

    describe('when rmdir fails', () => {
      beforeEach(() => {
        (fs.readdir as jest.Mock).mockResolvedValue([]);
        (fs.rmdir as jest.Mock).mockRejectedValue(
          new Error('Permission denied'),
        );
      });

      it('stops without throwing', async () => {
        await expect(
          removeEmptyParentDirectories(
            '/test/.claude/skills/old-skill/SKILL.md',
            '/test',
          ),
        ).resolves.not.toThrow();
      });
    });
  });
});
