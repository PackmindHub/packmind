import { NotifyArtefactsDistributionUseCase } from './NotifyArtefactsDistributionUseCase';
import {
  createDistributionId,
  createGitRepoId,
  createOrganizationId,
  createTargetId,
  createUserId,
  IAccountsPort,
  NotifyArtefactsDistributionCommand,
  NotifyArtefactsDistributionResponse,
  PackmindLockFile,
  Target,
} from '@packmind/types';
import {
  createMockInstance,
  mockInterface,
  stubLogger,
} from '@packmind/test-utils';
import { v4 as uuidv4 } from 'uuid';
import { TargetResolutionService } from '../../services/TargetResolutionService';
import { LockFileDistributionRecorder } from '../../services/LockFileDistributionRecorder';

describe('NotifyArtefactsDistributionUseCase', () => {
  let useCase: NotifyArtefactsDistributionUseCase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockTargetResolutionService: jest.Mocked<TargetResolutionService>;
  let mockRecorder: jest.Mocked<LockFileDistributionRecorder>;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const distributionId = createDistributionId(uuidv4());
  const target: Target = {
    id: createTargetId(uuidv4()),
    name: 'Default',
    path: '/',
    gitRepoId: createGitRepoId(uuidv4()),
  };
  const lockFile: PackmindLockFile = {
    lockfileVersion: 2,
    packageSlugs: ['@my-space/ops'],
    packages: { '@my-space/ops': '1.3.0' },
    agents: ['claude'],
    artifacts: {},
  };

  const command: NotifyArtefactsDistributionCommand = {
    userId,
    organizationId,
    gitRemoteUrl: 'https://github.com/acme/ops.git',
    gitBranch: 'main',
    relativePath: '/',
    packmindLockFile: lockFile,
    packageVersions: { '@my-space/ops': '1.3.0', '@my-space/ui': '*' },
  };

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

    mockTargetResolutionService = createMockInstance(TargetResolutionService);
    mockTargetResolutionService.findOrCreateTargetFromGitInfo.mockResolvedValue(
      target,
    );

    mockRecorder = createMockInstance(LockFileDistributionRecorder);
    mockRecorder.record.mockResolvedValue({
      deploymentId: distributionId,
      status: 'updated',
      warnings: [],
    });

    useCase = new NotifyArtefactsDistributionUseCase(
      mockAccountsPort,
      mockTargetResolutionService,
      mockRecorder,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when the CLI notifies a distribution', () => {
    let response: NotifyArtefactsDistributionResponse;

    beforeEach(async () => {
      response = await useCase.execute(command);
    });

    it('resolves the target from the git information', () => {
      expect(
        mockTargetResolutionService.findOrCreateTargetFromGitInfo,
      ).toHaveBeenCalledWith(
        organizationId,
        userId,
        'https://github.com/acme/ops.git',
        'main',
        '/',
      );
    });

    it('records the lock on that target as coming from the CLI', () => {
      expect(mockRecorder.record).toHaveBeenCalledWith({
        target,
        lockFile,
        organizationId,
        userId,
        source: 'cli',
        branch: 'main',
        packageVersions: { '@my-space/ops': '1.3.0', '@my-space/ui': '*' },
      });
    });

    it('returns what the recording did', () => {
      expect(response).toEqual({
        deploymentId: distributionId,
        status: 'updated',
        warnings: [],
      });
    });
  });
});
