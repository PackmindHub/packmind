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
        artifacts: {
          'standard:my-standard': {
            name: 'My Standard',
            type: 'standard',
            id: 'std-123',
            version: 3,
            spaceId: 'space-1',
            packageIds: ['pkg-1'],
            files: [
              { path: '.packmind/standards/my-standard.md', agent: 'packmind' },
            ],
          },
          'command:my-command': {
            name: 'My Command',
            type: 'command',
            id: 'cmd-456',
            version: 1,
            spaceId: 'space-1',
            packageIds: ['pkg-1', 'pkg-2'],
            files: [
              { path: '.packmind/commands/my-command.md', agent: 'packmind' },
            ],
          },
          'skill:my-skill': {
            name: 'My Skill',
            type: 'skill',
            id: 'skl-789',
            version: 2,
            spaceId: 'space-2',
            packageIds: [],
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
          '{"lockfileVersion":1,"packageSlugs":[],"agents":[],"installedAt":"2026-01-01"}',
        ],
        [
          'artifacts is an array',
          '{"lockfileVersion":1,"packageSlugs":[],"agents":[],"installedAt":"2026-01-01","artifacts":[]}',
        ],
        [
          'artifacts is a string',
          '{"lockfileVersion":1,"packageSlugs":[],"agents":[],"installedAt":"2026-01-01","artifacts":"bad"}',
        ],
        [
          'missing packageSlugs',
          '{"lockfileVersion":1,"agents":[],"installedAt":"2026-01-01","artifacts":{}}',
        ],
        [
          'missing agents',
          '{"lockfileVersion":1,"packageSlugs":[],"installedAt":"2026-01-01","artifacts":{}}',
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
            '{"lockfileVersion":1,"packageSlugs":[],"agents":[],"installedAt":"2026-01-01","targetId":123,"artifacts":{}}',
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
            '{"lockfileVersion":1,"packageSlugs":[],"agents":[],"installedAt":"2026-01-01","targetId":"target-abc","artifacts":{}}',
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
      cliVersion: '0.28.1-next',
      packageSlugs: ['my-package'],
      agents: ['claude', 'packmind'],
      installedAt: '2026-01-01T00:00:00.000Z',
      artifacts: {
        'standard:my-standard': {
          name: 'My Standard',
          type: 'standard',
          id: 'std-123',
          version: 3,
          spaceId: 'space-1',
          packageIds: ['pkg-1'],
          files: [
            { path: '.packmind/standards/my-standard.md', agent: 'packmind' },
          ],
        },
      },
    };

    describe('when writing succeeds', () => {
      beforeEach(async () => {
        mockFs.writeFile.mockResolvedValue(undefined);
        await repository.write('/project', lockFile);
      });

      it('writes to packmind-lock.json in the base directory', () => {
        expect(mockFs.writeFile).toHaveBeenCalledWith(
          '/project/packmind-lock.json',
          expect.any(String),
          'utf-8',
        );
      });

      it('serializes the lockfile as JSON with 2-space indentation and trailing newline', () => {
        const [[, content]] = mockFs.writeFile.mock.calls as unknown as [
          [string, string, string],
        ];
        expect(content).toBe(JSON.stringify(lockFile, null, 2) + '\n');
      });

      it('preserves the cliVersion verbatim (including -next suffix)', () => {
        const [[, content]] = mockFs.writeFile.mock.calls as unknown as [
          [string, string, string],
        ];
        const parsed = JSON.parse(content) as PackmindLockFile;
        expect(parsed.cliVersion).toBe('0.28.1-next');
      });
    });

    describe('round-trip with read()', () => {
      it('produces content that read() parses back into the same object', async () => {
        let written = '';
        mockFs.writeFile.mockImplementation(async (_path, content) => {
          written = content as string;
        });

        await repository.write('/project', lockFile);

        mockFs.readFile.mockResolvedValue(written);

        const roundTripped = await repository.read('/project');

        expect(roundTripped).toEqual(lockFile);
      });
    });

    describe('when the lock file already exists', () => {
      it('overwrites the existing file (single fs.writeFile call)', async () => {
        mockFs.writeFile.mockResolvedValue(undefined);

        await repository.write('/project', lockFile);
        await repository.write('/project', {
          ...lockFile,
          cliVersion: '0.29.0',
        });

        expect(mockFs.writeFile).toHaveBeenCalledTimes(2);
        expect(mockFs.writeFile).toHaveBeenNthCalledWith(
          2,
          '/project/packmind-lock.json',
          expect.stringContaining('"cliVersion": "0.29.0"'),
          'utf-8',
        );
      });
    });

    describe('when the target directory does not exist', () => {
      it('propagates the underlying fs error (does not swallow)', async () => {
        const err = Object.assign(new Error('ENOENT: no such directory'), {
          code: 'ENOENT',
        });
        mockFs.writeFile.mockRejectedValue(err);

        await expect(repository.write('/missing', lockFile)).rejects.toThrow(
          'ENOENT: no such directory',
        );
      });
    });
  });
});
