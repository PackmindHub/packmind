import * as fs from 'fs/promises';
import { LockFileRepository } from './LockFileRepository';
import { PackmindLockFile } from '../../domain/repositories/PackmindLockFile';
import * as consoleLogger from '../utils/consoleLogger';

jest.mock('fs/promises');
jest.mock('../utils/consoleLogger');

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
        packageSlugs: ['my-package'],
        agents: ['claude', 'packmind'],
        installedAt: '2026-01-01T00:00:00.000Z',
        cliVersion: '1.0.0',
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

    describe('when lock file has invalid content', () => {
      it.each([
        [
          'missing artifacts',
          '{"lockfileVersion":1,"packageSlugs":[],"agents":[],"installedAt":"2026-01-01","cliVersion":"1.0.0"}',
        ],
        [
          'artifacts is an array',
          '{"lockfileVersion":1,"packageSlugs":[],"agents":[],"installedAt":"2026-01-01","cliVersion":"1.0.0","artifacts":[]}',
        ],
        [
          'artifacts is a string',
          '{"lockfileVersion":1,"packageSlugs":[],"agents":[],"installedAt":"2026-01-01","cliVersion":"1.0.0","artifacts":"bad"}',
        ],
        [
          'missing packageSlugs',
          '{"lockfileVersion":1,"agents":[],"installedAt":"2026-01-01","cliVersion":"1.0.0","artifacts":{}}',
        ],
        [
          'missing cliVersion',
          '{"lockfileVersion":1,"packageSlugs":[],"agents":[],"installedAt":"2026-01-01","artifacts":{}}',
        ],
        [
          'missing installedAt',
          '{"lockfileVersion":1,"packageSlugs":[],"agents":[],"cliVersion":"1.0.0","artifacts":{}}',
        ],
        [
          'missing agents',
          '{"lockfileVersion":1,"packageSlugs":[],"installedAt":"2026-01-01","cliVersion":"1.0.0","artifacts":{}}',
        ],
        ['completely wrong shape', '{}'],
      ])('returns null when %s', async (_label, content) => {
        mockFs.readFile.mockResolvedValue(content);

        const result = await repository.read('/project');

        expect(result).toBeNull();
        expect(consoleLogger.logWarningConsole).toHaveBeenCalled();
      });

      describe('when targetId is not a string', () => {
        let result: PackmindLockFile | null;

        beforeEach(async () => {
          mockFs.readFile.mockResolvedValue(
            '{"lockfileVersion":1,"packageSlugs":[],"agents":[],"installedAt":"2026-01-01","cliVersion":"1.0.0","targetId":123,"artifacts":{}}',
          );

          result = await repository.read('/project');
        });

        it('returns null', () => {
          expect(result).toBeNull();
        });

        it('logs a warning', () => {
          expect(consoleLogger.logWarningConsole).toHaveBeenCalled();
        });
      });

      describe('when targetId is a valid string', () => {
        let result: PackmindLockFile | null;

        beforeEach(async () => {
          mockFs.readFile.mockResolvedValue(
            '{"lockfileVersion":1,"packageSlugs":[],"agents":[],"installedAt":"2026-01-01","cliVersion":"1.0.0","targetId":"target-abc","artifacts":{}}',
          );

          result = await repository.read('/project');
        });

        it('returns a non-null lock file', () => {
          expect(result).not.toBeNull();
        });

        it('includes the targetId', () => {
          expect(result?.targetId).toBe('target-abc');
        });
      });

      describe('when JSON is malformed', () => {
        let result: PackmindLockFile | null;

        beforeEach(async () => {
          mockFs.readFile.mockResolvedValue('not valid json {{{');

          result = await repository.read('/project');
        });

        it('returns null', () => {
          expect(result).toBeNull();
        });

        it('logs a warning', () => {
          expect(consoleLogger.logWarningConsole).toHaveBeenCalled();
        });
      });
    });
  });

  describe('write', () => {
    const lockFile: PackmindLockFile = {
      lockfileVersion: 1,
      packageSlugs: ['my-package'],
      agents: ['packmind'],
      installedAt: '2026-01-01T00:00:00.000Z',
      cliVersion: '1.0.0',
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

  describe('delete', () => {
    describe('when lock file exists', () => {
      beforeEach(async () => {
        mockFs.unlink.mockResolvedValue();

        await repository.delete('/project');
      });

      it('deletes packmind-lock.json in the base directory', () => {
        expect(mockFs.unlink).toHaveBeenCalledWith(
          '/project/packmind-lock.json',
        );
      });
    });

    describe('when lock file does not exist', () => {
      it('does not throw', async () => {
        mockFs.unlink.mockRejectedValue({ code: 'ENOENT' });

        await expect(repository.delete('/project')).resolves.not.toThrow();
      });
    });

    describe('when a non-ENOENT error occurs', () => {
      it('propagates the error', async () => {
        mockFs.unlink.mockRejectedValue(new Error('Permission denied'));

        await expect(repository.delete('/project')).rejects.toThrow(
          'Permission denied',
        );
      });
    });
  });

  describe('write with empty artifacts', () => {
    const lockFile: PackmindLockFile = {
      lockfileVersion: 1,
      packageSlugs: [],
      agents: [],
      installedAt: '2026-01-01T00:00:00.000Z',
      cliVersion: '1.0.0',
      artifacts: {},
    };

    beforeEach(async () => {
      mockFs.writeFile.mockResolvedValue();

      await repository.write('/project', lockFile);
    });

    it('preserves lockfileVersion', () => {
      const writtenContent = mockFs.writeFile.mock.calls[0][1] as string;
      const parsed = JSON.parse(writtenContent);

      expect(parsed.lockfileVersion).toBe(1);
    });

    it('preserves empty artifacts object', () => {
      const writtenContent = mockFs.writeFile.mock.calls[0][1] as string;
      const parsed = JSON.parse(writtenContent);

      expect(parsed.artifacts).toEqual({});
    });
  });
});
