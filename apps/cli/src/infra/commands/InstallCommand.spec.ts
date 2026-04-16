import * as fs from 'fs';

jest.mock('cmd-ts', () => ({
  command: jest.fn(),
  option: jest.fn(),
  restPositionals: jest.fn(),
  flag: jest.fn(),
  string: 'string',
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  statSync: jest.fn(),
  readdirSync: jest.fn().mockReturnValue([]),
}));

jest.mock('../../PackmindCliHexa', () => ({
  PackmindCliHexa: jest.fn(),
}));

jest.mock('../utils/consoleLogger', () => ({
  logConsole: jest.fn(),
  logErrorConsole: jest.fn(),
  logWarningConsole: jest.fn(),
}));

jest.mock('@packmind/logger', () => ({
  PackmindLogger: jest.fn().mockImplementation(() => ({})),
  LogLevel: { INFO: 'INFO' },
}));

import * as path from 'path';
import { installHandler } from './InstallCommand';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import * as consoleLogger from '../utils/consoleLogger';
import { IInstallResult } from '../../domain/useCases/IInstallUseCase';

function makeDirent(name: string, isDir = true): fs.Dirent {
  return {
    name,
    isDirectory: () => isDir,
    isFile: () => !isDir,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    path: '',
    parentPath: '',
  } as fs.Dirent;
}

const mockFs = fs as jest.Mocked<typeof fs>;
const mockConsoleLogger = consoleLogger as jest.Mocked<typeof consoleLogger>;
const MockPackmindCliHexa = PackmindCliHexa as jest.MockedClass<
  typeof PackmindCliHexa
>;

const makeResult = (
  overrides: Partial<IInstallResult> = {},
): IInstallResult => ({
  standardsCount: 0,
  commandsCount: 0,
  skillsCount: 0,
  recipesCount: 0,
  contentFilesChanged: 0,
  missingAccess: [],
  joinSpaceUrl: undefined,
  errors: [],
  ...overrides,
});

const handler = installHandler;

