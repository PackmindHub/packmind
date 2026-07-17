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

  it('returns the tracked repository', async () => {
    mockGitRepoService.findTrackedByOwnerRepoInOrganization.mockResolvedValue(
      trackedRepo,
    );

    const result = await useCase.execute(command);

    expect(result).toEqual({ gitRepo: trackedRepo });
    expect(
      mockGitRepoService.findTrackedByOwnerRepoInOrganization,
    ).toHaveBeenCalledWith(organizationId, 'acme', 'widgets');
  });

  it('returns null when nothing is tracked', async () => {
    mockGitRepoService.findTrackedByOwnerRepoInOrganization.mockResolvedValue(
      null,
    );

    const result = await useCase.execute(command);

    expect(result).toEqual({ gitRepo: null });
  });

  describe('when the feature flag is disabled', () => {
    beforeEach(() => {
      mockedIsEnabled.mockResolvedValue(false);
    });

    it('behaves as feature-absent and returns no tracked repo', async () => {
      const result = await useCase.execute(command);

      expect(result).toEqual({ gitRepo: null });
      expect(
        mockGitRepoService.findTrackedByOwnerRepoInOrganization,
      ).not.toHaveBeenCalled();
    });
  });
});
