import { GetOrganizationOnboardingStatusUseCase } from './GetOrganizationOnboardingStatusUseCase';
import {
  GetOrganizationOnboardingStatusCommand,
  UserProvider,
  OrganizationProvider,
  IStandardsPort,
  ISpacesPort,
  IDeploymentPort,
  IGitPort,
  GitProvider,
  GitRepo,
  Standard,
  Space,
  RepositoryDeploymentStatus,
  RecipeDeploymentStatus,
  createSpaceId,
} from '@packmind/types';
import { MemberContext } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import { PackmindLogger } from '@packmind/logger';
import { UserService } from '../../services/UserService';
import { userFactory, organizationFactory } from '../../../../test';
import { createUserId } from '@packmind/types';
import { createOrganizationId } from '@packmind/types';

describe('GetOrganizationOnboardingStatusUseCase', () => {
  let getOrganizationOnboardingStatusUseCase: GetOrganizationOnboardingStatusUseCase;
  let mockUserProvider: jest.Mocked<UserProvider>;
  let mockOrganizationProvider: jest.Mocked<OrganizationProvider>;
  let mockUserService: jest.Mocked<UserService>;
  let mockGitPort: jest.Mocked<IGitPort>;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockSpacesPort: jest.Mocked<ISpacesPort>;
  let mockDeploymentPort: jest.Mocked<IDeploymentPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    mockUserProvider = {
      getUserById: jest.fn(),
    } as unknown as jest.Mocked<UserProvider>;

    mockOrganizationProvider = {
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<OrganizationProvider>;

    mockUserService = {
      listUsersByOrganization: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    mockGitPort = {
      listProviders: jest.fn(),
      getOrganizationRepositories: jest.fn(),
    } as jest.Mocked<IGitPort>;

    mockStandardsPort = {
      listStandardsBySpace: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    mockSpacesPort = {
      listSpacesByOrganization: jest.fn(),
    } as unknown as jest.Mocked<ISpacesPort>;

    mockDeploymentPort = {
      getDeploymentOverview: jest.fn(),
    } as unknown as jest.Mocked<IDeploymentPort>;

    stubbedLogger = stubLogger();

    getOrganizationOnboardingStatusUseCase =
      new GetOrganizationOnboardingStatusUseCase(
        mockUserProvider,
        mockOrganizationProvider,
        mockUserService,
        mockGitPort,
        mockStandardsPort,
        mockSpacesPort,
        mockDeploymentPort,
        stubbedLogger,
      );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeForMembers', () => {
    const userId = createUserId('user-123');
    const organizationId = createOrganizationId('org-456');
    const user = userFactory({ id: userId });
    const organization = organizationFactory({ id: organizationId });
    const membership = {
      userId,
      organizationId,
      role: 'member' as const,
    };

    const validCommand: GetOrganizationOnboardingStatusCommand & MemberContext =
      {
        userId: String(userId),
        organizationId,
        user,
        organization,
        membership,
      };

    describe('with all onboarding steps completed', () => {
      it('returns all flags as true', async () => {
        const mockSpace: Space = {
          id: createSpaceId('space-1'),
          name: 'Global',
          slug: 'global',
          organizationId,
        };

        mockUserService.listUsersByOrganization.mockResolvedValue([
          user,
          userFactory(),
        ]);
        mockGitPort.listProviders.mockResolvedValue([
          { id: 'provider-1' } as unknown as GitProvider,
        ]);
        mockGitPort.getOrganizationRepositories.mockResolvedValue([
          { id: 'repo-1' } as unknown as GitRepo,
        ]);
        mockSpacesPort.listSpacesByOrganization.mockResolvedValue([mockSpace]);
        mockStandardsPort.listStandardsBySpace.mockResolvedValue([
          { id: 'standard-1' } as unknown as Standard,
        ]);
        mockDeploymentPort.getDeploymentOverview.mockResolvedValue({
          repositories: [
            { repositoryId: 'repo-1' } as unknown as RepositoryDeploymentStatus,
          ],
          recipes: [],
          targets: [],
        });

        const result =
          await getOrganizationOnboardingStatusUseCase.executeForMembers(
            validCommand,
          );

        expect(result).toEqual({
          hasConnectedGitProvider: true,
          hasConnectedGitRepo: true,
          hasCreatedStandard: true,
          hasDeployed: true,
          hasInvitedColleague: true,
        });
      });
    });

    describe('with no onboarding steps completed', () => {
      it('returns all flags as false', async () => {
        const mockSpace: Space = {
          id: createSpaceId('space-1'),
          name: 'Global',
          slug: 'global',
          organizationId,
        };

        mockUserService.listUsersByOrganization.mockResolvedValue([user]);
        mockGitPort.listProviders.mockResolvedValue([]);
        mockGitPort.getOrganizationRepositories.mockResolvedValue([]);
        mockSpacesPort.listSpacesByOrganization.mockResolvedValue([mockSpace]);
        mockStandardsPort.listStandardsBySpace.mockResolvedValue([]);
        mockDeploymentPort.getDeploymentOverview.mockResolvedValue({
          repositories: [],
          recipes: [],
          targets: [],
        });

        const result =
          await getOrganizationOnboardingStatusUseCase.executeForMembers(
            validCommand,
          );

        expect(result).toEqual({
          hasConnectedGitProvider: false,
          hasConnectedGitRepo: false,
          hasCreatedStandard: false,
          hasDeployed: false,
          hasInvitedColleague: false,
        });
      });
    });

    describe('with only git provider connected', () => {
      it('returns only hasConnectedGitProvider as true', async () => {
        const mockSpace: Space = {
          id: createSpaceId('space-1'),
          name: 'Global',
          slug: 'global',
          organizationId,
        };

        mockUserService.listUsersByOrganization.mockResolvedValue([user]);
        mockGitPort.listProviders.mockResolvedValue([
          { id: 'provider-1' } as unknown as GitProvider,
        ]);
        mockGitPort.getOrganizationRepositories.mockResolvedValue([]);
        mockSpacesPort.listSpacesByOrganization.mockResolvedValue([mockSpace]);
        mockStandardsPort.listStandardsBySpace.mockResolvedValue([]);
        mockDeploymentPort.getDeploymentOverview.mockResolvedValue({
          repositories: [],
          recipes: [],
          targets: [],
        });

        const result =
          await getOrganizationOnboardingStatusUseCase.executeForMembers(
            validCommand,
          );

        expect(result).toEqual({
          hasConnectedGitProvider: true,
          hasConnectedGitRepo: false,
          hasCreatedStandard: false,
          hasDeployed: false,
          hasInvitedColleague: false,
        });
      });
    });

    describe('with null ports', () => {
      it('returns false for port-dependent checks', async () => {
        const useCaseWithNullPorts = new GetOrganizationOnboardingStatusUseCase(
          mockUserProvider,
          mockOrganizationProvider,
          mockUserService,
          null,
          null,
          null,
          null,
          stubbedLogger,
        );

        mockUserService.listUsersByOrganization.mockResolvedValue([user]);

        const result =
          await useCaseWithNullPorts.executeForMembers(validCommand);

        expect(result).toEqual({
          hasConnectedGitProvider: false,
          hasConnectedGitRepo: false,
          hasCreatedStandard: false,
          hasDeployed: false,
          hasInvitedColleague: false,
        });
      });
    });

    describe('with deployment via recipes', () => {
      it('detects deployment through recipes list', async () => {
        const mockSpace: Space = {
          id: createSpaceId('space-1'),
          name: 'Global',
          slug: 'global',
          organizationId,
        };

        mockUserService.listUsersByOrganization.mockResolvedValue([user]);
        mockGitPort.listProviders.mockResolvedValue([]);
        mockGitPort.getOrganizationRepositories.mockResolvedValue([]);
        mockSpacesPort.listSpacesByOrganization.mockResolvedValue([mockSpace]);
        mockStandardsPort.listStandardsBySpace.mockResolvedValue([]);
        mockDeploymentPort.getDeploymentOverview.mockResolvedValue({
          repositories: [],
          recipes: [
            { recipeId: 'recipe-1' } as unknown as RecipeDeploymentStatus,
          ],
          targets: [],
        });

        const result =
          await getOrganizationOnboardingStatusUseCase.executeForMembers(
            validCommand,
          );

        expect(result.hasDeployed).toBe(true);
      });
    });

    describe('with multiple users', () => {
      it('detects invited colleagues', async () => {
        const mockSpace: Space = {
          id: createSpaceId('space-1'),
          name: 'Global',
          slug: 'global',
          organizationId,
        };

        mockUserService.listUsersByOrganization.mockResolvedValue([
          user,
          userFactory(),
          userFactory(),
        ]);
        mockGitPort.listProviders.mockResolvedValue([]);
        mockGitPort.getOrganizationRepositories.mockResolvedValue([]);
        mockSpacesPort.listSpacesByOrganization.mockResolvedValue([mockSpace]);
        mockStandardsPort.listStandardsBySpace.mockResolvedValue([]);
        mockDeploymentPort.getDeploymentOverview.mockResolvedValue({
          repositories: [],
          recipes: [],
          targets: [],
        });

        const result =
          await getOrganizationOnboardingStatusUseCase.executeForMembers(
            validCommand,
          );

        expect(result.hasInvitedColleague).toBe(true);
      });
    });

    describe('with service errors', () => {
      it('rethrows user service error', async () => {
        const error = new Error('User service failed');
        mockUserService.listUsersByOrganization.mockRejectedValue(error);

        await expect(
          getOrganizationOnboardingStatusUseCase.executeForMembers(
            validCommand,
          ),
        ).rejects.toThrow('User service failed');
      });

      it('rethrows git port error', async () => {
        const error = new Error('Git service failed');
        mockUserService.listUsersByOrganization.mockResolvedValue([user]);
        mockGitPort.listProviders.mockRejectedValue(error);

        await expect(
          getOrganizationOnboardingStatusUseCase.executeForMembers(
            validCommand,
          ),
        ).rejects.toThrow('Git service failed');
      });
    });
  });
});