describe('installCommand', () => {
  let processExitSpy: jest.SpyInstance;
  let mockInstall: jest.Mock;
  let mockTryGetGitRepositoryRoot: jest.Mock;
  let mockInstallDefaultSkills: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    processExitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    mockInstall = jest.fn().mockResolvedValue(makeResult());
    mockTryGetGitRepositoryRoot = jest.fn().mockResolvedValue(null);
    mockInstallDefaultSkills = jest.fn().mockResolvedValue({
      filesCreated: 0,
      filesUpdated: 0,
      errors: [],
      skippedSkillsCount: 0,
      skippedIncompatibleSkillNames: [],
      incompatibleInstalledSkills: [],
    });
    MockPackmindCliHexa.mockImplementation(
      () =>
        ({
          install: mockInstall,
          tryGetGitRepositoryRoot: mockTryGetGitRepositoryRoot,
          installDefaultSkills: mockInstallDefaultSkills,
        }) as unknown as PackmindCliHexa,
    );
  });

  describe('--path validation', () => {
    describe('when the path does not exist', () => {
      beforeEach(async () => {
        mockFs.existsSync.mockReturnValue(false);
        await handler({
          installPath: 'non/existing',
          packages: [],
          list: false,
          show: '',
          status: false,
        });
      });

      it('logs an error message', () => {
        expect(mockConsoleLogger.logErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('Path does not exist:'),
        );
      });

      it('exits with code 1', () => {
        expect(processExitSpy).toHaveBeenCalledWith(1);
      });

      it('does not call install', () => {
        expect(mockInstall).not.toHaveBeenCalled();
      });
    });

    describe('when the path points to a file, not a directory', () => {
      beforeEach(async () => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.statSync.mockReturnValue({
          isDirectory: () => false,
        } as fs.Stats);
        await handler({
          installPath: '.claude/commands/my-command.md',
          packages: [],
          list: false,
          show: '',
          status: false,
        });
      });

      it('logs an error message', () => {
        expect(mockConsoleLogger.logErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('Path is not a directory:'),
        );
      });

      it('exits with code 1', () => {
        expect(processExitSpy).toHaveBeenCalledWith(1);
      });

      it('does not call install', () => {
        expect(mockInstall).not.toHaveBeenCalled();
      });
    });

    describe('when the path is a valid directory', () => {
      beforeEach(async () => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.statSync.mockReturnValue({
          isDirectory: () => true,
        } as fs.Stats);
        await handler({
          installPath: 'apps/frontend',
          packages: [],
          list: false,
          show: '',
          status: false,
        });
      });

      it('does not exit', () => {
        expect(processExitSpy).not.toHaveBeenCalled();
      });

      it('calls install with the resolved directory', () => {
        expect(mockInstall).toHaveBeenCalledWith(
          expect.objectContaining({
            baseDirectory: expect.stringContaining('apps/frontend'),
          }),
        );
      });
    });

    describe('when no path is provided', () => {
      beforeEach(async () => {
        mockFs.existsSync.mockReturnValue(false);
        await handler({
          installPath: '',
          packages: [],
          list: false,
          show: '',
          status: false,
        });
      });

      it('skips directory-existence validation', () => {
        expect(mockFs.statSync).not.toHaveBeenCalled();
      });

      it('calls install with process.cwd()', () => {
        expect(mockInstall).toHaveBeenCalledWith(
          expect.objectContaining({ baseDirectory: process.cwd() }),
        );
      });
    });
  });

  describe('install result handling', () => {
    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as fs.Stats);
    });

    describe('when there are missing access packages', () => {
      beforeEach(async () => {
        mockInstall.mockResolvedValue(
          makeResult({
            missingAccess: ['@my-space/pkg-a'],
            contentFilesChanged: 1,
          }),
        );
        await handler({
          installPath: 'apps/frontend',
          packages: [],
          list: false,
          show: '',
          status: false,
        });
      });

      it('logs a warning with the package name', () => {
        expect(mockConsoleLogger.logWarningConsole).toHaveBeenCalledWith(
          expect.stringContaining('@my-space/pkg-a'),
        );
      });
    });

    describe('when install throws', () => {
      beforeEach(async () => {
        mockInstall.mockRejectedValue(new Error('network failure'));
        await handler({
          installPath: 'apps/frontend',
          packages: [],
          list: false,
          show: '',
          status: false,
        });
      });

      it('logs the error message', () => {
        expect(mockConsoleLogger.logErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('network failure'),
        );
      });

      it('exits with code 1', () => {
        expect(processExitSpy).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('multi-directory discovery', () => {
    describe('without --path: runs on root and recursive sub-directories with packmind.json', () => {
      const subDir1 = path.join(process.cwd(), 'apps', 'frontend');
      const subDir2 = path.join(process.cwd(), 'packages', 'core');

      beforeEach(async () => {
        // Root has packmind.json
        mockFs.existsSync.mockImplementation((p) => {
          const asStr = String(p);
          return (
            asStr === path.join(process.cwd(), 'packmind.json') ||
            asStr === path.join(subDir1, 'packmind.json') ||
            asStr === path.join(subDir2, 'packmind.json')
          );
        });
        // readdirSync returns entries for root and sub-dirs
        mockFs.readdirSync.mockImplementation((dirPath) => {
          const asStr = String(dirPath);
          if (asStr === process.cwd()) {
            return [
              makeDirent('apps'),
              makeDirent('packages'),
            ] as unknown as string[];
          }
          if (asStr === path.join(process.cwd(), 'apps')) {
            return [makeDirent('frontend')] as unknown as string[];
          }
          if (asStr === path.join(process.cwd(), 'packages')) {
            return [makeDirent('core')] as unknown as string[];
          }
          return [] as unknown as string[];
        });
        await handler({
          installPath: '',
          packages: [],
          list: false,
          show: '',
          status: false,
        });
      });

      it('calls install for the root directory', () => {
        expect(mockInstall).toHaveBeenCalledWith(
          expect.objectContaining({ baseDirectory: process.cwd() }),
        );
      });

      it('calls install for the first sub-directory with packmind.json', () => {
        expect(mockInstall).toHaveBeenCalledWith(
          expect.objectContaining({ baseDirectory: subDir1 }),
        );
      });

      it('calls install for the second sub-directory with packmind.json', () => {
        expect(mockInstall).toHaveBeenCalledWith(
          expect.objectContaining({ baseDirectory: subDir2 }),
        );
      });

      it('calls install exactly three times', () => {
        expect(mockInstall).toHaveBeenCalledTimes(3);
      });
    });

    describe('with explicit packages: runs only on cwd', () => {
      const subDir1 = path.join(process.cwd(), 'apps', 'frontend');
      const subDir2 = path.join(process.cwd(), 'packages', 'core');

      beforeEach(async () => {
        mockFs.existsSync.mockImplementation((p) => {
          const asStr = String(p);
          return (
            asStr === path.join(process.cwd(), 'packmind.json') ||
            asStr === path.join(subDir1, 'packmind.json') ||
            asStr === path.join(subDir2, 'packmind.json')
          );
        });
        mockFs.readdirSync.mockImplementation((dirPath) => {
          const asStr = String(dirPath);
          if (asStr === process.cwd()) {
            return [
              makeDirent('apps'),
              makeDirent('packages'),
            ] as unknown as string[];
          }
          if (asStr === path.join(process.cwd(), 'apps')) {
            return [makeDirent('frontend')] as unknown as string[];
          }
          if (asStr === path.join(process.cwd(), 'packages')) {
            return [makeDirent('core')] as unknown as string[];
          }
          return [] as unknown as string[];
        });
        await handler({
          installPath: '',
          packages: ['@public-space/public', '@global/global'],
          list: false,
          show: '',
          status: false,
        });
      });

      it('calls install only for the cwd', () => {
        expect(mockInstall).toHaveBeenCalledWith(
          expect.objectContaining({ baseDirectory: process.cwd() }),
        );
      });

      it('does not call install for the first sub-directory', () => {
        expect(mockInstall).not.toHaveBeenCalledWith(
          expect.objectContaining({ baseDirectory: subDir1 }),
        );
      });

      it('does not call install for the second sub-directory', () => {
        expect(mockInstall).not.toHaveBeenCalledWith(
          expect.objectContaining({ baseDirectory: subDir2 }),
        );
      });

      it('calls install exactly once', () => {
        expect(mockInstall).toHaveBeenCalledTimes(1);
      });

      it('passes the packages to install', () => {
        expect(mockInstall).toHaveBeenCalledWith(
          expect.objectContaining({
            packages: ['@public-space/public', '@global/global'],
          }),
        );
      });
    });

    describe('with --path: runs only on direct sub-directories (non-recursive)', () => {
      const appsDir = path.resolve(process.cwd(), 'apps');
      const frontendDir = path.join(appsDir, 'frontend');
      const backendDir = path.join(appsDir, 'backend');

      beforeEach(async () => {
        mockFs.existsSync.mockImplementation((p) => {
          const asStr = String(p);
          // apps/ directory exists (for path validation)
          if (asStr === appsDir) return true;
          return (
            asStr === path.join(frontendDir, 'packmind.json') ||
            asStr === path.join(backendDir, 'packmind.json')
          );
        });
        mockFs.statSync.mockReturnValue({
          isDirectory: () => true,
        } as fs.Stats);
        // Non-recursive: only reads apps/ directly
        mockFs.readdirSync.mockReturnValue([
          makeDirent('frontend'),
          makeDirent('backend'),
          makeDirent('shared'),
        ] as unknown as string[]);
        await handler({
          installPath: 'apps',
          packages: [],
          list: false,
          show: '',
          status: false,
        });
      });

      it('calls install for the frontend sub-directory', () => {
        expect(mockInstall).toHaveBeenCalledWith(
          expect.objectContaining({ baseDirectory: frontendDir }),
        );
      });

      it('calls install for the backend sub-directory', () => {
        expect(mockInstall).toHaveBeenCalledWith(
          expect.objectContaining({ baseDirectory: backendDir }),
        );
      });

      it('does not call install for sub-directories without packmind.json', () => {
        expect(mockInstall).not.toHaveBeenCalledWith(
          expect.objectContaining({
            baseDirectory: path.join(appsDir, 'shared'),
          }),
        );
      });

      it('calls install exactly twice', () => {
        expect(mockInstall).toHaveBeenCalledTimes(2);
      });
    });

    describe('when one sub-directory install fails, continues with others and exits with 1', () => {
      const appsDir = path.resolve(process.cwd(), 'apps');
      const frontendDir = path.join(appsDir, 'frontend');
      const backendDir = path.join(appsDir, 'backend');

      beforeEach(async () => {
        mockFs.existsSync.mockImplementation((p) => {
          const asStr = String(p);
          if (asStr === appsDir) return true;
          return (
            asStr === path.join(frontendDir, 'packmind.json') ||
            asStr === path.join(backendDir, 'packmind.json')
          );
        });
        mockFs.statSync.mockReturnValue({
          isDirectory: () => true,
        } as fs.Stats);
        mockFs.readdirSync.mockReturnValue([
          makeDirent('frontend'),
          makeDirent('backend'),
        ] as unknown as string[]);
        mockInstall.mockImplementation((cmd: { baseDirectory: string }) => {
          if (cmd.baseDirectory === frontendDir) {
            return Promise.reject(new Error('network failure'));
          }
          return Promise.resolve(makeResult({ standardsCount: 2 }));
        });
        await handler({
          installPath: 'apps',
          packages: [],
          list: false,
          show: '',
          status: false,
        });
      });

      it('still calls install for the remaining directory', () => {
        expect(mockInstall).toHaveBeenCalledWith(
          expect.objectContaining({ baseDirectory: backendDir }),
        );
      });

      it('reports the error', () => {
        expect(mockConsoleLogger.logErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('network failure'),
        );
      });

      it('exits with code 1', () => {
        expect(processExitSpy).toHaveBeenCalledWith(1);
      });

      it('shows the combined install summary', () => {
        expect(mockConsoleLogger.logConsole).toHaveBeenCalledWith(
          expect.stringContaining('2 standards'),
        );
      });
    });
  });

  describe('default skills auto-install', () => {
    const gitRoot = process.cwd();

    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([]);
    });

    describe('when cwd is the git root', () => {
      beforeEach(async () => {
        mockTryGetGitRepositoryRoot.mockResolvedValue(gitRoot);
        await handler({
          installPath: '',
          packages: [],
          list: false,
          show: '',
          status: false,
        });
      });

      it('calls installDefaultSkills', () => {
        expect(mockInstallDefaultSkills).toHaveBeenCalledWith(
          expect.objectContaining({ baseDirectory: gitRoot }),
        );
      });
    });

    describe('when cwd is not the git root', () => {
      beforeEach(async () => {
        mockTryGetGitRepositoryRoot.mockResolvedValue('/some/other/root');
        await handler({
          installPath: '',
          packages: [],
          list: false,
          show: '',
          status: false,
        });
      });

      it('does not call installDefaultSkills', () => {
        expect(mockInstallDefaultSkills).not.toHaveBeenCalled();
      });
    });

    describe('when not in a git repository', () => {
      beforeEach(async () => {
        mockTryGetGitRepositoryRoot.mockResolvedValue(null);
        await handler({
          installPath: '',
          packages: [],
          list: false,
          show: '',
          status: false,
        });
      });

      it('does not call installDefaultSkills', () => {
        expect(mockInstallDefaultSkills).not.toHaveBeenCalled();
      });
    });

    describe('when installDefaultSkills returns new files', () => {
      beforeEach(async () => {
        mockTryGetGitRepositoryRoot.mockResolvedValue(gitRoot);
        mockInstallDefaultSkills.mockResolvedValue({
          filesCreated: 3,
          filesUpdated: 1,
          errors: [],
          skippedSkillsCount: 0,
          skippedIncompatibleSkillNames: [],
          incompatibleInstalledSkills: [],
        });
        await handler({
          installPath: '',
          packages: [],
          list: false,
          show: '',
          status: false,
        });
      });

      it('logs the file counts', () => {
        expect(mockConsoleLogger.logConsole).toHaveBeenCalledWith(
          expect.stringContaining('added 3 files'),
        );
      });
    });

    describe('when installDefaultSkills throws', () => {
      beforeEach(async () => {
        mockTryGetGitRepositoryRoot.mockResolvedValue(gitRoot);
        mockInstallDefaultSkills.mockRejectedValue(new Error('skills failed'));
        await handler({
          installPath: '',
          packages: [],
          list: false,
          show: '',
          status: false,
        });
      });

      it('does not exit with error', () => {
        expect(processExitSpy).not.toHaveBeenCalled();
      });
    });
  });
});
