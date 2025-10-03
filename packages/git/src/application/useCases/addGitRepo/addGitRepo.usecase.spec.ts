import { AddGitRepoUseCase } from './addGitRepo.usecase';
import { GitProviderService } from '../../GitProviderService';
import { GitRepoService } from '../../GitRepoService';
import { AddGitRepoCommand } from '../../../domain/useCases/IAddGitRepo';
import {
  GitProvider,
  GitProviderId,
  createGitProviderId,
  GitProviderVendors,
} from '../../../domain/entities/GitProvider';
import { GitRepo, createGitRepoId } from '../../../domain/entities/GitRepo';
import { createOrganizationId, createUserId } from '@packmind/accounts';
import {
  IDeploymentPort,
  Target,
  createTargetId,
  GitRepoAlreadyExistsError,
  GitProviderNotFoundError,
  GitProviderOrganizationMismatchError,
  UserProvider,
  OrganizationProvider,
  User,
  Organization,
  OrganizationAdminRequiredError,
} from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';
import { v4 as uuidv4 } from 'uuid';

describe('AddGitRepoUseCase', () => {
  let useCase: AddGitRepoUseCase;
  let mockGitProviderService: jest.Mocked<GitProviderService>;
  let mockGitRepoService: jest.Mocked<GitRepoService>;
  let mockDeploymentPort: jest.Mocked<IDeploymentPort>;
  let mockUserProvider: jest.Mocked<UserProvider>;
  let mockOrganizationProvider: jest.Mocked<OrganizationProvider>;

  const organizationId = createOrganizationId(uuidv4());
  const userId = createUserId(uuidv4());
  const gitProviderId = createGitProviderId(uuidv4());

  beforeEach(() => {
    mockGitProviderService = {
      findGitProviderById: jest.fn(),
    } as Partial<
      jest.Mocked<GitProviderService>
    > as jest.Mocked<GitProviderService>;

    mockGitRepoService = {
      findGitRepoByOwnerRepoAndBranchInOrganization: jest.fn(),
      addGitRepo: jest.fn(),
    } as Partial<jest.Mocked<GitRepoService>> as jest.Mocked<GitRepoService>;

    mockDeploymentPort = {
      addTarget: jest.fn(),
    } as Partial<jest.Mocked<IDeploymentPort>> as jest.Mocked<IDeploymentPort>;

    const adminUser: User = {
      id: userId,
      email: 'admin@example.com',
      passwordHash: null,
      active: true,
      memberships: [
        {
          userId,
          organizationId,
          role: 'admin',
        },
      ],
    };

    const organization: Organization = {
      id: organizationId,
      name: 'Test Org',
      slug: 'test-org',
    };

    mockUserProvider = {
      getUserById: jest.fn().mockResolvedValue(adminUser),
    } as Partial<jest.Mocked<UserProvider>> as jest.Mocked<UserProvider>;

    mockOrganizationProvider = {
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as Partial<
      jest.Mocked<OrganizationProvider>
    > as jest.Mocked<OrganizationProvider>;

    useCase = new AddGitRepoUseCase(
      mockGitProviderService,
      mockGitRepoService,
      mockUserProvider,
      mockOrganizationProvider,
      mockDeploymentPort,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when adding a valid repository', () => {
    it('creates repository successfully with no conflicts', async () => {
      const command: AddGitRepoCommand = {
        userId,
        organizationId,
        gitProviderId,
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
      };

      const mockProvider: GitProvider = {
        id: gitProviderId,
        source: GitProviderVendors.github,
        organizationId,
        url: 'https://github.com',
        token: 'token',
      };

      const expectedResult: GitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
        providerId: gitProviderId,
      };

      mockGitProviderService.findGitProviderById.mockResolvedValue(
        mockProvider,
      );
      mockGitRepoService.findGitRepoByOwnerRepoAndBranchInOrganization.mockResolvedValue(
        null,
      );
      mockGitRepoService.addGitRepo.mockResolvedValue(expectedResult);

      const result = await useCase.execute(command);

      expect(result).toEqual(expectedResult);
      expect(mockGitProviderService.findGitProviderById).toHaveBeenCalledWith(
        gitProviderId,
      );
      expect(
        mockGitRepoService.findGitRepoByOwnerRepoAndBranchInOrganization,
      ).toHaveBeenCalledWith('testowner', 'testrepo', 'main', organizationId);
      expect(mockGitRepoService.addGitRepo).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
        providerId: gitProviderId,
      });
    });

    it('allows same repository with different branch', async () => {
      const command: AddGitRepoCommand = {
        userId,
        organizationId,
        gitProviderId,
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'develop', // Different branch
      };

      const mockProvider: GitProvider = {
        id: gitProviderId,
        source: GitProviderVendors.github,
        organizationId,
        url: 'https://github.com',
        token: 'token',
      };

      const expectedResult: GitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'develop',
        providerId: gitProviderId,
      };

      mockGitProviderService.findGitProviderById.mockResolvedValue(
        mockProvider,
      );
      mockGitRepoService.findGitRepoByOwnerRepoAndBranchInOrganization.mockResolvedValue(
        null,
      );
      mockGitRepoService.addGitRepo.mockResolvedValue(expectedResult);

      const result = await useCase.execute(command);

      expect(result).toEqual(expectedResult);
      expect(
        mockGitRepoService.findGitRepoByOwnerRepoAndBranchInOrganization,
      ).toHaveBeenCalledWith(
        'testowner',
        'testrepo',
        'develop',
        organizationId,
      );
    });
  });

  describe('default target creation', () => {
    it('creates default target if deployment port is available', async () => {
      const useCaseWithDeployment = new AddGitRepoUseCase(
        mockGitProviderService,
        mockGitRepoService,
        mockUserProvider,
        mockOrganizationProvider,
        mockDeploymentPort,
        stubLogger(),
      );

      const command: AddGitRepoCommand = {
        userId,
        organizationId,
        gitProviderId,
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
      };

      const mockProvider: GitProvider = {
        id: gitProviderId,
        source: GitProviderVendors.github,
        organizationId,
        url: 'https://github.com',
        token: 'token',
      };

      const expectedResult: GitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
        providerId: gitProviderId,
      };

      const mockTarget: Target = {
        id: createTargetId(uuidv4()),
        name: 'Default',
        path: '.',
        gitRepoId: expectedResult.id,
      };

      mockGitProviderService.findGitProviderById.mockResolvedValue(
        mockProvider,
      );
      mockGitRepoService.findGitRepoByOwnerRepoAndBranchInOrganization.mockResolvedValue(
        null,
      );
      mockGitRepoService.addGitRepo.mockResolvedValue(expectedResult);
      mockDeploymentPort.addTarget.mockResolvedValue(mockTarget);

      const result = await useCaseWithDeployment.execute(command);

      expect(result).toEqual(expectedResult);
      expect(mockDeploymentPort.addTarget).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Default',
          path: '/',
          gitRepoId: expectedResult.id,
          userId: expect.any(String),
          organizationId: expect.any(String),
        }),
      );
    });
  });

  describe('validation errors', () => {
    it('throws error if user is not admin', async () => {
      const command: AddGitRepoCommand = {
        userId,
        organizationId,
        gitProviderId,
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
      };

      const nonAdminUser: User = {
        id: userId,
        email: 'member@example.com',
        passwordHash: null,
        active: true,
        memberships: [
          {
            userId,
            organizationId,
            role: 'member',
          },
        ],
      };

      mockUserProvider.getUserById.mockResolvedValueOnce(nonAdminUser);

      await expect(useCase.execute(command)).rejects.toThrow(
        OrganizationAdminRequiredError,
      );
    });

    it('throws error for missing git provider ID', async () => {
      const command: AddGitRepoCommand = {
        userId,
        organizationId,
        gitProviderId: '' as GitProviderId,
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        'Git provider ID is required',
      );
    });

    it('throws error for missing owner', async () => {
      const command: AddGitRepoCommand = {
        userId,
        organizationId,
        gitProviderId,
        owner: '',
        repo: 'testrepo',
        branch: 'main',
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        'Owner, repository name, and branch are all required',
      );
    });

    it('throws error for missing repo', async () => {
      const command: AddGitRepoCommand = {
        userId,
        organizationId,
        gitProviderId,
        owner: 'testowner',
        repo: '',
        branch: 'main',
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        'Owner, repository name, and branch are all required',
      );
    });

    it('throws error for missing branch', async () => {
      const command: AddGitRepoCommand = {
        userId,
        organizationId,
        gitProviderId,
        owner: 'testowner',
        repo: 'testrepo',
        branch: '',
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        'Owner, repository name, and branch are all required',
      );
    });

    it('throws error for git provider not found', async () => {
      const command: AddGitRepoCommand = {
        userId,
        organizationId,
        gitProviderId,
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
      };

      mockGitProviderService.findGitProviderById.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toThrow(
        GitProviderNotFoundError,
      );
    });

    it('throws error for git provider belonging to different organization', async () => {
      const command: AddGitRepoCommand = {
        userId,
        organizationId,
        gitProviderId,
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
      };

      const mockProvider: GitProvider = {
        id: gitProviderId,
        source: GitProviderVendors.github,
        organizationId: createOrganizationId(uuidv4()), // Different organization
        url: 'https://github.com',
        token: 'token',
      };

      mockGitProviderService.findGitProviderById.mockResolvedValue(
        mockProvider,
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        GitProviderOrganizationMismatchError,
      );
    });

    it('throws error for duplicate repository with same owner/repo/branch in organization', async () => {
      const command: AddGitRepoCommand = {
        userId,
        organizationId,
        gitProviderId,
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
      };

      const mockProvider: GitProvider = {
        id: gitProviderId,
        source: GitProviderVendors.github,
        organizationId,
        url: 'https://github.com',
        token: 'token',
      };

      const existingRepo: GitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
        providerId: gitProviderId,
      };

      mockGitProviderService.findGitProviderById.mockResolvedValue(
        mockProvider,
      );
      mockGitRepoService.findGitRepoByOwnerRepoAndBranchInOrganization.mockResolvedValue(
        existingRepo,
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        GitRepoAlreadyExistsError,
      );
    });
  });
});
