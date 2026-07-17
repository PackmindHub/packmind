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
  IFindOrCreateGitRepoUseCase,
  Organization,
  RepositoryAlreadyTrackedError,
  RepositoryTrackingSetEvent,
  SetTrackedRepositoryCommand,
  User,
  UserOrganizationRole,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { GitRepoService } from '../../GitRepoService';
import { isCliRepoTrackingEnabled } from '../shared/cliRepoTrackingFlag';
import { SetTrackedRepositoryUseCase } from './SetTrackedRepositoryUseCase';

jest.mock('../shared/cliRepoTrackingFlag', () => ({
  isCliRepoTrackingEnabled: jest.fn().mockResolvedValue(true),
}));

const mockedIsEnabled = isCliRepoTrackingEnabled as jest.MockedFunction<
  typeof isCliRepoTrackingEnabled
>;

describe('SetTrackedRepositoryUseCase', () => {
  let useCase: SetTrackedRepositoryUseCase;
  let mockGitRepoService: jest.Mocked<GitRepoService>;
  let mockFindOrCreate: jest.Mocked<IFindOrCreateGitRepoUseCase>;
  let mockEventEmitter: jest.Mocked<PackmindEventEmitterService>;
  let mockAccountsAdapter: jest.Mocked<IAccountsPort>;

  const organizationId = createOrganizationId(uuidv4());
  const userId = createUserId(uuidv4());
  const providerId = createGitProviderId(uuidv4());

  const command: SetTrackedRepositoryCommand = {
    userId,
    organizationId,
    owner: 'acme',
    repo: 'widgets',
    branch: 'dev',
    origin: 'track',
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
    new SetTrackedRepositoryUseCase(
      mockGitRepoService,
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

  describe('when nothing is tracked yet', () => {
    let createdRepo: GitRepo;
    let trackedRepo: GitRepo;
    let result: GitRepo;

    beforeEach(async () => {
      createdRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'acme',
        repo: 'widgets',
        branch: 'dev',
        providerId,
        isTracked: false,
      };
      trackedRepo = { ...createdRepo, isTracked: true };

      mockGitRepoService.findTrackedByOwnerRepoInOrganization.mockResolvedValue(
        null,
      );
      mockFindOrCreate.execute.mockResolvedValue(createdRepo);
      mockGitRepoService.updateTracked.mockResolvedValue(trackedRepo);

      result = await useCase.execute(command);
    });

    it('finds or creates the repo for the requested branch', () => {
      expect(mockFindOrCreate.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'acme',
          repo: 'widgets',
          branch: 'dev',
        }),
      );
    });

    it('marks the repository as tracked', () => {
      expect(mockGitRepoService.updateTracked).toHaveBeenCalledWith(
        createdRepo.id,
        true,
      );
    });

    it('returns the tracked repository', () => {
      expect(result).toEqual(trackedRepo);
    });

    it('emits a RepositoryTrackingSetEvent without fromBranch', () => {
      expect(mockEventEmitter.emit).toHaveBeenCalledTimes(1);
      const event = mockEventEmitter.emit.mock
        .calls[0][0] as RepositoryTrackingSetEvent;
      expect(event).toBeInstanceOf(RepositoryTrackingSetEvent);
      expect(event.payload).toEqual(
        expect.objectContaining({
          organizationId,
          repositoryId: trackedRepo.id,
          owner: 'acme',
          repo: 'widgets',
          branch: 'dev',
          origin: 'track',
        }),
      );
      expect(event.payload.fromBranch).toBeUndefined();
    });
  });

  describe('when the same branch is already tracked', () => {
    let existing: GitRepo;
    let result: GitRepo;

    beforeEach(async () => {
      existing = {
        id: createGitRepoId(uuidv4()),
        owner: 'acme',
        repo: 'widgets',
        branch: 'dev',
        providerId,
        isTracked: true,
      };
      mockGitRepoService.findTrackedByOwnerRepoInOrganization.mockResolvedValue(
        existing,
      );

      result = await useCase.execute(command);
    });

    it('is idempotent and returns the existing tracked repo', () => {
      expect(result).toEqual(existing);
    });

    it('does not update tracking', () => {
      expect(mockGitRepoService.updateTracked).not.toHaveBeenCalled();
    });

    it('does not emit an event', () => {
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('when a different branch is already tracked', () => {
    beforeEach(() => {
      mockGitRepoService.findTrackedByOwnerRepoInOrganization.mockResolvedValue(
        {
          id: createGitRepoId(uuidv4()),
          owner: 'acme',
          repo: 'widgets',
          branch: 'main',
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
