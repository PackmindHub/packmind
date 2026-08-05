import { PackmindEventEmitterService } from '@packmind/node-utils';
import { OrganizationAdminRequiredError } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  createGitProviderId,
  createGitRepoId,
  createOrganizationId,
  createUserId,
  GitRepo,
  IAccountsPort,
  Organization,
  RemoveTrackedRepositoryCommand,
  RepositoryNotTrackableError,
  RepositoryTrackingRemovedEvent,
  User,
  UserOrganizationRole,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { GitRepoService } from '../../GitRepoService';
import { RemoveTrackedRepositoryUseCase } from './RemoveTrackedRepositoryUseCase';

describe('RemoveTrackedRepositoryUseCase', () => {
  let useCase: RemoveTrackedRepositoryUseCase;
  let mockGitRepoService: jest.Mocked<GitRepoService>;
  let mockEventEmitter: jest.Mocked<PackmindEventEmitterService>;
  let mockAccountsAdapter: jest.Mocked<IAccountsPort>;

  const organizationId = createOrganizationId(uuidv4());
  const userId = createUserId(uuidv4());
  const providerId = createGitProviderId(uuidv4());

  const command: RemoveTrackedRepositoryCommand = {
    userId,
    organizationId,
    owner: 'acme',
    repo: 'widgets',
  };

  const trackedRepo: GitRepo = {
    id: createGitRepoId(uuidv4()),
    owner: 'acme',
    repo: 'widgets',
    branch: 'main',
    providerId,
    type: 'standard',
    isTracked: true,
    trackingRemovedAt: null,
  };

  const setupAccounts = (role: UserOrganizationRole) => {
    const user: User = {
      id: userId,
      email: 'admin@example.com',
      displayName: 'admin',
      passwordHash: null,
      active: true,
      memberships: [{ userId, organizationId, role }],
    };
    const organization: Organization = {
      id: organizationId,
      name: 'PickMand',
      slug: 'pickmand',
    };
    mockAccountsAdapter = {
      getUserById: jest.fn().mockResolvedValue(user),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;
  };

  const buildUseCase = () =>
    new RemoveTrackedRepositoryUseCase(
      mockGitRepoService,
      mockEventEmitter,
      mockAccountsAdapter,
      stubLogger(),
    );

  beforeEach(() => {
    mockGitRepoService = {
      findTrackedByOwnerRepoInOrganization: jest.fn(),
      findByOwnerAndRepoInOrganization: jest.fn(),
      markTrackingRemoved: jest.fn(),
    } as Partial<jest.Mocked<GitRepoService>> as jest.Mocked<GitRepoService>;

    mockEventEmitter = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    setupAccounts('admin');
    useCase = buildUseCase();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when the repository is tracked', () => {
    let result: Awaited<ReturnType<typeof useCase.execute>>;
    let emittedEvent: RepositoryTrackingRemovedEvent;

    beforeEach(async () => {
      mockGitRepoService.findTrackedByOwnerRepoInOrganization.mockResolvedValue(
        trackedRepo,
      );
      mockGitRepoService.markTrackingRemoved.mockResolvedValue({
        ...trackedRepo,
        isTracked: false,
        trackingRemovedAt: new Date('2026-08-05T10:00:00.000Z'),
      });

      result = await useCase.execute(command);
      emittedEvent = mockEventEmitter.emit.mock
        .calls[0][0] as RepositoryTrackingRemovedEvent;
    });

    it('stamps the removal on the tracked row', () => {
      expect(mockGitRepoService.markTrackingRemoved).toHaveBeenCalledWith(
        trackedRepo.id,
      );
    });

    it('reports the tracking as removed', () => {
      expect(result.status).toBe('removed');
    });

    it('emits exactly one event', () => {
      expect(mockEventEmitter.emit).toHaveBeenCalledTimes(1);
    });

    it('emits a RepositoryTrackingRemovedEvent', () => {
      expect(emittedEvent).toBeInstanceOf(RepositoryTrackingRemovedEvent);
    });

    it('names the branch that was tracked in the payload', () => {
      expect(emittedEvent.payload).toEqual(
        expect.objectContaining({
          organizationId,
          repositoryId: trackedRepo.id,
          owner: 'acme',
          repo: 'widgets',
          branch: 'main',
        }),
      );
    });
  });

  describe('when the repository is known but not tracked', () => {
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      mockGitRepoService.findTrackedByOwnerRepoInOrganization.mockResolvedValue(
        null,
      );
      mockGitRepoService.findByOwnerAndRepoInOrganization.mockResolvedValue({
        ...trackedRepo,
        isTracked: false,
      });

      result = await useCase.execute(command);
    });

    it('reports that nothing was tracked', () => {
      expect(result).toEqual({
        status: 'not-tracked',
        organizationName: 'PickMand',
      });
    });

    it('changes nothing', () => {
      expect(mockGitRepoService.markTrackingRemoved).not.toHaveBeenCalled();
    });

    it('emits no event', () => {
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('when Packmind has never seen the repository', () => {
    beforeEach(() => {
      mockGitRepoService.findTrackedByOwnerRepoInOrganization.mockResolvedValue(
        null,
      );
      mockGitRepoService.findByOwnerAndRepoInOrganization.mockResolvedValue(
        null,
      );
    });

    it('rejects with a RepositoryNotTrackableError', async () => {
      await expect(useCase.execute(command)).rejects.toThrow(
        new RepositoryNotTrackableError('acme', 'widgets'),
      );
    });
  });

  describe('when the caller is not an admin', () => {
    beforeEach(() => {
      setupAccounts('member');
      useCase = buildUseCase();
    });

    it('rejects with an OrganizationAdminRequiredError', async () => {
      await expect(useCase.execute(command)).rejects.toThrow(
        OrganizationAdminRequiredError,
      );
    });
  });
});
