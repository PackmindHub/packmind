import { stubLogger } from '@packmind/test-utils';
import {
  GitProviderDisplayNameAlreadyUsedError,
  GitProviderDisplayNameNotEditableError,
  GitProviderNotFoundError,
  GitProviderOrganizationMismatchError,
  GitProviderVendors,
  IAccountsPort,
  InvalidGitProviderCredentialsError,
  Organization,
  User,
  createOrganizationGitHubAppId,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { gitProviderFactory } from '../../../../test';
import { GitProviderService } from '../../GitProviderService';
import { UpdateGitProviderUseCase } from './UpdateGitProviderUseCase';

describe('UpdateGitProviderUseCase', () => {
  let useCase: UpdateGitProviderUseCase;
  let mockGitProviderService: jest.Mocked<GitProviderService>;
  let accountsAdapter: jest.Mocked<IAccountsPort>;

  const organizationId = createOrganizationId('org-123');
  const adminUser: User = {
    id: createUserId('admin-123'),
    email: 'admin@example.com',
    passwordHash: null,
    active: true,
    memberships: [
      {
        userId: createUserId('admin-123'),
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

  const makeUseCase = (mode: 'shared' | 'on-prem' = 'on-prem') =>
    new UpdateGitProviderUseCase(
      mockGitProviderService,
      accountsAdapter,
      mode,
      stubLogger(),
    );

  beforeEach(() => {
    mockGitProviderService = {
      findGitProviderById: jest.fn(),
      updateGitProvider: jest.fn(),
      findGitProvidersByOrganizationId: jest.fn().mockResolvedValue([]),
    } as Partial<
      jest.Mocked<GitProviderService>
    > as jest.Mocked<GitProviderService>;

    accountsAdapter = {
      getUserById: jest.fn().mockResolvedValue(adminUser),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    useCase = makeUseCase('on-prem');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updating token on a token-method provider', () => {
    describe('when only token is updated', () => {
      it('succeeds', async () => {
        const existingProvider = gitProviderFactory({
          organizationId,
          token: 'old-token',
          authMethod: 'token',
        });
        const updatedProvider = gitProviderFactory({
          ...existingProvider,
          token: 'new-token',
        });
        mockGitProviderService.findGitProviderById.mockResolvedValue(
          existingProvider,
        );
        mockGitProviderService.updateGitProvider.mockResolvedValue(
          updatedProvider,
        );

        const result = await useCase.execute({
          id: existingProvider.id,
          gitProvider: { token: 'new-token' },
          userId: String(adminUser.id),
          organizationId: String(organizationId),
        });

        expect(result).toEqual(updatedProvider);
      });
    });
  });

  describe('switching authMethod from token to app', () => {
    describe('when switching without providing appInstallationId', () => {
      it('throws BadRequestException', async () => {
        const existingProvider = gitProviderFactory({
          organizationId,
          token: 'old-token',
          authMethod: 'token',
        });
        mockGitProviderService.findGitProviderById.mockResolvedValue(
          existingProvider,
        );

        await expect(
          useCase.execute({
            id: existingProvider.id,
            gitProvider: {
              authMethod: 'app',
              // missing appInstallationId
            },
            userId: String(adminUser.id),
            organizationId: String(organizationId),
          }),
        ).rejects.toBeInstanceOf(InvalidGitProviderCredentialsError);
      });
    });

    describe('when appInstallationId and organizationGitHubAppId are provided when switching', () => {
      it('succeeds', async () => {
        const uc = makeUseCase('on-prem');
        const orgGitHubAppId = createOrganizationGitHubAppId(
          '00000000-0000-0000-0000-000000000aaa',
        );
        const existingProvider = gitProviderFactory({
          organizationId,
          token: 'old-token',
          authMethod: 'token',
        });
        const updatedProvider = gitProviderFactory({
          ...existingProvider,
          token: null,
          authMethod: 'app',
          appInstallationId: 42,
          organizationGitHubAppId: orgGitHubAppId,
        });
        mockGitProviderService.findGitProviderById.mockResolvedValue(
          existingProvider,
        );
        mockGitProviderService.updateGitProvider.mockResolvedValue(
          updatedProvider,
        );

        const result = await uc.execute({
          id: existingProvider.id,
          gitProvider: {
            authMethod: 'app',
            token: null,
            appInstallationId: 42,
            organizationGitHubAppId: orgGitHubAppId,
          },
          userId: String(adminUser.id),
          organizationId: String(organizationId),
        });

        expect(result).toEqual(updatedProvider);
      });
    });
  });

  describe('updating an app-method provider', () => {
    describe('when replacing appInstallationId', () => {
      it('succeeds', async () => {
        const uc = makeUseCase('on-prem');
        const orgGitHubAppId = createOrganizationGitHubAppId(
          '00000000-0000-0000-0000-000000000aaa',
        );
        const existingProvider = gitProviderFactory({
          organizationId,
          token: null,
          authMethod: 'app',
          appInstallationId: 42,
          organizationGitHubAppId: orgGitHubAppId,
        });
        const updatedProvider = gitProviderFactory({
          ...existingProvider,
          appInstallationId: 99,
        });
        mockGitProviderService.findGitProviderById.mockResolvedValue(
          existingProvider,
        );
        mockGitProviderService.updateGitProvider.mockResolvedValue(
          updatedProvider,
        );

        const result = await uc.execute({
          id: existingProvider.id,
          gitProvider: { appInstallationId: 99 },
          userId: String(adminUser.id),
          organizationId: String(organizationId),
        });

        expect(result).toEqual(updatedProvider);
      });
    });
  });

  describe('existing error cases', () => {
    describe('when provider does not exist', () => {
      it('throws GitProviderNotFoundError', async () => {
        mockGitProviderService.findGitProviderById.mockResolvedValue(null);
        const provider = gitProviderFactory({ organizationId });

        await expect(
          useCase.execute({
            id: provider.id,
            gitProvider: { source: GitProviderVendors.github },
            userId: String(adminUser.id),
            organizationId: String(organizationId),
          }),
        ).rejects.toBeInstanceOf(GitProviderNotFoundError);
      });
    });

    describe('when organization does not match', () => {
      it('throws GitProviderOrganizationMismatchError', async () => {
        const otherOrgId = createOrganizationId('other-org');
        const existingProvider = gitProviderFactory({
          organizationId: otherOrgId,
          token: 'token',
          authMethod: 'token',
        });
        mockGitProviderService.findGitProviderById.mockResolvedValue(
          existingProvider,
        );

        await expect(
          useCase.execute({
            id: existingProvider.id,
            gitProvider: { token: 'new-token' },
            userId: String(adminUser.id),
            organizationId: String(organizationId),
          }),
        ).rejects.toBeInstanceOf(GitProviderOrganizationMismatchError);
      });
    });
  });

  describe('displayName updates', () => {
    describe('when renaming a token-auth provider to a unique value', () => {
      it('persists the trimmed displayName', async () => {
        const existingProvider = gitProviderFactory({
          organizationId,
          token: 'token',
          authMethod: 'token',
          displayName: 'Old',
        });
        mockGitProviderService.findGitProviderById.mockResolvedValue(
          existingProvider,
        );
        mockGitProviderService.updateGitProvider.mockResolvedValue({
          ...existingProvider,
          displayName: 'Marketplace (prod)',
        });

        await useCase.execute({
          id: existingProvider.id,
          gitProvider: { displayName: '  Marketplace (prod)  ' },
          userId: String(adminUser.id),
          organizationId: String(organizationId),
        });

        expect(mockGitProviderService.updateGitProvider).toHaveBeenCalledWith(
          existingProvider.id,
          expect.objectContaining({ displayName: 'Marketplace (prod)' }),
        );
      });
    });

    describe('when renaming to a value already used by another provider in the org', () => {
      it('throws GitProviderDisplayNameAlreadyUsedError', async () => {
        const existingProvider = gitProviderFactory({
          organizationId,
          token: 'token',
          authMethod: 'token',
          displayName: 'Sandbox',
        });
        const sibling = gitProviderFactory({
          organizationId,
          token: 'token',
          authMethod: 'token',
          displayName: 'Production',
        });
        mockGitProviderService.findGitProviderById.mockResolvedValue(
          existingProvider,
        );
        mockGitProviderService.findGitProvidersByOrganizationId.mockResolvedValue(
          [existingProvider, sibling],
        );

        await expect(
          useCase.execute({
            id: existingProvider.id,
            gitProvider: { displayName: 'production' },
            userId: String(adminUser.id),
            organizationId: String(organizationId),
          }),
        ).rejects.toBeInstanceOf(GitProviderDisplayNameAlreadyUsedError);
      });
    });

    describe('when the new value matches the current value (case-insensitive)', () => {
      it('does not raise and persists the normalized value', async () => {
        const existingProvider = gitProviderFactory({
          organizationId,
          token: 'token',
          authMethod: 'token',
          displayName: 'Production',
        });
        mockGitProviderService.findGitProviderById.mockResolvedValue(
          existingProvider,
        );
        mockGitProviderService.findGitProvidersByOrganizationId.mockResolvedValue(
          [existingProvider],
        );
        mockGitProviderService.updateGitProvider.mockResolvedValue({
          ...existingProvider,
          displayName: 'PRODUCTION',
        });

        await useCase.execute({
          id: existingProvider.id,
          gitProvider: { displayName: 'PRODUCTION' },
          userId: String(adminUser.id),
          organizationId: String(organizationId),
        });

        expect(mockGitProviderService.updateGitProvider).toHaveBeenCalledWith(
          existingProvider.id,
          expect.objectContaining({ displayName: 'PRODUCTION' }),
        );
      });
    });

    describe('when clearing the displayName to an empty string', () => {
      const existingProvider = gitProviderFactory({
        organizationId,
        token: 'token',
        authMethod: 'token',
        displayName: 'Production',
      });

      beforeEach(async () => {
        mockGitProviderService.findGitProviderById.mockResolvedValue(
          existingProvider,
        );
        mockGitProviderService.updateGitProvider.mockResolvedValue({
          ...existingProvider,
          displayName: '',
        });

        await useCase.execute({
          id: existingProvider.id,
          gitProvider: { displayName: '   ' },
          userId: String(adminUser.id),
          organizationId: String(organizationId),
        });
      });

      it('persists empty displayName', () => {
        expect(mockGitProviderService.updateGitProvider).toHaveBeenCalledWith(
          existingProvider.id,
          expect.objectContaining({ displayName: '' }),
        );
      });

      it('does not check uniqueness against other providers', () => {
        expect(
          mockGitProviderService.findGitProvidersByOrganizationId,
        ).not.toHaveBeenCalled();
      });
    });

    describe('when targeting a CLI-managed provider (no token, no app installation)', () => {
      it('throws GitProviderDisplayNameNotEditableError', async () => {
        const cliProvider = gitProviderFactory({
          organizationId,
          token: null,
          authMethod: 'token',
        });
        mockGitProviderService.findGitProviderById.mockResolvedValue(
          cliProvider,
        );

        await expect(
          useCase.execute({
            id: cliProvider.id,
            gitProvider: { displayName: 'Renamed' },
            userId: String(adminUser.id),
            organizationId: String(organizationId),
          }),
        ).rejects.toBeInstanceOf(GitProviderDisplayNameNotEditableError);
      });
    });

    describe('when targeting a provider with an active GitHub App installation', () => {
      it('allows renaming', async () => {
        const orgGitHubAppId = createOrganizationGitHubAppId(
          '00000000-0000-0000-0000-000000000aaa',
        );
        const appProvider = gitProviderFactory({
          organizationId,
          token: null,
          authMethod: 'app',
          appInstallationId: 42,
          organizationGitHubAppId: orgGitHubAppId,
          displayName: 'Old',
        });
        mockGitProviderService.findGitProviderById.mockResolvedValue(
          appProvider,
        );
        mockGitProviderService.updateGitProvider.mockResolvedValue({
          ...appProvider,
          displayName: 'Marketplace',
        });

        await useCase.execute({
          id: appProvider.id,
          gitProvider: { displayName: 'Marketplace' },
          userId: String(adminUser.id),
          organizationId: String(organizationId),
        });

        expect(mockGitProviderService.updateGitProvider).toHaveBeenCalledWith(
          appProvider.id,
          expect.objectContaining({ displayName: 'Marketplace' }),
        );
      });
    });
  });
});
