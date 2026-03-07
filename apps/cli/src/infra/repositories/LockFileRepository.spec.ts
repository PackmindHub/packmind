import * as fs from 'fs/promises';
import { LockFileRepository } from './LockFileRepository';
import { PackmindLockFile } from '../../domain/repositories/PackmindLockFile';

jest.mock('fs/promises');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('LockFileRepository', () => {
  let repository: LockFileRepository;

  beforeEach(() => {
    repository = new LockFileRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('read', () => {
    describe('when lock file exists', () => {
      const lockFileContent: PackmindLockFile = {
        lockfileVersion: 1,
        artifacts: {
          'my-standard': {
            name: 'My Standard',
            type: 'standard',
            id: 'std-123',
            version: 3,
            spaceId: 'space-1',
            files: [
              { path: '.packmind/standards/my-standard.md', agent: 'packmind' },
            ],
          },
          'my-command': {
            name: 'My Command',
            type: 'command',
            id: 'cmd-456',
            version: 1,
            spaceId: 'space-1',
            files: [
              { path: '.packmind/commands/my-command.md', agent: 'packmind' },
            ],
          },
          'my-skill': {
            name: 'My Skill',
            type: 'skill',
            id: 'skl-789',
            version: 2,
            spaceId: 'space-2',
            files: [
              { path: '.claude/skills/my-skill/main.md', agent: 'claude' },
            ],
          },
        },
      };

      let result: PackmindLockFile | null;

      beforeEach(async () => {
        mockFs.readFile.mockResolvedValue(JSON.stringify(lockFileContent));

        result = await repository.read('/project');
      });

      it('reads from packmind-lock.json in the base directory', () => {
        expect(mockFs.readFile).toHaveBeenCalledWith(
          '/project/packmind-lock.json',
          'utf-8',
        );
      });

      it('returns the parsed lock file', () => {
        expect(result).toEqual(lockFileContent);
      });
    });

    describe('when lock file does not exist', () => {
      let result: PackmindLockFile | null;

      beforeEach(async () => {
        mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });

        result = await repository.read('/project');
      });

      it('returns null', () => {
        expect(result).toBeNull();
      });
    });

    describe('when a non-ENOENT error occurs', () => {
      beforeEach(() => {
        mockFs.readFile.mockRejectedValue(new Error('Permission denied'));
      });

      it('propagates the error', async () => {
        await expect(repository.read('/project')).rejects.toThrow(
          'Permission denied',
        );
      });
    });
  });

  describe('write', () => {
    const lockFile: PackmindLockFile = {
      lockfileVersion: 1,
      artifacts: {
        'my-standard': {
          name: 'My Standard',
          type: 'standard',
          id: 'std-123',
          version: 3,
          spaceId: 'space-1',
          files: [
            { path: '.packmind/standards/my-standard.md', agent: 'packmind' },
          ],
        },
      },
    };

    beforeEach(async () => {
      mockFs.writeFile.mockResolvedValue();

      await repository.write('/project', lockFile);
    });

    it('writes to packmind-lock.json in the base directory', () => {
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/project/packmind-lock.json',
        expect.any(String),
        'utf-8',
      );
    });

    it('writes pretty-printed JSON with trailing newline', () => {
      const writtenContent = mockFs.writeFile.mock.calls[0][1] as string;
      const expectedContent = JSON.stringify(lockFile, null, 2) + '\n';

      expect(writtenContent).toBe(expectedContent);
    });

    it('writes content that can be parsed back to the original lock file', () => {
      const writtenContent = mockFs.writeFile.mock.calls[0][1] as string;
      const parsed = JSON.parse(writtenContent);

      expect(parsed).toEqual(lockFile);
    });
  });

  describe('write with empty artifacts', () => {
    const lockFile: PackmindLockFile = {
      lockfileVersion: 1,
      artifacts: {},
    };

    beforeEach(async () => {
      mockFs.writeFile.mockResolvedValue();

      await repository.write('/project', lockFile);
    });

    it('writes the lock file with empty artifacts object', () => {
      const writtenContent = mockFs.writeFile.mock.calls[0][1] as string;
      const parsed = JSON.parse(writtenContent);

      expect(parsed.lockfileVersion).toBe(1);
      expect(parsed.artifacts).toEqual({});
    });
  });
});
