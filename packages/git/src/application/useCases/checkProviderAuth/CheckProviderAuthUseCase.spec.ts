import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createUserId,
  IAccountsPort,
  Organization,
  User,
} from '@packmind/types';
import { gitProviderFactory } from '../../../../test';
import { GitProviderService } from '../../GitProviderService';
import { CheckProviderAuthUseCase } from './CheckProviderAuthUseCase';

describe('CheckProviderAuthUseCase', () => {
  let useCase: CheckProviderAuthUseCase;
  let mockGitProviderService: jest.Mocked<GitProviderService>;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;

  const organizationId = createOrganizationId('org-123');
  const userId = createUserId('user-123');

  const user: User = {
    id: userId,
    email: 'test@example.com',
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

  const organization: Organization = {
    id: organizationId,
    name: 'Test Organization',
    slug: 'test-org',
  };

  beforeEach(() => {
    mockGitProviderService = {
      findGitProviderById: jest.fn(),
      checkProviderAuth: jest.fn(),
    } as Partial<
      jest.Mocked<GitProviderService>
    > as jest.Mocked<GitProviderService>;

    mockAccountsPort = {
      getUserById: jest.fn().mockResolvedValue(user),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    useCase = new CheckProviderAuthUseCase(
      mockAccountsPort,
      mockGitProviderService,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when the provider belongs to the member organization', () => {
    describe('and the probe succeeds', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;
      let providerId: ReturnType<typeof gitProviderFactory>['id'];

      beforeEach(async () => {
        const provider = gitProviderFactory({ organizationId });
        providerId = provider.id;
        mockGitProviderService.findGitProviderById.mockResolvedValue(provider);
        mockGitProviderService.checkProviderAuth.mockResolvedValue({
          ok: true,
        });

        result = await useCase.execute({
          organizationId,
          userId,
          gitProviderId: provider.id,
        });
      });

      it('delegates to the service with the provider id', () => {
        expect(mockGitProviderService.checkProviderAuth).toHaveBeenCalledWith(
          providerId,
        );
      });

      it('returns the ok result', () => {
        expect(result).toEqual({ ok: true });
      });
    });

    describe('and the probe fails with a reason', () => {
      it('propagates the failure verbatim', async () => {
        const provider = gitProviderFactory({ organizationId });
        mockGitProviderService.findGitProviderById.mockResolvedValue(provider);
        mockGitProviderService.checkProviderAuth.mockResolvedValue({
          ok: false,
          reason: 'unauthorized',
        });

        const result = await useCase.execute({
          organizationId,
          userId,
          gitProviderId: provider.id,
        });

        expect(result).toEqual({ ok: false, reason: 'unauthorized' });
      });
    });
  });

  describe('when the provider does not exist', () => {
    let executePromise: Promise<unknown>;

    beforeEach(() => {
      mockGitProviderService.findGitProviderById.mockResolvedValue(null);
      const provider = gitProviderFactory({ organizationId });
      executePromise = useCase.execute({
        organizationId,
        userId,
        gitProviderId: provider.id,
      });
      // Swallow the rejection here; each test below asserts its own facet.
      executePromise.catch(() => undefined);
    });

    it('rejects with Git provider not found', async () => {
      await expect(executePromise).rejects.toThrow('Git provider not found');
    });

    it('never calls the service probe', async () => {
      await executePromise.catch(() => undefined);
      expect(mockGitProviderService.checkProviderAuth).not.toHaveBeenCalled();
    });
  });

  describe('when the provider belongs to another organization', () => {
    let executePromise: Promise<unknown>;

    beforeEach(() => {
      const provider = gitProviderFactory({
        organizationId: createOrganizationId('other-org'),
      });
      mockGitProviderService.findGitProviderById.mockResolvedValue(provider);
      executePromise = useCase.execute({
        organizationId,
        userId,
        gitProviderId: provider.id,
      });
      executePromise.catch(() => undefined);
    });

    it('rejects with Git provider not found, not leaking existence', async () => {
      await expect(executePromise).rejects.toThrow('Git provider not found');
    });

    it('never calls the service probe', async () => {
      await executePromise.catch(() => undefined);
      expect(mockGitProviderService.checkProviderAuth).not.toHaveBeenCalled();
    });
  });
});
