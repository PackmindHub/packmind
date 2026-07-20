import { stubLogger } from '@packmind/test-utils';
import {
  createGitProviderId,
  createGitRepoId,
  createOrganizationId,
  createUserId,
  GetTrackedRepositoryCommand,
  GitRepo,
  IAccountsPort,
  Organization,
  User,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { GitRepoService } from '../../GitRepoService';
import { isCliRepoTrackingEnabled } from '../shared/cliRepoTrackingFlag';
import { GetTrackedRepositoryUseCase } from './GetTrackedRepositoryUseCase';

jest.mock('../shared/cliRepoTrackingFlag', () => ({
  isCliRepoTrackingEnabled: jest.fn().mockResolvedValue(true),
}));

const mockedIsEnabled = isCliRepoTrackingEnabled as jest.MockedFunction<
  typeof isCliRepoTrackingEnabled
>;

describe('GetTrackedRepositoryUseCase', () => {
  let useCase: GetTrackedRepositoryUseCase;
  let mockGitRepoService: jest.Mocked<GitRepoService>;
  let mockAccountsAdapter: jest.Mocked<IAccountsPort>;

  const organizationId = createOrganizationId(uuidv4());
  const userId = createUserId(uuidv4());

  const command: GetTrackedRepositoryCommand = {
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
    providerId: createGitProviderId(uuidv4()),
    isTracked: true,
  };

  beforeEach(() => {
    mockedIsEnabled.mockResolvedValue(true);

    mockGitRepoService = {
      findTrackedByOwnerRepoInOrganization: jest.fn(),
    } as Partial<jest.Mocked<GitRepoService>> as jest.Mocked<GitRepoService>;

    const user: User = {
      id: userId,
      email: 'member@packmind.com',
      displayName: 'member',
      passwordHash: null,
      active: true,
      memberships: [{ userId, organizationId, role: 'member' }],
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

    useCase = new GetTrackedRepositoryUseCase(
      mockGitRepoService,
      mockAccountsAdapter,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when a branch is tracked', () => {
    let result: { gitRepo: GitRepo | null };

    beforeEach(async () => {
      mockGitRepoService.findTrackedByOwnerRepoInOrganization.mockResolvedValue(
        trackedRepo,
      );

      result = await useCase.execute(command);
    });

    it('returns the tracked repository', () => {
      expect(result).toEqual({ gitRepo: trackedRepo });
    });

    it('queries by organization, owner and repo', () => {
      expect(
        mockGitRepoService.findTrackedByOwnerRepoInOrganization,
      ).toHaveBeenCalledWith(organizationId, 'acme', 'widgets');
    });
  });

  describe('when nothing is tracked', () => {
    it('returns null', async () => {
      mockGitRepoService.findTrackedByOwnerRepoInOrganization.mockResolvedValue(
        null,
      );

      const result = await useCase.execute(command);

      expect(result).toEqual({ gitRepo: null });
    });
  });

  describe('when the feature flag is disabled', () => {
    let result: { gitRepo: GitRepo | null };

    beforeEach(async () => {
      mockedIsEnabled.mockResolvedValue(false);

      result = await useCase.execute(command);
    });

    it('returns no tracked repo', () => {
      expect(result).toEqual({ gitRepo: null });
    });

    it('does not query the git repo service', () => {
      expect(
        mockGitRepoService.findTrackedByOwnerRepoInOrganization,
      ).not.toHaveBeenCalled();
    });
  });
});
