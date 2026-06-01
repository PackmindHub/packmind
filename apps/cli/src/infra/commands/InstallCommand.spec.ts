import * as fs from 'fs';

jest.mock('cmd-ts', () => ({
  command: jest.fn(),
  option: jest.fn(),
  restPositionals: jest.fn(),
  flag: jest.fn(),
  string: 'string',
  optional: jest.fn((t) => t),
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
  logInfoConsole: jest.fn(),
  logWarningConsole: jest.fn(),
  formatCommand: jest.fn((cmd: string) => cmd),
}));

jest.mock('./skills/incompatibleSkillsHandler', () => ({
  handleIncompatibleInstalledSkillsSilently: jest.fn(),
}));

jest.mock('@packmind/logger', () => ({
  PackmindLogger: jest.fn().mockImplementation(() => ({})),
  LogLevel: { INFO: 'INFO' },
}));

jest.mock('../utils/agentHomeDirectory', () => ({
  isAgentHomeDirectory: jest.fn().mockReturnValue(null),
  getAgentHomeDirPrefix: jest.fn().mockReturnValue(null),
}));

jest.mock('./bootstrapInstallContext', () => ({
  bootstrapInstallContext: jest.fn().mockResolvedValue({
    configReady: true,
    warned: false,
    configCreated: false,
    packagesAdded: [],
  }),
}));

jest.mock('../repositories/ConfigFileRepository', () => ({
  ConfigFileRepository: jest.fn().mockImplementation(() => ({
    readConfig: jest.fn().mockResolvedValue({
      packages: {},
      agents: ['claude'],
    }),
  })),
}));

jest.mock('../../application/services/AgentArtifactDetectionService', () => ({
  AgentArtifactDetectionService: jest.fn().mockImplementation(() => ({})),
}));

import * as path from 'path';
import { installHandler, mergeInstallResults } from './InstallCommand';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import * as consoleLogger from '../utils/consoleLogger';
import * as incompatibleSkillsHandler from './skills/incompatibleSkillsHandler';
import { IInstallResult } from '../../domain/useCases/IInstallUseCase';
import { ConfigFileRepository } from '../repositories/ConfigFileRepository';
import { bootstrapInstallContext } from './bootstrapInstallContext';
import { isAgentHomeDirectory } from '../utils/agentHomeDirectory';
import { parsePackageSlug } from '../../domain/entities/PackageSlug';

const mockBootstrap = bootstrapInstallContext as jest.MockedFunction<
  typeof bootstrapInstallContext
>;

const MockedConfigFileRepository = ConfigFileRepository as unknown as jest.Mock;

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
const mockIncompatibleSkillsHandler = incompatibleSkillsHandler as jest.Mocked<
  typeof incompatibleSkillsHandler
>;
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
  configCreated: false,
  packagesAdded: [],
  sourceArtifacts: {
    skillsCount: 0,
    standardsCount: 0,
    commandsCount: 0,
    recipesCount: 0,
  },
  resolvedAgents: [],
  ...overrides,
});

const handler = installHandler;

