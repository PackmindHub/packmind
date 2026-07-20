import {
  OrganizationAdminRequiredError,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  createGitProviderId,
  createGitRepoId,
  createOrganizationId,
  createUserId,
  GitProvider,
  GitProviderVendors,
  GitRepo,
  IAccountsPort,
  IFindOrCreateGitRepoUseCase,
  NoTrackedRepositoryError,
  Organization,
  RepositoryAlreadyTrackedError,
  RepositoryTrackingSetEvent,
  UpdateTrackedBranchCommand,
  User,
  UserOrganizationRole,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { GitProviderService } from '../../GitProviderService';
import { GitRepoService } from '../../GitRepoService';
import { isCliRepoTrackingEnabled } from '../shared/cliRepoTrackingFlag';
import { UpdateTrackedBranchUseCase } from './UpdateTrackedBranchUseCase';

jest.mock('../shared/cliRepoTrackingFlag', () => ({
  isCliRepoTrackingEnabled: jest.fn().mockResolvedValue(true),
}));

const mockedIsEnabled = isCliRepoTrackingEnabled as jest.MockedFunction<
  typeof isCliRepoTrackingEnabled
>;

describe('UpdateTrackedBranchUseCase', () => {
  let useCase: UpdateTrackedBranchUseCase;
  let mockGitRepoService: jest.Mocked<GitRepoService>;
  let mockGitProviderService: jest.Mocked<GitProviderService>;
  let mockFindOrCreate: jest.Mocked<IFindOrCreateGitRepoUseCase>;
  let mockEventEmitter: jest.Mocked<PackmindEventEmitterService>;
  let mockAccountsAdapter: jest.Mocked<IAccountsPort>;

  const organizationId = createOrganizationId(uuidv4());
  const userId = createUserId(uuidv4());
  const providerId = createGitProviderId(uuidv4());

  const command: UpdateTrackedBranchCommand = {
    userId,
    organizationId,
    owner: 'acme',
    repo: 'widgets',
    branch: 'dev',
  };

  const provider: GitProvider = {
    id: providerId,
    source: GitProviderVendors.github,
    organizationId,
    url: 'https://github.com',
    token: null,
    authMethod: 'token',
    displayName: '',
  };

  const setupAccounts = (role: UserOrganizationRole) => {
    const user: User = {
      id: userId,
      email: 'admin@packmind.com',
      displayName: 'admin',
      passwordHash: null,
      active: true,
      memberships: [{ userId, organizationId, role }],
    };
    const organization: Organization = {
      id: organizationId,
      name: 'Test Org',
      slug: 'test-org',
    };
    mockAccountsAdapter = {
      getUserById: jest.fn().mockResolvedValue(user),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;
  };

  const buildUseCase = () =>
    new UpdateTrackedBranchUseCase(
      mockGitRepoService,
      mockGitProviderService,
      mockFindOrCreate,
      mockEventEmitter,
      mockAccountsAdapter,
      stubLogger(),
    );

  beforeEach(() => {
    mockedIsEnabled.mockResolvedValue(true);

    mockGitRepoService = {
      findTrackedByOwnerRepoInOrganization: jest.fn(),
      updateTracked: jest.fn(),
    } as Partial<jest.Mocked<GitRepoService>> as jest.Mocked<GitRepoService>;

    mockGitProviderService = {
      findGitProviderById: jest.fn().mockResolvedValue(provider),
    } as Partial<
      jest.Mocked<GitProviderService>
    > as jest.Mocked<GitProviderService>;

    mockFindOrCreate = {
      execute: jest.fn(),
    } as jest.Mocked<IFindOrCreateGitRepoUseCase>;

    mockEventEmitter = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    setupAccounts('admin');
    useCase = buildUseCase();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when nothing is tracked', () => {
    beforeEach(() => {
      mockGitRepoService.findTrackedByOwnerRepoInOrganization.mockResolvedValue(
        null,
      );
    });

    it('throws NoTrackedRepositoryError', async () => {
      await expect(useCase.execute(command)).rejects.toThrow(
        NoTrackedRepositoryError,
      );
    });
  });

  describe('when the requested branch is already tracked', () => {
    beforeEach(() => {
      mockGitRepoService.findTrackedByOwnerRepoInOrganization.mockResolvedValue(
        {
          id: createGitRepoId(uuidv4()),
          owner: 'acme',
          repo: 'widgets',
          branch: 'dev',
          providerId,
          isTracked: true,
        },
      );
    });

    it('throws RepositoryAlreadyTrackedError', async () => {
      await expect(useCase.execute(command)).rejects.toThrow(
        RepositoryAlreadyTrackedError,
      );
    });
  });

  describe('when moving the tracked branch', () => {
    let oldRepo: GitRepo;
    let newRepo: GitRepo;
    let trackedRepo: GitRepo;
    let result: GitRepo;
    let emittedEvent: RepositoryTrackingSetEvent;

    beforeEach(async () => {
      oldRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'acme',
        repo: 'widgets',
        branch: 'main',
        providerId,
        isTracked: true,
      };
      newRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'acme',
        repo: 'widgets',
        branch: 'dev',
        providerId,
        isTracked: false,
      };
      trackedRepo = { ...newRepo, isTracked: true };

      mockGitRepoService.findTrackedByOwnerRepoInOrganization.mockResolvedValue(
        oldRepo,
      );
      mockFindOrCreate.execute.mockResolvedValue(newRepo);
      mockGitRepoService.updateTracked
        .mockResolvedValueOnce({ ...oldRepo, isTracked: false })
        .mockResolvedValueOnce(trackedRepo);

      result = await useCase.execute(command);
      emittedEvent = mockEventEmitter.emit.mock
        .calls[0][0] as RepositoryTrackingSetEvent;
    });

    it('clears the tracked flag on the old branch', () => {
      expect(mockGitRepoService.updateTracked).toHaveBeenNthCalledWith(
        1,
        oldRepo.id,
        false,
      );
    });

    it('sets the tracked flag on the new branch', () => {
      expect(mockGitRepoService.updateTracked).toHaveBeenNthCalledWith(
        2,
        newRepo.id,
        true,
      );
    });

    it('returns the newly tracked repository', () => {
      expect(result).toEqual(trackedRepo);
    });

    it('emits exactly one event', () => {
      expect(mockEventEmitter.emit).toHaveBeenCalledTimes(1);
    });

    it('emits a RepositoryTrackingSetEvent', () => {
      expect(emittedEvent).toBeInstanceOf(RepositoryTrackingSetEvent);
    });

    it('carries the tracking details and fromBranch in the payload', () => {
      expect(emittedEvent.payload).toEqual(
        expect.objectContaining({
          organizationId,
          repositoryId: trackedRepo.id,
          owner: 'acme',
          repo: 'widgets',
          branch: 'dev',
          fromBranch: 'main',
          origin: 'track',
        }),
      );
    });
  });

  describe('when the caller is not an admin', () => {
    beforeEach(() => {
      setupAccounts('member');
      useCase = buildUseCase();
    });

    it('throws OrganizationAdminRequiredError', async () => {
      await expect(useCase.execute(command)).rejects.toThrow(
        OrganizationAdminRequiredError,
      );
    });
  });
});
