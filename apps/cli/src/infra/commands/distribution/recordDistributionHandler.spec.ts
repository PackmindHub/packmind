import { PackmindLockFile } from '@packmind/types';
import {
  recordDistributionHandler,
  RecordDistributionHandlerDependencies,
} from './recordDistributionHandler';
import * as consoleLogger from '../../utils/consoleLogger';

jest.mock('../../utils/consoleLogger', () => ({
  ...jest.requireActual('../../utils/consoleLogger'),
  logConsole: jest.fn(),
  logErrorConsole: jest.fn(),
  logSuccessConsole: jest.fn(),
  logWarningConsole: jest.fn(),
}));

const REPO_ROOT = '/work/ops';

const lockListing = (version: string): PackmindLockFile => ({
  lockfileVersion: 2,
  packageSlugs: ['@team/ops'],
  packages: { '@team/ops': version },
  agents: ['claude'],
  artifacts: {},
});

const olderLock: PackmindLockFile = {
  lockfileVersion: 2,
  packageSlugs: ['@team/ops'],
  agents: ['claude'],
  artifacts: {},
};

describe('recordDistributionHandler', () => {
  let deps: RecordDistributionHandlerDependencies;
  let notify: jest.Mock;
  let locksByDirectory: Record<string, PackmindLockFile>;

  const run = (baseDirectory = REPO_ROOT) =>
    recordDistributionHandler({ ...deps, baseDirectory });

  const recordedPaths = () =>
    notify.mock.calls.map(([command]) => command.relativePath);

  beforeEach(() => {
    locksByDirectory = {};
    notify = jest.fn().mockResolvedValue({
      deploymentId: 'distribution-1',
      status: 'updated',
      warnings: [],
    });

    deps = {
      baseDirectory: REPO_ROOT,
      packmindCliHexa: {
        tryGetGitRepositoryRoot: jest.fn().mockResolvedValue(REPO_ROOT),
        getGitRemoteUrlFromPath: jest
          .fn()
          .mockReturnValue('https://github.com/acme/ops.git'),
        getCurrentBranch: jest.fn().mockReturnValue('main'),
        isDetachedHead: jest.fn().mockReturnValue(false),
        branchExists: jest.fn().mockReturnValue(true),
        getTrackedRepository: jest
          .fn()
          .mockResolvedValue({ gitRepo: { branch: 'main' } }),
        notifyArtefactsDistribution: notify,
        listFilesNamed: jest.fn((directory: string, fileName: string) =>
          Object.keys(locksByDirectory)
            .filter((lockDirectory) => lockDirectory.startsWith(directory))
            .map((lockDirectory) => `${lockDirectory}/${fileName}`),
        ),
      },
      lockFileRepository: {
        read: jest.fn(async (directory: string) => locksByDirectory[directory]),
      },
      configFileRepository: {
        readConfig: jest.fn().mockResolvedValue({
          packages: { '@team/ops': '1.3.0', '@team/ui': '*' },
        }),
      },
      exit: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when the root lock was edited by hand', () => {
    beforeEach(async () => {
      locksByDirectory = { [REPO_ROOT]: lockListing('1.3.0') };

      await run();
    });

    it('records the local lock on the root target', () => {
      expect(notify).toHaveBeenCalledWith({
        gitRemoteUrl: 'https://github.com/acme/ops.git',
        gitBranch: 'main',
        relativePath: '/',
        packmindLockFile: lockListing('1.3.0'),
        packageVersions: { '@team/ops': '1.3.0', '@team/ui': '*' },
      });
    });

    it('does not fail', () => {
      expect(deps.exit).not.toHaveBeenCalled();
    });
  });

  describe('when the repository has several locks', () => {
    beforeEach(() => {
      locksByDirectory = {
        [REPO_ROOT]: lockListing('1.3.0'),
        [`${REPO_ROOT}/app`]: lockListing('1.3.0'),
        [`${REPO_ROOT}/packages/ui`]: lockListing('1.3.0'),
      };
    });

    describe('when run at the root', () => {
      beforeEach(() => run());

      it('records every target', () => {
        expect(recordedPaths()).toEqual(['/', '/app/', '/packages/ui/']);
      });
    });

    describe('when run in a sub-folder', () => {
      beforeEach(() => run(`${REPO_ROOT}/app`));

      it('records only the targets at and below it', () => {
        expect(recordedPaths()).toEqual(['/app/']);
      });
    });
  });

  describe('when no lock records package versions', () => {
    beforeEach(async () => {
      locksByDirectory = { [REPO_ROOT]: olderLock };

      await run();
    });

    it('says the directory is not managed by Packmind', () => {
      expect(consoleLogger.logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining(
          'The current directory is not managed by Packmind',
        ),
      );
    });

    it('exits with an error', () => {
      expect(deps.exit).toHaveBeenCalledWith(1);
    });

    it('records nothing', () => {
      expect(notify).not.toHaveBeenCalled();
    });
  });

  describe('when the current branch is not the tracked one', () => {
    beforeEach(async () => {
      locksByDirectory = { [REPO_ROOT]: lockListing('1.3.0') };
      (deps.packmindCliHexa.getCurrentBranch as jest.Mock).mockReturnValue(
        'local-work',
      );

      await run();
    });

    it('says nothing is recorded because main is tracked', () => {
      expect(consoleLogger.logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining(
          "Nothing recorded: the tracked branch is 'main'",
        ),
      );
    });

    it('exits with an error', () => {
      expect(deps.exit).toHaveBeenCalledWith(1);
    });

    it('records nothing', () => {
      expect(notify).not.toHaveBeenCalled();
    });
  });

  describe('when a target is already up to date', () => {
    beforeEach(async () => {
      locksByDirectory = { [REPO_ROOT]: lockListing('1.3.0') };
      notify.mockResolvedValue({
        deploymentId: null,
        status: 'unchanged',
        warnings: [],
      });

      await run();
    });

    it('prints no line for it', () => {
      expect(consoleLogger.logConsole).not.toHaveBeenCalled();
    });
  });

  describe('when a lock lists a package unknown to the organization', () => {
    beforeEach(async () => {
      locksByDirectory = { [REPO_ROOT]: lockListing('1.3.0') };
      notify.mockResolvedValue({
        deploymentId: null,
        status: 'unchanged',
        warnings: [{ type: 'unknown_package', packageSlug: '@team/legacy' }],
      });

      await run();
    });

    it('warns about it', () => {
      expect(consoleLogger.logWarningConsole).toHaveBeenCalledWith(
        expect.stringContaining("'@team/legacy' is not a package"),
      );
    });
  });
});
