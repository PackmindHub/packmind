import { AddGitRepoUseCase } from './AddGitRepoUseCase';
import { GitProviderService } from '../../GitProviderService';
import { GitRepoService } from '../../GitRepoService';
import { AddGitRepoCommand } from '../../../domain/useCases/IAddGitRepo';
import {
  GitProvider,
  GitProviderId,
  createGitProviderId,
  GitProviderVendors,
} from '@packmind/types';
import { GitRepo, createGitRepoId } from '@packmind/types';
import {
  IAccountsPort,
  User,
  Organization,
  IDeploymentPort,
  Target,
  createTargetId,
  GitRepoAlreadyExistsError,
  GitProviderMissingTokenError,
  GitProviderNotFoundError,
  GitProviderOrganizationMismatchError,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { v4 as uuidv4 } from 'uuid';

describe('AddGitRepoUseCase', () => {
  let useCase: AddGitRepoUseCase;
  let mockGitProviderService: jest.Mocked<GitProviderService>;
  let mockGitRepoService: jest.Mocked<GitRepoService>;
  let mockDeploymentPort: jest.Mocked<IDeploymentPort>;
  let mockAccountsAdapter: jest.Mocked<IAccountsPort>;

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
      displayName: 'admin',
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

    mockAccountsAdapter = {
      getUserById: jest.fn().mockResolvedValue(adminUser),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    useCase = new AddGitRepoUseCase(
      mockGitProviderService,
      mockGitRepoService,
      mockAccountsAdapter,
      mockDeploymentPort,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when adding a valid repository', () => {
    let command: AddGitRepoCommand;
    let mockProvider: GitProvider;
    let expectedResult: GitRepo;
    let result: GitRepo;

    beforeEach(async () => {
      command = {
        userId,
        organizationId,
        gitProviderId,
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
      };

      mockProvider = {
        id: gitProviderId,
        source: GitProviderVendors.github,
        organizationId,
        url: 'https://github.com',
        token: 'token',
        authMethod: 'token',
      };

      expectedResult = {
        id: createGitRepoId(uuidv4()),
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
        providerId: gitProviderId,
        type: 'standard',
      };

      mockGitProviderService.findGitProviderById.mockResolvedValue(
        mockProvider,
      );
      mockGitRepoService.findGitRepoByOwnerRepoAndBranchInOrganization.mockResolvedValue(
        null,
      );
      mockGitRepoService.addGitRepo.mockResolvedValue(expectedResult);

      result = await useCase.execute(command);
    });

    it('returns the created repository', () => {
      expect(result).toEqual(expectedResult);
    });

    it('calls findGitProviderById with the correct provider id', () => {
      expect(mockGitProviderService.findGitProviderById).toHaveBeenCalledWith(
        gitProviderId,
      );
    });

    it('calls findGitRepoByOwnerRepoAndBranchInOrganization with the correct parameters', () => {
      expect(
        mockGitRepoService.findGitRepoByOwnerRepoAndBranchInOrganization,
      ).toHaveBeenCalledWith('testowner', 'testrepo', 'main', organizationId);
    });

    it('calls addGitRepo with the correct repository data including type=standard', () => {
      expect(mockGitRepoService.addGitRepo).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
        providerId: gitProviderId,
        type: 'standard',
      });
    });
  });

  describe('when an existing marketplace-typed repo shares the same coordinates', () => {
    let command: AddGitRepoCommand;
    let mockProvider: GitProvider;
    let expectedResult: GitRepo;
    let result: GitRepo;

    beforeEach(async () => {
      command = {
        userId,
        organizationId,
        gitProviderId,
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
      };

      mockProvider = {
        id: gitProviderId,
        source: GitProviderVendors.github,
        organizationId,
        url: 'https://github.com',
        token: 'token',
      };

      expectedResult = {
        id: createGitRepoId(uuidv4()),
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
        providerId: gitProviderId,
        type: 'standard',
      };

      mockGitProviderService.findGitProviderById.mockResolvedValue(
        mockProvider,
      );

      // GitRepoService.findGitRepoByOwnerRepoAndBranchInOrganization filters
      // to type='standard' by default, so a same-coordinate marketplace row
      // does NOT surface here and the duplicate check passes.
      mockGitRepoService.findGitRepoByOwnerRepoAndBranchInOrganization.mockResolvedValue(
        null,
      );
      mockGitRepoService.addGitRepo.mockResolvedValue(expectedResult);

      result = await useCase.execute(command);
    });

    it('does not throw GitRepoAlreadyExistsError — standard and marketplace are tracked independently', () => {
      expect(result).toEqual(expectedResult);
    });
  });

  describe('when adding a repository with a different branch', () => {
    let command: AddGitRepoCommand;
    let mockProvider: GitProvider;
    let expectedResult: GitRepo;
    let result: GitRepo;

    beforeEach(async () => {
      command = {
        userId,
        organizationId,
        gitProviderId,
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'develop',
      };

      mockProvider = {
        id: gitProviderId,
        source: GitProviderVendors.github,
        organizationId,
        url: 'https://github.com',
        token: 'token',
        authMethod: 'token',
      };

      expectedResult = {
        id: createGitRepoId(uuidv4()),
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'develop',
        providerId: gitProviderId,
        type: 'standard',
      };

      mockGitProviderService.findGitProviderById.mockResolvedValue(
        mockProvider,
      );
      mockGitRepoService.findGitRepoByOwnerRepoAndBranchInOrganization.mockResolvedValue(
        null,
      );
      mockGitRepoService.addGitRepo.mockResolvedValue(expectedResult);

      result = await useCase.execute(command);
    });

    it('returns the created repository', () => {
      expect(result).toEqual(expectedResult);
    });

    it('calls findGitRepoByOwnerRepoAndBranchInOrganization with the develop branch', () => {
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

  describe('when deployment port is available', () => {
    let useCaseWithDeployment: AddGitRepoUseCase;
    let command: AddGitRepoCommand;
    let mockProvider: GitProvider;
    let expectedResult: GitRepo;
    let mockTarget: Target;
    let result: GitRepo;

    beforeEach(async () => {
      useCaseWithDeployment = new AddGitRepoUseCase(
        mockGitProviderService,
        mockGitRepoService,
        mockAccountsAdapter,
        mockDeploymentPort,
        stubLogger(),
      );

      command = {
        userId,
        organizationId,
        gitProviderId,
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
      };

      mockProvider = {
        id: gitProviderId,
        source: GitProviderVendors.github,
        organizationId,
        url: 'https://github.com',
        token: 'token',
        authMethod: 'token',
      };

      expectedResult = {
        id: createGitRepoId(uuidv4()),
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
        providerId: gitProviderId,
        type: 'standard',
      };

      mockTarget = {
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

      result = await useCaseWithDeployment.execute(command);
    });

    it('returns the created repository', () => {
      expect(result).toEqual(expectedResult);
    });

    it('calls addTarget with the default target configuration', () => {
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
        authMethod: 'token',
      };

      mockGitProviderService.findGitProviderById.mockResolvedValue(
        mockProvider,
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        GitProviderOrganizationMismatchError,
      );
    });

    it('throws error for git provider with null token', async () => {
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
        token: null,
        authMethod: 'token',
      };

      mockGitProviderService.findGitProviderById.mockResolvedValue(
        mockProvider,
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        GitProviderMissingTokenError,
      );
    });

    it('accepts GitHub App provider without a stored token', async () => {
      const command: AddGitRepoCommand = {
        userId,
        organizationId,
        gitProviderId,
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
      };

      // App-auth providers carry no token — the installation token is minted
      // on demand by GithubTokenResolverFactory downstream.
      const mockProvider: GitProvider = {
        id: gitProviderId,
        source: GitProviderVendors.github,
        organizationId,
        url: 'https://github.com',
        token: null,
        authMethod: 'app',
        appInstallationId: 12345,
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
        authMethod: 'token',
      };

      const existingRepo: GitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
        providerId: gitProviderId,
        type: 'standard',
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

  describe('allowTokenlessProvider flag', () => {
    it('allows tokenless provider if allowTokenlessProvider is true', async () => {
      const command: AddGitRepoCommand = {
        userId,
        organizationId,
        gitProviderId,
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
        allowTokenlessProvider: true,
      };

      const mockProvider: GitProvider = {
        id: gitProviderId,
        source: GitProviderVendors.github,
        organizationId,
        url: 'https://github.com',
        token: null,
        authMethod: 'token',
      };

      const expectedResult: GitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
        providerId: gitProviderId,
        type: 'standard',
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
    });

    it('rejects tokenless provider if allowTokenlessProvider is false', async () => {
      const command: AddGitRepoCommand = {
        userId,
        organizationId,
        gitProviderId,
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
        allowTokenlessProvider: false,
      };

      const mockProvider: GitProvider = {
        id: gitProviderId,
        source: GitProviderVendors.github,
        organizationId,
        url: 'https://github.com',
        token: null,
        authMethod: 'token',
      };

      mockGitProviderService.findGitProviderById.mockResolvedValue(
        mockProvider,
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        GitProviderMissingTokenError,
      );
    });

    it('rejects tokenless provider if allowTokenlessProvider is not provided', async () => {
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
        token: null,
        authMethod: 'token',
      };

      mockGitProviderService.findGitProviderById.mockResolvedValue(
        mockProvider,
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        GitProviderMissingTokenError,
      );
    });
  });
});