describe('installCommand', () => {
  let processExitSpy: jest.SpyInstance;
  let mockInstall: jest.Mock;
  let mockTryGetGitRepositoryRoot: jest.Mock;
  let mockInstallDefaultSkills: jest.Mock;
  let mockEnsureCliVersion: jest.Mock;

  beforeEach(() => {
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
    mockEnsureCliVersion = jest.fn().mockResolvedValue({ kind: 'no-lockfile' });
    MockPackmindCliHexa.mockImplementation(
      () =>
        ({
          install: mockInstall,
          tryGetGitRepositoryRoot: mockTryGetGitRepositoryRoot,
          installDefaultSkills: mockInstallDefaultSkills,
          getPackmindGateway: jest.fn().mockReturnValue({}),
          ensureCliVersion: mockEnsureCliVersion,
        }) as unknown as PackmindCliHexa,
    );
  });
  afterEach(() => jest.clearAllMocks());

  describe('--path validation', () => {
    describe('when the path does not exist', () => {
      beforeEach(async () => {
        mockFs.existsSync.mockReturnValue(false);
        await handler({
          installPath: 'non/existing',
          packages: [],
          list: false,
          show: undefined,
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
          show: undefined,
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
      const appsDir = path.resolve(process.cwd(), 'apps/frontend');
      const subProject = path.join(appsDir, 'sub-project');

      beforeEach(async () => {
        mockFs.statSync.mockReturnValue({
          isDirectory: () => true,
        } as fs.Stats);
        mockFs.existsSync.mockImplementation((p) => {
          const s = String(p);
          return s === appsDir || s === path.join(subProject, 'packmind.json');
        });
        mockFs.readdirSync.mockReturnValue([
          makeDirent('sub-project'),
        ] as unknown as string[]);
        await handler({
          installPath: 'apps/frontend',
          packages: [],
          list: false,
          show: undefined,
          status: false,
        });
      });

      afterEach(() => {
        mockFs.readdirSync.mockReturnValue([]);
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
        const cwdPackmindJson = path.join(process.cwd(), 'packmind.json');
        mockFs.existsSync.mockImplementation(
          (p) => String(p) === cwdPackmindJson,
        );
        mockFs.readdirSync.mockReturnValue([]);
        await handler({
          installPath: '',
          packages: [],
          list: false,
          show: undefined,
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
      mockFs.readdirSync.mockReturnValue([
        makeDirent('sub-project'),
      ] as unknown as string[]);
    });

    afterEach(() => {
      mockFs.readdirSync.mockReturnValue([]);
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
          show: undefined,
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
          show: undefined,
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
          show: undefined,
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
          packages: ['@public-space/public', '@global/global'].map(
            parsePackageSlug,
          ),
          list: false,
          show: undefined,
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
            packages: ['@public-space/public', '@global/global'].map(
              parsePackageSlug,
            ),
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
          show: undefined,
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
          return Promise.resolve(
            makeResult({ standardsCount: 2, standardsChanged: 2 }),
          );
        });
        await handler({
          installPath: 'apps',
          packages: [],
          list: false,
          show: undefined,
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

  describe('installHandler output', () => {
    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([]);
    });

    describe('when the capability warning and summary line are emitted', () => {
      let warningIndex: number;
      let summaryIndex: number;

      beforeEach(async () => {
        mockInstall.mockResolvedValue(
          makeResult({
            configCreated: true,
            packagesAdded: ['@testing/cli-e2e'],
            resolvedAgents: ['agents_md', 'packmind'],
            sourceArtifacts: {
              skillsCount: 3,
              standardsCount: 0,
              commandsCount: 0,
              recipesCount: 0,
            },
          }),
        );

        await handler({
          installPath: '',
          packages: ['@testing/cli-e2e'].map(parsePackageSlug),
          list: false,
          show: undefined,
          status: false,
          skipInstalledAt: false,
        });

        warningIndex = mockConsoleLogger.logWarningConsole.mock.calls.findIndex(
          ([msg]) => msg.includes('could not be rendered'),
        );
        summaryIndex = mockConsoleLogger.logConsole.mock.calls.findIndex(
          ([msg]) => msg.includes('Created packmind.json'),
        );
      });

      it('emits the capability warning', () => {
        expect(warningIndex).toBeGreaterThanOrEqual(0);
      });

      it('emits the summary line', () => {
        expect(summaryIndex).toBeGreaterThanOrEqual(0);
      });

      it('emits the capability warning before the summary line', () => {
        const warningOrder =
          mockConsoleLogger.logWarningConsole.mock.invocationCallOrder[
            warningIndex
          ];
        const summaryOrder =
          mockConsoleLogger.logConsole.mock.invocationCallOrder[summaryIndex];
        expect(warningOrder).toBeLessThan(summaryOrder);
      });
    });

    describe('when packages were added', () => {
      beforeEach(async () => {
        mockInstall.mockResolvedValue(
          makeResult({
            configCreated: true,
            packagesAdded: ['@testing/cli-e2e'],
          }),
        );

        await handler({
          installPath: '',
          packages: ['@testing/cli-e2e'].map(parsePackageSlug),
          list: false,
          show: undefined,
          status: false,
          skipInstalledAt: false,
        });
      });

      it('never emits "Nothing to install"', () => {
        const allLogged = [
          ...mockConsoleLogger.logConsole.mock.calls,
          ...mockConsoleLogger.logWarningConsole.mock.calls,
        ]
          .map(([msg]) => msg)
          .join('\n');
        expect(allLogged).not.toContain('Nothing to install');
      });
    });

    describe("when bootstrap pre-populated packmind.json (Cedric's scenario)", () => {
      beforeEach(async () => {
        // Bootstrap auto-detected agents and wrote packmind.json with the
        // CLI-supplied package — so install use case sees no diff.
        mockBootstrap.mockResolvedValueOnce({
          configReady: true,
          warned: false,
          configCreated: true,
          packagesAdded: ['@testing/cli-e2e'],
        });
        mockInstall.mockResolvedValue(
          makeResult({
            configCreated: false,
            packagesAdded: [],
          }),
        );

        await handler({
          installPath: '',
          packages: ['@testing/cli-e2e'].map(parsePackageSlug),
          list: false,
          show: undefined,
          status: false,
          skipInstalledAt: false,
        });
      });

      it('does not emit a misleading "Already up to date" summary', () => {
        const allLogged = mockConsoleLogger.logConsole.mock.calls
          .map(([msg]) => msg)
          .join('\n');
        expect(allLogged).not.toContain('Already up to date');
      });

      it('reports that packmind.json was created', () => {
        const allLogged = mockConsoleLogger.logConsole.mock.calls
          .map(([msg]) => msg)
          .join('\n');
        expect(allLogged).toContain('Created packmind.json');
      });

      it('lists the package as added', () => {
        const allLogged = mockConsoleLogger.logConsole.mock.calls
          .map(([msg]) => msg)
          .join('\n');
        expect(allLogged).toContain('@testing/cli-e2e');
      });
    });

    describe('when bootstrap and install each add a different package', () => {
      let allLogged: string;

      beforeEach(async () => {
        mockBootstrap.mockResolvedValueOnce({
          configReady: true,
          warned: false,
          configCreated: true,
          packagesAdded: ['@a/x'],
        });
        mockInstall.mockResolvedValue(
          makeResult({
            configCreated: false,
            packagesAdded: ['@b/y'],
          }),
        );

        await handler({
          installPath: '',
          packages: ['@a/x', '@b/y'].map(parsePackageSlug),
          list: false,
          show: undefined,
          status: false,
          skipInstalledAt: false,
        });

        allLogged = mockConsoleLogger.logConsole.mock.calls
          .map(([msg]) => msg)
          .join('\n');
      });

      it('includes the bootstrap-added package in the summary', () => {
        expect(allLogged).toContain('@a/x');
      });

      it('includes the install-added package in the summary', () => {
        expect(allLogged).toContain('@b/y');
      });
    });

    describe('when bootstrap and install report the same package', () => {
      let summaryLog: string;

      beforeEach(async () => {
        mockBootstrap.mockResolvedValueOnce({
          configReady: true,
          warned: false,
          configCreated: true,
          packagesAdded: ['@a/x'],
        });
        mockInstall.mockResolvedValue(
          makeResult({
            configCreated: false,
            packagesAdded: ['@a/x'],
          }),
        );

        await handler({
          installPath: '',
          packages: ['@a/x'].map(parsePackageSlug),
          list: false,
          show: undefined,
          status: false,
          skipInstalledAt: false,
        });

        summaryLog = mockConsoleLogger.logConsole.mock.calls
          .map(([msg]) => msg)
          .join('\n');
      });

      it('lists the package exactly once in the summary', () => {
        const matches = summaryLog.match(/@a\/x/g) ?? [];
        expect(matches).toHaveLength(1);
      });
    });
  });

  describe('default skills auto-install', () => {
    const gitRoot = process.cwd();

    beforeEach(() => {
      mockFs.existsSync.mockImplementation((p) =>
        String(p).endsWith('packmind.json'),
      );
      mockFs.readdirSync.mockReturnValue([]);
    });

    describe('when cwd is the git root', () => {
      beforeEach(async () => {
        mockTryGetGitRepositoryRoot.mockResolvedValue(gitRoot);
        await handler({
          installPath: '',
          packages: [],
          list: false,
          show: undefined,
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
          show: undefined,
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
          show: undefined,
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
          show: undefined,
          status: false,
        });
      });

      it('logs the file counts', () => {
        expect(mockConsoleLogger.logConsole).toHaveBeenCalledWith(
          expect.stringContaining('added 3 files'),
        );
      });
    });

    describe('when installDefaultSkills is a no-op (already up to date)', () => {
      beforeEach(async () => {
        mockTryGetGitRepositoryRoot.mockResolvedValue(gitRoot);
        mockInstallDefaultSkills.mockResolvedValue({
          filesCreated: 0,
          filesUpdated: 0,
          errors: [],
          skippedSkillsCount: 0,
          skippedIncompatibleSkillNames: [],
          incompatibleInstalledSkills: [],
        });
        await handler({
          installPath: '',
          packages: [],
          list: false,
          show: undefined,
          status: false,
        });
      });

      it('does not announce "Installing default skills..."', () => {
        const allLogged = mockConsoleLogger.logConsole.mock.calls
          .map(([msg]) => msg)
          .join('\n');
        expect(allLogged).not.toContain('Installing default skills');
      });

      it('does not print "Default skills are already up to date"', () => {
        const allLogged = mockConsoleLogger.logConsole.mock.calls
          .map(([msg]) => msg)
          .join('\n');
        expect(allLogged).not.toContain(
          'Default skills are already up to date',
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
          show: undefined,
          status: false,
        });
      });

      it('does not exit with error', () => {
        expect(processExitSpy).not.toHaveBeenCalled();
      });
    });

    describe('when installDefaultSkills is slow to resolve', () => {
      let installDefaultSkillsResolved: boolean;
      let handlerReturned: boolean;
      let resolveInstallDefaultSkills: (value: unknown) => void;

      beforeEach(async () => {
        installDefaultSkillsResolved = false;
        handlerReturned = false;
        mockTryGetGitRepositoryRoot.mockResolvedValue(gitRoot);
        mockInstallDefaultSkills.mockImplementation(
          () =>
            new Promise((resolve) => {
              resolveInstallDefaultSkills = (value: unknown) => {
                installDefaultSkillsResolved = true;
                resolve(value);
              };
            }),
        );

        const handlerPromise = handler({
          installPath: '',
          packages: [],
          list: false,
          show: undefined,
          status: false,
        }).then(() => {
          handlerReturned = true;
        });

        // Drain the microtask queue so any non-awaited fire-and-forget call
        // would have already resolved the handler. If the handler is properly
        // awaiting installDefaultSkills, it should still be pending here.
        await new Promise((r) => setImmediate(r));
        await new Promise((r) => setImmediate(r));

        // At this point installDefaultSkills has been invoked but is still
        // pending. If the handler were not awaiting it, handlerReturned would
        // already be true.
        expect(installDefaultSkillsResolved).toBe(false);
        expect(handlerReturned).toBe(false);

        resolveInstallDefaultSkills({
          filesCreated: 0,
          filesUpdated: 0,
          errors: [],
          skippedSkillsCount: 0,
          skippedIncompatibleSkillNames: [],
          incompatibleInstalledSkills: [],
        });
        await handlerPromise;
      });

      it('resolves installDefaultSkills before returning', () => {
        // The two flags must be set in this order: skills first, then handler.
        // If the handler ran fire-and-forget, handlerReturned would be true
        // before installDefaultSkillsResolved.
        expect(installDefaultSkillsResolved).toBe(true);
      });

      it('returns only after installDefaultSkills resolves (no mid-flight return)', () => {
        expect(handlerReturned).toBe(true);
      });
    });

    describe('on a fast-following second invocation', () => {
      beforeEach(async () => {
        mockTryGetGitRepositoryRoot.mockResolvedValue(gitRoot);
        // First invocation installs default skills.
        mockInstallDefaultSkills.mockResolvedValueOnce({
          filesCreated: 5,
          filesUpdated: 0,
          errors: [],
          skippedSkillsCount: 0,
          skippedIncompatibleSkillNames: [],
          incompatibleInstalledSkills: [],
        });
        // Second invocation: lockfile already merged, no new files.
        mockInstallDefaultSkills.mockResolvedValueOnce({
          filesCreated: 0,
          filesUpdated: 0,
          errors: [],
          skippedSkillsCount: 0,
          skippedIncompatibleSkillNames: [],
          incompatibleInstalledSkills: [],
        });

        await handler({
          installPath: '',
          packages: [],
          list: false,
          show: undefined,
          status: false,
        });

        await handler({
          installPath: '',
          packages: [],
          list: false,
          show: undefined,
          status: false,
        });
      });

      it('invokes installDefaultSkills on both invocations (lockfile merge is awaited each time)', () => {
        expect(mockInstallDefaultSkills).toHaveBeenCalledTimes(2);
      });
    });

    describe('when no configured agent supports skills', () => {
      beforeEach(async () => {
        MockedConfigFileRepository.mockImplementationOnce(() => ({
          readConfig: jest.fn().mockResolvedValue({
            packages: {},
            agents: ['agents_md'],
          }),
        }));
        mockTryGetGitRepositoryRoot.mockResolvedValue(gitRoot);
        await handler({
          installPath: '',
          packages: [],
          list: false,
          show: undefined,
          status: false,
        });
      });

      it('does not call installDefaultSkills', () => {
        expect(mockInstallDefaultSkills).not.toHaveBeenCalled();
      });

      it('logs a warning explaining that configured agents do not support skills', () => {
        expect(mockConsoleLogger.logWarningConsole).toHaveBeenCalledWith(
          expect.stringContaining('do not support skills'),
        );
      });

      it('includes the actionable hint pointing to packmind-cli config agents', () => {
        expect(mockConsoleLogger.logWarningConsole).toHaveBeenCalledWith(
          expect.stringContaining('packmind-cli config agents'),
        );
      });

      it('lists the offending configured agent in the warning', () => {
        expect(mockConsoleLogger.logWarningConsole).toHaveBeenCalledWith(
          expect.stringContaining('agents_md'),
        );
      });
    });

    describe('when readConfig returns null', () => {
      beforeEach(async () => {
        MockedConfigFileRepository.mockImplementationOnce(() => ({
          readConfig: jest.fn().mockResolvedValue(null),
        }));
        mockTryGetGitRepositoryRoot.mockResolvedValue(gitRoot);
        await handler({
          installPath: '',
          packages: [],
          list: false,
          show: undefined,
          status: false,
        });
      });

      it('does not call installDefaultSkills', () => {
        expect(mockInstallDefaultSkills).not.toHaveBeenCalled();
      });

      it('warns that no agents are configured', () => {
        expect(mockConsoleLogger.logWarningConsole).toHaveBeenCalledWith(
          expect.stringContaining('no coding agents are configured'),
        );
      });
    });

    describe('when configured agents are mixed and include a capable one', () => {
      beforeEach(async () => {
        MockedConfigFileRepository.mockImplementationOnce(() => ({
          readConfig: jest.fn().mockResolvedValue({
            packages: {},
            agents: ['agents_md', 'claude'],
          }),
        }));
        mockTryGetGitRepositoryRoot.mockResolvedValue(gitRoot);
        await handler({
          installPath: '',
          packages: [],
          list: false,
          show: undefined,
          status: false,
        });
      });

      it('still calls installDefaultSkills', () => {
        expect(mockInstallDefaultSkills).toHaveBeenCalled();
      });

      it('does not log the no-capable-agent warning', () => {
        expect(mockConsoleLogger.logWarningConsole).not.toHaveBeenCalledWith(
          expect.stringContaining('do not support skills'),
        );
      });
    });

    // The install use case returns `resolvedAgents` — the list the server
    // actually used to render packages (after merging packmind.json's
    // `agents` with the organisation-level fallback). The default-skills
    // step must drive its capability check from THAT list, not from a
    // second read of `config.agents`, otherwise we get the contradictory
    // "Synced N artifact" + "no coding agents are configured" output.
    describe('when the install returns server-resolved agents', () => {
      describe('and those agents do not support skills', () => {
        beforeEach(async () => {
          // packmind.json has `agents: []` — the local config carries no
          // agent. The server resolved to the org default ['agents_md']
          // and rendered packages for it. The capability check must use
          // the server's list, not the empty config list.
          MockedConfigFileRepository.mockImplementationOnce(() => ({
            readConfig: jest.fn().mockResolvedValue({
              packages: { 'space/pkg': '*' },
              agents: [],
            }),
          }));
          mockInstall.mockResolvedValue(
            makeResult({
              resolvedAgents: ['agents_md'],
              sourceArtifacts: {
                skillsCount: 0,
                standardsCount: 1,
                commandsCount: 0,
                recipesCount: 0,
              },
            }),
          );
          mockTryGetGitRepositoryRoot.mockResolvedValue(gitRoot);
          await handler({
            installPath: '',
            packages: [],
            list: false,
            show: undefined,
            status: false,
          });
        });

        it('does not log the "no coding agents are configured" warning', () => {
          expect(mockConsoleLogger.logWarningConsole).not.toHaveBeenCalledWith(
            expect.stringContaining('no coding agents are configured'),
          );
        });

        it('logs the specific "do not support skills" warning naming the resolved agent', () => {
          expect(mockConsoleLogger.logWarningConsole).toHaveBeenCalledWith(
            expect.stringContaining('agents_md'),
          );
        });
      });

      describe('and those agents support skills', () => {
        beforeEach(async () => {
          MockedConfigFileRepository.mockImplementationOnce(() => ({
            readConfig: jest.fn().mockResolvedValue({
              packages: { 'space/pkg': '*' },
              agents: [],
            }),
          }));
          mockInstall.mockResolvedValue(
            makeResult({ resolvedAgents: ['claude'] }),
          );
          mockTryGetGitRepositoryRoot.mockResolvedValue(gitRoot);
          await handler({
            installPath: '',
            packages: [],
            list: false,
            show: undefined,
            status: false,
          });
        });

        it('forwards the resolved agents to installDefaultSkills', () => {
          expect(mockInstallDefaultSkills).toHaveBeenCalledWith(
            expect.objectContaining({ agents: ['claude'] }),
          );
        });
      });
    });
  });

  describe('CLI version drift detection (ensureCliVersion)', () => {
    beforeEach(() => {
      const cwdPackmindJson = path.join(process.cwd(), 'packmind.json');
      mockFs.existsSync.mockImplementation(
        (p) => String(p) === cwdPackmindJson,
      );
      mockFs.readdirSync.mockReturnValue([]);
    });

    describe('when install runs', () => {
      beforeEach(async () => {
        await handler({
          installPath: '',
          packages: [],
          list: false,
          show: undefined,
          status: false,
        });
      });

      it('calls ensureCliVersion exactly once', () => {
        expect(mockEnsureCliVersion).toHaveBeenCalledTimes(1);
      });

      it('calls ensureCliVersion with the running CLI version', () => {
        expect(mockEnsureCliVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            baseDirectory: process.cwd(),
            currentCliVersion: expect.any(String),
            includeBeta: false,
          }),
        );
      });
    });

    describe('when ensureCliVersion returns "older"', () => {
      let driftWarnings: string[];

      beforeEach(async () => {
        mockEnsureCliVersion.mockResolvedValue({
          kind: 'older',
          lockVersion: '99.0.0',
        });

        await handler({
          installPath: '',
          packages: [],
          list: false,
          show: undefined,
          status: false,
        });

        const warnings = mockConsoleLogger.logWarningConsole.mock.calls.map(
          ([msg]) => msg,
        );
        driftWarnings = warnings.filter((msg) =>
          msg.includes('older than the version recorded in packmind-lock.json'),
        );
      });

      it('emits exactly one drift warning', () => {
        expect(driftWarnings).toHaveLength(1);
      });

      it('includes the lock version in the warning', () => {
        expect(driftWarnings[0]).toContain('99.0.0');
      });
    });

    describe('when ensureCliVersion returns "newer"', () => {
      beforeEach(async () => {
        mockEnsureCliVersion.mockResolvedValue({
          kind: 'newer',
          lockVersion: '0.0.1',
          upgraded: true,
        });

        await handler({
          installPath: '',
          packages: [],
          list: false,
          show: undefined,
          status: false,
        });
      });

      it('emits an info line about CLI upgrade detected', () => {
        expect(mockConsoleLogger.logInfoConsole).toHaveBeenCalledWith(
          expect.stringContaining('CLI upgrade detected'),
        );
      });
    });

    describe('when ensureCliVersion returns "match"', () => {
      beforeEach(async () => {
        mockEnsureCliVersion.mockResolvedValue({ kind: 'match' });

        await handler({
          installPath: '',
          packages: [],
          list: false,
          show: undefined,
          status: false,
        });
      });

      it('emits no drift-related warning', () => {
        const warnings = mockConsoleLogger.logWarningConsole.mock.calls
          .map(([msg]) => msg)
          .filter((msg) => msg.includes('older than the version recorded'));
        expect(warnings).toHaveLength(0);
      });

      it('emits no CLI upgrade info', () => {
        const upgradeInfos = mockConsoleLogger.logInfoConsole.mock.calls
          .map(([msg]) => msg)
          .filter((msg) => msg.includes('CLI upgrade detected'));
        expect(upgradeInfos).toHaveLength(0);
      });
    });

    describe('when ensureCliVersion returns "no-lockfile"', () => {
      beforeEach(async () => {
        mockEnsureCliVersion.mockResolvedValue({ kind: 'no-lockfile' });

        await handler({
          installPath: '',
          packages: [],
          list: false,
          show: undefined,
          status: false,
        });
      });

      it('emits no drift-related warning', () => {
        const warnings = mockConsoleLogger.logWarningConsole.mock.calls
          .map(([msg]) => msg)
          .filter((msg) => msg.includes('older than the version recorded'));
        expect(warnings).toHaveLength(0);
      });

      it('emits no CLI upgrade info', () => {
        const upgradeInfos = mockConsoleLogger.logInfoConsole.mock.calls
          .map(([msg]) => msg)
          .filter((msg) => msg.includes('CLI upgrade detected'));
        expect(upgradeInfos).toHaveLength(0);
      });
    });

    describe('when ensureCliVersion returns "no-cli-version-recorded"', () => {
      beforeEach(async () => {
        mockEnsureCliVersion.mockResolvedValue({
          kind: 'no-cli-version-recorded',
        });

        await handler({
          installPath: '',
          packages: [],
          list: false,
          show: undefined,
          status: false,
        });
      });

      it('emits no drift-related warning', () => {
        const warnings = mockConsoleLogger.logWarningConsole.mock.calls
          .map(([msg]) => msg)
          .filter((msg) => msg.includes('older than the version recorded'));
        expect(warnings).toHaveLength(0);
      });

      it('emits no CLI upgrade info', () => {
        const upgradeInfos = mockConsoleLogger.logInfoConsole.mock.calls
          .map(([msg]) => msg)
          .filter((msg) => msg.includes('CLI upgrade detected'));
        expect(upgradeInfos).toHaveLength(0);
      });
    });

    describe('when ensureCliVersion throws', () => {
      beforeEach(async () => {
        mockEnsureCliVersion.mockRejectedValue(new Error('boom'));

        await handler({
          installPath: '',
          packages: [],
          list: false,
          show: undefined,
          status: false,
        });
      });

      it('continues installing', () => {
        expect(mockInstall).toHaveBeenCalled();
      });

      it('does not exit with error', () => {
        expect(processExitSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('silent cleanup of obsolete default skills', () => {
    const gitRoot = process.cwd();

    beforeEach(() => {
      const cwdPackmindJson = path.join(process.cwd(), 'packmind.json');
      mockFs.existsSync.mockImplementation(
        (p) => String(p) === cwdPackmindJson,
      );
      mockFs.readdirSync.mockReturnValue([]);
      mockTryGetGitRepositoryRoot.mockResolvedValue(gitRoot);
    });

    describe('when default-skills reports obsolete skills', () => {
      beforeEach(async () => {
        const incompatibleInstalledSkills = [
          {
            skillName: 'obsolete-skill',
            filePaths: ['.packmind/skills/obsolete-skill.md'],
          },
        ];
        mockInstallDefaultSkills.mockResolvedValue({
          filesCreated: 0,
          filesUpdated: 0,
          errors: [],
          skippedSkillsCount: 0,
          skippedIncompatibleSkillNames: [],
          incompatibleInstalledSkills,
        });

        await handler({
          installPath: '',
          packages: [],
          list: false,
          show: undefined,
          status: false,
        });
      });

      it('invokes the silent cleanup helper', () => {
        expect(
          mockIncompatibleSkillsHandler.handleIncompatibleInstalledSkillsSilently,
        ).toHaveBeenCalledWith(
          [
            {
              skillName: 'obsolete-skill',
              filePaths: ['.packmind/skills/obsolete-skill.md'],
            },
          ],
          gitRoot,
        );
      });
    });

    describe('when no obsolete skills are reported', () => {
      beforeEach(async () => {
        mockInstallDefaultSkills.mockResolvedValue({
          filesCreated: 0,
          filesUpdated: 0,
          errors: [],
          skippedSkillsCount: 0,
          skippedIncompatibleSkillNames: [],
          incompatibleInstalledSkills: [],
        });

        await handler({
          installPath: '',
          packages: [],
          list: false,
          show: undefined,
          status: false,
        });
      });

      it('does not invoke the silent cleanup helper', () => {
        expect(
          mockIncompatibleSkillsHandler.handleIncompatibleInstalledSkillsSilently,
        ).not.toHaveBeenCalled();
      });
    });
  });

  describe('cliVersion propagation', () => {
    it('forwards the running CLI version to the install use case', async () => {
      const cwdPackmindJson = path.join(process.cwd(), 'packmind.json');
      mockFs.existsSync.mockImplementation(
        (p) => String(p) === cwdPackmindJson,
      );
      mockFs.readdirSync.mockReturnValue([]);

      await handler({
        installPath: '',
        packages: [],
        list: false,
        show: undefined,
        status: false,
      });

      expect(mockInstall).toHaveBeenCalledWith(
        expect.objectContaining({ cliVersion: expect.any(String) }),
      );
    });
  });

  describe('when cwd is an agent home directory', () => {
    const mockIsAgentHomeDirectory =
      isAgentHomeDirectory as jest.MockedFunction<typeof isAgentHomeDirectory>;

    beforeEach(() => {
      mockFs.existsSync.mockImplementation((p) =>
        String(p).endsWith('packmind.json'),
      );
      mockFs.readdirSync.mockReturnValue([]);
      mockIsAgentHomeDirectory.mockReturnValue('claude');
      mockTryGetGitRepositoryRoot.mockResolvedValue(process.cwd());
    });

    afterEach(() => {
      mockIsAgentHomeDirectory.mockReturnValue(null);
    });

    it('passes homeAgent through to install', async () => {
      await handler({
        installPath: '',
        packages: [],
        list: false,
        show: undefined,
        status: false,
      });

      expect(mockInstall).toHaveBeenCalledWith(
        expect.objectContaining({ homeAgent: 'claude' }),
      );
    });

    it('passes homeAgent through to bootstrap', async () => {
      await handler({
        installPath: '',
        packages: [],
        list: false,
        show: undefined,
        status: false,
      });

      expect(mockBootstrap).toHaveBeenCalledWith(
        expect.objectContaining({ homeAgent: 'claude' }),
      );
    });

    describe('when in a git repo', () => {
      let mockNotifyArtefactsDistribution: jest.Mock;

      beforeEach(async () => {
        mockNotifyArtefactsDistribution = jest.fn();
        const mockGetGitRemoteUrlFromPath = jest.fn().mockReturnValue('url');
        const mockGetCurrentBranch = jest.fn().mockReturnValue('main');
        MockPackmindCliHexa.mockImplementation(
          () =>
            ({
              install: mockInstall,
              tryGetGitRepositoryRoot: mockTryGetGitRepositoryRoot,
              installDefaultSkills: mockInstallDefaultSkills,
              getPackmindGateway: jest.fn().mockReturnValue({}),
              ensureCliVersion: mockEnsureCliVersion,
              notifyArtefactsDistribution: mockNotifyArtefactsDistribution,
              getGitRemoteUrlFromPath: mockGetGitRemoteUrlFromPath,
              getCurrentBranch: mockGetCurrentBranch,
            }) as unknown as PackmindCliHexa,
        );

        await handler({
          installPath: '',
          packages: [],
          list: false,
          show: undefined,
          status: false,
        });
      });

      it('does not notify distribution', () => {
        expect(mockNotifyArtefactsDistribution).not.toHaveBeenCalled();
      });
    });

    describe('when cwd looks like a git root', () => {
      beforeEach(async () => {
        await handler({
          installPath: '',
          packages: [],
          list: false,
          show: undefined,
          status: false,
        });
      });

      it('does not call installDefaultSkills', () => {
        expect(mockInstallDefaultSkills).not.toHaveBeenCalled();
      });
    });
  });
});

describe('mergeInstallResults', () => {
  it('ORs configCreated across results', () => {
    const merged = mergeInstallResults([
      makeResult({ configCreated: false }),
      makeResult({ configCreated: true }),
    ]);
    expect(merged.configCreated).toBe(true);
  });

  it('deduplicates packagesAdded across results', () => {
    const merged = mergeInstallResults([
      makeResult({ packagesAdded: ['@a/x'] }),
      makeResult({ packagesAdded: ['@a/x', '@b/y'] }),
    ]);
    expect(merged.packagesAdded).toEqual(['@a/x', '@b/y']);
  });

  it('sums sourceArtifacts counts across results', () => {
    const merged = mergeInstallResults([
      makeResult({
        sourceArtifacts: {
          skillsCount: 1,
          standardsCount: 2,
          commandsCount: 0,
          recipesCount: 0,
        },
      }),
      makeResult({
        sourceArtifacts: {
          skillsCount: 3,
          standardsCount: 0,
          commandsCount: 1,
          recipesCount: 0,
        },
      }),
    ]);
    expect(merged.sourceArtifacts).toEqual({
      skillsCount: 4,
      standardsCount: 2,
      commandsCount: 1,
      recipesCount: 0,
    });
  });

  it('unions resolvedAgents across results (deduplicated)', () => {
    const merged = mergeInstallResults([
      makeResult({ resolvedAgents: ['claude'] }),
      makeResult({ resolvedAgents: ['claude', 'cursor'] }),
    ]);
    expect(merged.resolvedAgents).toEqual(['claude', 'cursor']);
  });
});
