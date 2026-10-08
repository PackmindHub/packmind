import { SyncDistributionsFromLockFilesUseCase } from './SyncDistributionsFromLockFilesUseCase';
import {
  createDistributionId,
  createOrganizationId,
  createTargetId,
  createUserId,
  IAccountsPort,
  IGitPort,
  NoTrackedRepositoryError,
  PackmindLockFile,
  SyncDistributionsFromLockFilesCommand,
  SyncDistributionsFromLockFilesResponse,
  Target,
} from '@packmind/types';
import {
  createMockInstance,
  mockInterface,
  stubLogger,
} from '@packmind/test-utils';
import { gitRepoFactory } from '@packmind/git/test';
import { v4 as uuidv4 } from 'uuid';
import { TargetService } from '../../services/TargetService';
import { TargetResolutionService } from '../../services/TargetResolutionService';
import { LockFileDistributionRecorder } from '../../services/LockFileDistributionRecorder';
import { GitRepositoryNotFoundError } from '../../../domain/errors/GitRepositoryNotFoundError';

describe('SyncDistributionsFromLockFilesUseCase', () => {
  let useCase: SyncDistributionsFromLockFilesUseCase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockGitPort: jest.Mocked<IGitPort>;
  let mockTargetService: jest.Mocked<TargetService>;
  let mockTargetResolutionService: jest.Mocked<TargetResolutionService>;
  let mockRecorder: jest.Mocked<LockFileDistributionRecorder>;
  let repoFiles: Record<string, unknown>;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const gitRepo = gitRepoFactory({ isTracked: true, branch: 'main' });

  const rootTarget: Target = {
    id: createTargetId(uuidv4()),
    name: 'Default',
    path: '/',
    gitRepoId: gitRepo.id,
  };
  const frontendTarget: Target = {
    id: createTargetId(uuidv4()),
    name: 'app-frontend',
    path: '/app/frontend/',
    gitRepoId: gitRepo.id,
  };

  const lockWithPackages = (
    packages: Record<string, string>,
  ): PackmindLockFile => ({
    lockfileVersion: 2,
    packageSlugs: Object.keys(packages),
    packages,
    agents: ['claude'],
    artifacts: {},
  });

  const command: SyncDistributionsFromLockFilesCommand = {
    userId,
    organizationId,
    gitRepoId: gitRepo.id,
  };

  const recordedTargets = () =>
    mockRecorder.record.mock.calls.map(([call]) => call.target.path);

  beforeEach(() => {
    mockAccountsPort = mockInterface<IAccountsPort>();
    mockAccountsPort.getUserById.mockResolvedValue({
      id: userId,
      email: 'test@example.com',
      displayName: null,
      passwordHash: 'hash',
      active: true,
      memberships: [{ userId, organizationId, role: 'member' as const }],
    });
    mockAccountsPort.getOrganizationById.mockResolvedValue({
      id: organizationId,
      name: 'Test Organization',
      slug: 'test-org',
    });

    repoFiles = {};
    mockGitPort = mockInterface<IGitPort>();
    mockGitPort.getOrganizationRepositories.mockResolvedValue([gitRepo]);
    mockGitPort.getFileFromRepo.mockImplementation(async (_repo, path) =>
      path in repoFiles
        ? {
            sha: 'sha',
            content:
              typeof repoFiles[path] === 'string'
                ? (repoFiles[path] as string)
                : JSON.stringify(repoFiles[path]),
          }
        : null,
    );
    mockGitPort.listFilesNamedInRepo.mockImplementation(async (_repo, name) =>
      Object.keys(repoFiles).filter(
        (path) => path === name || path.endsWith(`/${name}`),
      ),
    );

    mockTargetService = createMockInstance(TargetService);
    mockTargetService.getTargetsByGitRepoId.mockResolvedValue([
      rootTarget,
      frontendTarget,
    ]);

    mockTargetResolutionService = createMockInstance(TargetResolutionService);
    mockTargetResolutionService.findOrCreateTarget.mockImplementation(
      async ({ gitRepoId, relativePath }) => ({
        id: createTargetId(uuidv4()),
        name: 'tools',
        path: relativePath,
        gitRepoId,
      }),
    );

    mockRecorder = createMockInstance(LockFileDistributionRecorder);
    mockRecorder.record.mockResolvedValue({
      deploymentId: createDistributionId(uuidv4()),
      status: 'updated',
      warnings: [],
    });

    useCase = new SyncDistributionsFromLockFilesUseCase(
      mockAccountsPort,
      mockGitPort,
      mockTargetService,
      mockTargetResolutionService,
      mockRecorder,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when the repository is not in the organization', () => {
    beforeEach(() => {
      mockGitPort.getOrganizationRepositories.mockResolvedValue([]);
    });

    it('throws GitRepositoryNotFoundError', async () => {
      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        GitRepositoryNotFoundError,
      );
    });
  });

  describe('when the repository has no tracked branch', () => {
    beforeEach(() => {
      mockGitPort.getOrganizationRepositories.mockResolvedValue([
        { ...gitRepo, isTracked: false },
      ]);
    });

    it('throws NoTrackedRepositoryError', async () => {
      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        NoTrackedRepositoryError,
      );
    });
  });

  describe('when given a branch of the repository that is not tracked', () => {
    const formerBranch = gitRepoFactory({
      owner: gitRepo.owner,
      repo: gitRepo.repo,
      providerId: gitRepo.providerId,
      branch: 'develop',
      isTracked: false,
    });

    beforeEach(async () => {
      mockGitPort.getOrganizationRepositories.mockResolvedValue([
        formerBranch,
        gitRepo,
      ]);

      await useCase.execute({ ...command, gitRepoId: formerBranch.id });
    });

    it('reads the targets of the tracked branch', () => {
      expect(mockTargetService.getTargetsByGitRepoId).toHaveBeenCalledWith(
        gitRepo.id,
      );
    });
  });

  describe('when every target has a lock', () => {
    let response: SyncDistributionsFromLockFilesResponse;

    beforeEach(async () => {
      repoFiles = {
        'packmind-lock.json': lockWithPackages({ '@space/ops': '1.3.0' }),
        'packmind.json': {
          packages: { '@space/ops': '1.3.0', '@space/ui': '*' },
        },
        'app/frontend/packmind-lock.json': lockWithPackages({
          '@space/ops': '1.2.3',
        }),
      };

      response = await useCase.execute(command);
    });

    it('records each target from its own lock', () => {
      expect(recordedTargets()).toEqual(['/', '/app/frontend/']);
    });

    it('records the root lock as an app sync on the tracked branch', () => {
      expect(mockRecorder.record).toHaveBeenCalledWith({
        target: rootTarget,
        lockFile: lockWithPackages({ '@space/ops': '1.3.0' }),
        organizationId,
        userId,
        source: 'app',
        branch: 'main',
        packageVersions: { '@space/ops': '1.3.0', '@space/ui': '*' },
      });
    });

    it('passes no package versions where packmind.json is missing', () => {
      expect(
        mockRecorder.record.mock.calls[1][0].packageVersions,
      ).toBeUndefined();
    });

    it('reports every target it synced', () => {
      expect(response.targets).toEqual([
        {
          targetId: rootTarget.id,
          path: '/',
          status: 'updated',
          warnings: [],
        },
        {
          targetId: frontendTarget.id,
          path: '/app/frontend/',
          status: 'updated',
          warnings: [],
        },
      ]);
    });
  });

  describe('when a target has no lock', () => {
    let response: SyncDistributionsFromLockFilesResponse;

    beforeEach(async () => {
      repoFiles = {
        'packmind-lock.json': lockWithPackages({ '@space/ops': '1.3.0' }),
      };

      response = await useCase.execute(command);
    });

    it('reports only the targets that have one', () => {
      expect(response.targets.map((target) => target.path)).toEqual(['/']);
    });
  });

  describe('when a lock sits in a folder with no target', () => {
    let response: SyncDistributionsFromLockFilesResponse;

    beforeEach(async () => {
      repoFiles = {
        'tools/packmind-lock.json': lockWithPackages({ '@space/ops': '1.3.0' }),
      };

      response = await useCase.execute(command);
    });

    it('creates the target for that folder', () => {
      expect(
        mockTargetResolutionService.findOrCreateTarget,
      ).toHaveBeenCalledWith({
        gitRepoId: gitRepo.id,
        relativePath: '/tools/',
      });
    });

    it('records the lock on the new target', () => {
      expect(recordedTargets()).toEqual(['/tools/']);
    });

    it('reports the new target', () => {
      expect(response.targets.map((target) => target.path)).toEqual([
        '/tools/',
      ]);
    });
  });

  describe('when a lock from an older CLI sits in a folder with no target', () => {
    let response: SyncDistributionsFromLockFilesResponse;

    beforeEach(async () => {
      repoFiles = {
        'tools/packmind-lock.json': {
          lockfileVersion: 2,
          packageSlugs: ['@space/ops'],
          agents: ['claude'],
          artifacts: {},
        },
      };

      response = await useCase.execute(command);
    });

    it('creates no target', () => {
      expect(
        mockTargetResolutionService.findOrCreateTarget,
      ).not.toHaveBeenCalled();
    });

    it('reports nothing', () => {
      expect(response.targets).toEqual([]);
    });
  });

  describe('when given target paths', () => {
    beforeEach(async () => {
      repoFiles = {
        'packmind-lock.json': lockWithPackages({ '@space/ops': '1.3.0' }),
        'app/frontend/packmind-lock.json': lockWithPackages({
          '@space/ops': '1.2.3',
        }),
      };

      await useCase.execute({ ...command, targetPaths: ['app/frontend'] });
    });

    it('does not scan the branch', () => {
      expect(mockGitPort.listFilesNamedInRepo).not.toHaveBeenCalled();
    });

    it('reads only the locks at those paths', () => {
      expect(recordedTargets()).toEqual(['/app/frontend/']);
    });
  });

  describe('when a lock was written by an older CLI', () => {
    let response: SyncDistributionsFromLockFilesResponse;

    beforeEach(async () => {
      repoFiles = {
        'packmind-lock.json': {
          lockfileVersion: 2,
          packageSlugs: ['@space/ops'],
          agents: ['claude'],
          artifacts: {},
        },
      };

      response = await useCase.execute(command);
    });

    it('leaves the target untouched', () => {
      expect(mockRecorder.record).not.toHaveBeenCalled();
    });

    it('warns that the lock comes from an older CLI', () => {
      expect(response.targets).toEqual([
        {
          targetId: rootTarget.id,
          path: '/',
          status: 'ignored',
          warnings: [{ type: 'lock_from_older_cli' }],
        },
      ]);
    });
  });

  describe('when a file named like the lock is not a distribution lock', () => {
    beforeEach(async () => {
      repoFiles = {
        'packmind-lock.json': { marketplace: 'acme', plugins: [] },
        'app/frontend/packmind-lock.json': '{ not json',
      };

      await useCase.execute(command);
    });

    it('skips it', () => {
      expect(mockRecorder.record).not.toHaveBeenCalled();
    });
  });
});
