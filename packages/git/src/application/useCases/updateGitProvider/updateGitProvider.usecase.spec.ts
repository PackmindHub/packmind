import { stubLogger } from '@packmind/test-utils';
import {
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
import { UpdateGitProviderUseCase } from './updateGitProvider.usecase';

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

  const makeUseCase = (edition: 'cloud' | 'oss' = 'oss') =>
    new UpdateGitProviderUseCase(
      mockGitProviderService,
      accountsAdapter,
      edition,
      stubLogger(),
    );

  beforeEach(() => {
    mockGitProviderService = {
      findGitProviderById: jest.fn(),
      updateGitProvider: jest.fn(),
    } as Partial<
      jest.Mocked<GitProviderService>
    > as jest.Mocked<GitProviderService>;

    accountsAdapter = {
      getUserById: jest.fn().mockResolvedValue(adminUser),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    useCase = makeUseCase('oss');
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
        const uc = makeUseCase('oss');
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
        const uc = makeUseCase('oss');
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
});
