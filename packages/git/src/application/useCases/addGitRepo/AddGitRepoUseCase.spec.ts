import { AddGitRepoUseCase } from './AddGitRepoUseCase';
import { GitProviderService } from '../../GitProviderService';
import { GitRepoService } from '../../GitRepoService';
import {
  GitProvider,
  GitProviderId,
  createGitProviderId,
  GitProviderVendors,
  AddGitRepoCommand,
  GitRepo,
  createGitRepoId,
  IAccountsPort,
  User,
  Organization,
  IDeploymentPort,
  Target,
  createTargetId,
  GitRepoAlreadyExistsError,
  GitProviderMissingTokenError,
  GitProviderOrganizationMismatchError,
  MissingGitInputError,
  createOrganizationId,
  createUserId,
} from '@packmind/types';

import { organizationFactory, userFactory } from '@packmind/accounts/test';
import { stubLogger, mockInterface } from '@packmind/test-utils';
import { v4 as uuidv4 } from 'uuid';
import { gitProviderFactory, gitRepoFactory } from '../../../../test';

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
      deleteGitProviderIfEmpty: jest.fn(),
    } as Partial<
      jest.Mocked<GitProviderService>
    > as jest.Mocked<GitProviderService>;

    mockGitRepoService = {
      findGitRepoByOwnerRepoAndBranchInOrganization: jest.fn(),
      addGitRepo: jest.fn(),
      adoptGitRepo: jest.fn(),
    } as Partial<jest.Mocked<GitRepoService>> as jest.Mocked<GitRepoService>;

    mockDeploymentPort = {
      addTarget: jest.fn(),
    } as Partial<jest.Mocked<IDeploymentPort>> as jest.Mocked<IDeploymentPort>;

    const adminUser: User = userFactory({
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
    });

    const organization: Organization = organizationFactory({
      id: organizationId,
      name: 'Test Org',
      slug: 'test-org',
    });

    mockAccountsAdapter = mockInterface<IAccountsPort>();
    mockAccountsAdapter.getUserById.mockResolvedValue(adminUser);
    mockAccountsAdapter.getOrganizationById.mockResolvedValue(organization);

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

      mockProvider = gitProviderFactory({
        id: gitProviderId,
        source: GitProviderVendors.github,
        organizationId,
        url: 'https://github.com',
        token: 'token',
        authMethod: 'token',
      });

      expectedResult = gitRepoFactory({
        id: createGitRepoId(uuidv4()),
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
        providerId: gitProviderId,
        type: 'standard',
      });

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
        isTracked: false,
        trackingRemovedAt: null,
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

      mockProvider = gitProviderFactory({
        id: gitProviderId,
        source: GitProviderVendors.github,
        organizationId,
        url: 'https://github.com',
        token: 'token',
      });

      expectedResult = gitRepoFactory({
        id: createGitRepoId(uuidv4()),
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
        providerId: gitProviderId,
        type: 'standard',
      });

      mockGitProviderService.findGitProviderById.mockResolvedValue(
        mockProvider,
      );

      // The finder defaults to type='standard', so a marketplace row at the
      // same coordinates never surfaces and the duplicate check passes.
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

      mockProvider = gitProviderFactory({
        id: gitProviderId,
        source: GitProviderVendors.github,
        organizationId,
        url: 'https://github.com',
        token: 'token',
        authMethod: 'token',
      });

      expectedResult = gitRepoFactory({
        id: createGitRepoId(uuidv4()),
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'develop',
        providerId: gitProviderId,
        type: 'standard',
      });

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

      mockProvider = gitProviderFactory({
        id: gitProviderId,
        source: GitProviderVendors.github,
        organizationId,
        url: 'https://github.com',
        token: 'token',
        authMethod: 'token',
      });

      expectedResult = gitRepoFactory({
        id: createGitRepoId(uuidv4()),
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
        providerId: gitProviderId,
        type: 'standard',
      });

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

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        MissingGitInputError,
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

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        MissingGitInputError,
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

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        MissingGitInputError,
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

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        MissingGitInputError,
      );
    });

    it('throws GitProviderOrganizationMismatchError for git provider not found', async () => {
      const command: AddGitRepoCommand = {
        userId,
        organizationId,
        gitProviderId,
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
      };

      mockGitProviderService.findGitProviderById.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        GitProviderOrganizationMismatchError,
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

      const mockProvider: GitProvider = gitProviderFactory({
        id: gitProviderId,
        source: GitProviderVendors.github,
        organizationId: createOrganizationId(uuidv4()), // Different organization
        url: 'https://github.com',
        token: 'token',
        authMethod: 'token',
      });

      mockGitProviderService.findGitProviderById.mockResolvedValue(
        mockProvider,
      );

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
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

      const mockProvider: GitProvider = gitProviderFactory({
        id: gitProviderId,
        source: GitProviderVendors.github,
        organizationId,
        url: 'https://github.com',
        token: null,
        authMethod: 'token',
      });

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

      // App-auth providers carry no token: it is minted on demand downstream.
      const mockProvider: GitProvider = gitProviderFactory({
        id: gitProviderId,
        source: GitProviderVendors.github,
        organizationId,
        url: 'https://github.com',
        token: null,
        authMethod: 'app',
        appInstallationId: 12345,
      });

      const expectedResult: GitRepo = gitRepoFactory({
        id: createGitRepoId(uuidv4()),
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
        providerId: gitProviderId,
      });

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

      const mockProvider: GitProvider = gitProviderFactory({
        id: gitProviderId,
        source: GitProviderVendors.github,
        organizationId,
        url: 'https://github.com',
        token: 'token',
        authMethod: 'token',
      });

      const existingRepo: GitRepo = gitRepoFactory({
        id: createGitRepoId(uuidv4()),
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
        providerId: gitProviderId,
        type: 'standard',
      });

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

    describe('when the duplicate is held by a CLI-managed provider that cannot be adopted', () => {
      const holdingProviderId = createGitProviderId(uuidv4());
      let error: unknown;

      beforeEach(async () => {
        const authenticatedProvider = gitProviderFactory({
          id: gitProviderId,
          source: GitProviderVendors.gitlab,
          organizationId,
          url: 'https://gitlab.acme.io',
          token: 'token',
          authMethod: 'token',
        });
        const cliManagedProvider = gitProviderFactory({
          id: holdingProviderId,
          source: GitProviderVendors.gitlab,
          organizationId,
          url: 'https://gitlab.com',
          token: null,
          authMethod: 'token',
        });

        mockGitProviderService.findGitProviderById.mockImplementation(
          async (id: GitProviderId) =>
            id === holdingProviderId
              ? cliManagedProvider
              : authenticatedProvider,
        );
        mockGitRepoService.findGitRepoByOwnerRepoAndBranchInOrganization.mockResolvedValue(
          gitRepoFactory({
            owner: 'testowner',
            repo: 'testrepo',
            branch: 'main',
            providerId: holdingProviderId,
            type: 'standard',
          }),
        );

        error = await useCase
          .execute({
            userId,
            organizationId,
            gitProviderId,
            owner: 'testowner',
            repo: 'testrepo',
            branch: 'main',
          })
          .catch((e) => e);
      });

      it('throws GitRepoAlreadyExistsError', () => {
        expect(error).toBeInstanceOf(GitRepoAlreadyExistsError);
      });

      it('names the holding provider and flags it as CLI-managed', () => {
        expect((error as GitRepoAlreadyExistsError).holder).toEqual({
          gitProviderId: holdingProviderId,
          cliManaged: true,
        });
      });
    });
  });

  describe('when a CLI-managed provider already holds the repository', () => {
    const holdingProviderId = createGitProviderId(uuidv4());
    const existingRepoId = createGitRepoId(uuidv4());
    let existingRepo: GitRepo;
    let adoptedRepo: GitRepo;

    const cliManagedProvider = (
      overrides: Partial<GitProvider> = {},
    ): GitProvider =>
      gitProviderFactory({
        id: holdingProviderId,
        source: GitProviderVendors.gitlab,
        organizationId,
        url: 'https://gitlab.com',
        token: null,
        authMethod: 'token',
        ...overrides,
      });

    const authenticatedProvider = (
      overrides: Partial<GitProvider> = {},
    ): GitProvider =>
      gitProviderFactory({
        id: gitProviderId,
        source: GitProviderVendors.gitlab,
        organizationId,
        url: 'https://gitlab.com',
        token: 'token',
        authMethod: 'token',
        ...overrides,
      });

    const givenProviders = (target: GitProvider, holding: GitProvider) => {
      mockGitProviderService.findGitProviderById.mockImplementation(
        async (id: GitProviderId) => (id === holding.id ? holding : target),
      );
    };

    const addRepo = (overrides: Partial<AddGitRepoCommand> = {}) =>
      useCase.execute({
        userId,
        organizationId,
        gitProviderId,
        owner: 'optimetriks',
        repo: 'smala-native',
        branch: 'v4staging',
        ...overrides,
      });

    beforeEach(() => {
      existingRepo = gitRepoFactory({
        id: existingRepoId,
        owner: 'optimetriks',
        repo: 'smala-native',
        branch: 'v4staging',
        providerId: holdingProviderId,
        type: 'standard',
      });
      adoptedRepo = { ...existingRepo, providerId: gitProviderId };

      mockGitRepoService.findGitRepoByOwnerRepoAndBranchInOrganization.mockResolvedValue(
        existingRepo,
      );
      mockGitRepoService.adoptGitRepo.mockResolvedValue(adoptedRepo);
    });

    describe('when the authenticated provider targets the same host', () => {
      let result: GitRepo;

      beforeEach(async () => {
        givenProviders(
          authenticatedProvider({ url: 'https://GitLab.com/' }),
          cliManagedProvider(),
        );

        result = await addRepo();
      });

      it('returns the adopted repository', () => {
        expect(result).toEqual(adoptedRepo);
      });

      it('moves the existing repository under the authenticated provider', () => {
        expect(mockGitRepoService.adoptGitRepo).toHaveBeenCalledWith(
          existingRepo,
          gitProviderId,
          organizationId,
          'optimetriks',
        );
      });

      it('creates no new repository', () => {
        expect(mockGitRepoService.addGitRepo).not.toHaveBeenCalled();
      });

      it('creates no new target', () => {
        expect(mockDeploymentPort.addTarget).not.toHaveBeenCalled();
      });

      it('removes the CLI-managed provider if it holds no repository any more', () => {
        expect(
          mockGitProviderService.deleteGitProviderIfEmpty,
        ).toHaveBeenCalledWith(holdingProviderId, userId);
      });
    });

    describe('when a GitHub App installation stores no URL', () => {
      beforeEach(async () => {
        givenProviders(
          authenticatedProvider({
            source: GitProviderVendors.github,
            url: null,
            token: null,
            authMethod: 'app',
            appInstallationId: 42,
          }),
          cliManagedProvider({
            source: GitProviderVendors.github,
            url: 'https://github.com',
          }),
        );

        await addRepo({ allowTokenlessProvider: true });
      });

      it('adopts the repository recorded for github.com', () => {
        expect(mockGitRepoService.adoptGitRepo).toHaveBeenCalledWith(
          existingRepo,
          gitProviderId,
          organizationId,
          'optimetriks',
        );
      });
    });

    describe('when the target provider is itself CLI-managed', () => {
      it('throws GitRepoAlreadyExistsError', async () => {
        givenProviders(
          authenticatedProvider({ token: null }),
          cliManagedProvider(),
        );

        await expect(addRepo({ allowTokenlessProvider: true })).rejects.toThrow(
          GitRepoAlreadyExistsError,
        );
      });
    });

    describe('when the CLI recorded a self-hosted instance as an unknown vendor', () => {
      beforeEach(async () => {
        givenProviders(
          authenticatedProvider({ url: 'https://gitlab.acme.io' }),
          cliManagedProvider({
            source: GitProviderVendors.unknown,
            url: 'https://gitlab.acme.io',
          }),
        );

        await addRepo();
      });

      it('adopts the repository', () => {
        expect(mockGitRepoService.adoptGitRepo).toHaveBeenCalledWith(
          existingRepo,
          gitProviderId,
          organizationId,
          'optimetriks',
        );
      });
    });

    describe('when the CLI recorded the owner under an installation path prefix', () => {
      beforeEach(async () => {
        const prefixedRepo = { ...existingRepo, owner: 'gitlab/optimetriks' };
        mockGitRepoService.findGitRepoByOwnerRepoAndBranchInOrganization.mockImplementation(
          async (owner) =>
            owner === 'gitlab/optimetriks' ? prefixedRepo : null,
        );
        givenProviders(
          authenticatedProvider({ url: 'https://devtools.acme.io/gitlab' }),
          cliManagedProvider({
            source: GitProviderVendors.unknown,
            url: 'https://devtools.acme.io',
          }),
        );

        await addRepo();
      });

      it('adopts it under the owner the provider reports', () => {
        expect(mockGitRepoService.adoptGitRepo).toHaveBeenCalledWith(
          expect.objectContaining({ owner: 'gitlab/optimetriks' }),
          gitProviderId,
          organizationId,
          'optimetriks',
        );
      });
    });

    describe('when the providers are on different hosts', () => {
      it('throws GitRepoAlreadyExistsError', async () => {
        givenProviders(
          authenticatedProvider({ url: 'https://gitlab.acme.io' }),
          cliManagedProvider({
            source: GitProviderVendors.unknown,
            url: 'https://gitlab.acme.io.evil.com',
          }),
        );

        await expect(addRepo()).rejects.toThrow(GitRepoAlreadyExistsError);
      });
    });

    describe('when the holding provider has credentials', () => {
      let error: unknown;

      beforeEach(async () => {
        givenProviders(
          authenticatedProvider(),
          cliManagedProvider({ token: 'another-token' }),
        );

        error = await addRepo().catch((e) => e);
      });

      it('throws GitRepoAlreadyExistsError', () => {
        expect(error).toBeInstanceOf(GitRepoAlreadyExistsError);
      });

      it('does not move the repository', () => {
        expect(mockGitRepoService.adoptGitRepo).not.toHaveBeenCalled();
      });
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

      const mockProvider: GitProvider = gitProviderFactory({
        id: gitProviderId,
        source: GitProviderVendors.github,
        organizationId,
        url: 'https://github.com',
        token: null,
        authMethod: 'token',
      });

      const expectedResult: GitRepo = gitRepoFactory({
        id: createGitRepoId(uuidv4()),
        owner: 'testowner',
        repo: 'testrepo',
        branch: 'main',
        providerId: gitProviderId,
        type: 'standard',
      });

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

      const mockProvider: GitProvider = gitProviderFactory({
        id: gitProviderId,
        source: GitProviderVendors.github,
        organizationId,
        url: 'https://github.com',
        token: null,
        authMethod: 'token',
      });

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

      const mockProvider: GitProvider = gitProviderFactory({
        id: gitProviderId,
        source: GitProviderVendors.github,
        organizationId,
        url: 'https://github.com',
        token: null,
        authMethod: 'token',
      });

      mockGitProviderService.findGitProviderById.mockResolvedValue(
        mockProvider,
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        GitProviderMissingTokenError,
      );
    });
  });
});
