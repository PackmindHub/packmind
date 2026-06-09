import { AddGitProviderUseCase } from './AddGitProviderUseCase';
import { GitProviderService } from '../../GitProviderService';
import {
  GitProviderDisplayNameAlreadyUsedError,
  GitProviderVendor,
  GitProviderVendors,
  createGitProviderId,
  createOrganizationGitHubAppId,
} from '@packmind/types';
import {
  IAccountsPort,
  createOrganizationId,
  createUserId,
  User,
  Organization,
} from '@packmind/types';
import { gitProviderFactory } from '../../../../test';
import { stubLogger } from '@packmind/test-utils';

describe('AddGitProviderUseCase', () => {
  let useCase: AddGitProviderUseCase;
  let mockGitProviderService: jest.Mocked<GitProviderService>;
  let accountsAdapter: jest.Mocked<IAccountsPort>;
  const organizationId = createOrganizationId('org-123');
  const memberUser: User = {
    id: createUserId('user-123'),
    email: 'member@example.com',
    passwordHash: null,
    active: true,
    memberships: [
      {
        userId: createUserId('user-123'),
        organizationId,
        role: 'member',
      },
    ],
  };
  const organization: Organization = {
    id: organizationId,
    name: 'Test Org',
    slug: 'test-org',
  };

  beforeEach(() => {
    mockGitProviderService = {
      addGitProvider: jest.fn(),
      findGitProvidersByOrganizationId: jest.fn().mockResolvedValue([]),
    } as Partial<
      jest.Mocked<GitProviderService>
    > as jest.Mocked<GitProviderService>;

    accountsAdapter = {
      getUserById: jest.fn().mockResolvedValue(memberUser),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    useCase = new AddGitProviderUseCase(
      mockGitProviderService,
      accountsAdapter,
      'on-prem',
      stubLogger(),
    );
  });

  describe('when adding git provider with organization association', () => {
    const input = {
      gitProvider: {
        source: GitProviderVendors.github,
        url: 'https://github.com',
        token: 'test-token',
        authMethod: 'token' as const,
      },
      organizationId: organizationId,
      userId: memberUser.id,
    };

    let result: Awaited<ReturnType<typeof useCase.execute>>;
    let expectedResult: ReturnType<typeof gitProviderFactory>;

    beforeEach(async () => {
      expectedResult = gitProviderFactory({
        id: createGitProviderId('provider-123'),
        ...input.gitProvider,
        organizationId: input.organizationId,
      });

      mockGitProviderService.addGitProvider.mockResolvedValue(expectedResult);

      result = await useCase.execute(input);
    });

    it('returns the created git provider', () => {
      expect(result).toEqual(expectedResult);
    });

    it('calls addGitProvider with correct parameters', () => {
      expect(mockGitProviderService.addGitProvider).toHaveBeenCalledWith({
        ...input.gitProvider,
        displayName: '',
        organizationId: input.organizationId,
      });
    });

    it('retrieves user by id', () => {
      expect(accountsAdapter.getUserById).toHaveBeenCalledWith(input.userId);
    });
  });

  describe('when git provider token is missing', () => {
    const input = {
      gitProvider: {
        source: GitProviderVendors.github,
        url: 'https://github.com',
        token: '',
        authMethod: 'token' as const,
      },
      organizationId: organizationId,
      userId: memberUser.id,
    };

    let thrownError: Error | null = null;

    beforeEach(async () => {
      thrownError = null;
      try {
        await useCase.execute(input);
      } catch (error) {
        thrownError = error as Error;
      }
    });

    it('throws error', () => {
      expect(thrownError?.message).toBe('Git provider token is required');
    });

    it('does not call addGitProvider', () => {
      expect(mockGitProviderService.addGitProvider).not.toHaveBeenCalled();
    });
  });

  describe('when git provider source is missing', () => {
    const input = {
      gitProvider: {
        source: undefined as unknown as GitProviderVendor,
        url: 'https://github.com',
        token: 'test-token',
        authMethod: 'token' as const,
      },
      organizationId: organizationId,
      userId: memberUser.id,
    };

    let thrownError: Error | null = null;

    beforeEach(async () => {
      thrownError = null;
      try {
        await useCase.execute(input);
      } catch (error) {
        thrownError = error as Error;
      }
    });

    it('throws error', () => {
      expect(thrownError?.message).toBe('Git provider source is required');
    });

    it('does not call addGitProvider', () => {
      expect(mockGitProviderService.addGitProvider).not.toHaveBeenCalled();
    });
  });

  describe('authMethod validation', () => {
    const makeUseCase = (mode: 'shared' | 'on-prem') =>
      new AddGitProviderUseCase(
        mockGitProviderService,
        accountsAdapter,
        mode,
        stubLogger(),
      );

    describe('token auth method', () => {
      describe('when token is present', () => {
        it('succeeds', async () => {
          const uc = makeUseCase('on-prem');
          const expectedResult = gitProviderFactory({
            organizationId,
            token: 'my-token',
            authMethod: 'token',
          });
          mockGitProviderService.addGitProvider.mockResolvedValue(
            expectedResult,
          );

          const result = await uc.execute({
            gitProvider: {
              source: GitProviderVendors.github,
              url: 'https://github.com',
              token: 'my-token',
              authMethod: 'token',
            },
            organizationId,
            userId: memberUser.id,
          });

          expect(result).toEqual(expectedResult);
        });
      });

      describe('when token is missing and allowTokenlessProvider is false', () => {
        it('throws BadRequestException', async () => {
          const uc = makeUseCase('on-prem');

          await expect(
            uc.execute({
              gitProvider: {
                source: GitProviderVendors.github,
                url: 'https://github.com',
                token: '',
                authMethod: 'token',
              },
              organizationId,
              userId: memberUser.id,
              allowTokenlessProvider: false,
            }),
          ).rejects.toThrow('Git provider token is required');
        });
      });
    });

    const orgGitHubAppId = createOrganizationGitHubAppId(
      '00000000-0000-0000-0000-000000000aaa',
    );

    describe('app auth method on shared mode', () => {
      describe('when only appInstallationId is provided (shared mode does not require organizationGitHubAppId)', () => {
        it('succeeds', async () => {
          const uc = makeUseCase('shared');
          const expectedResult = gitProviderFactory({
            organizationId,
            token: null,
            authMethod: 'app',
            appInstallationId: 42,
          });
          mockGitProviderService.addGitProvider.mockResolvedValue(
            expectedResult,
          );

          const result = await uc.execute({
            gitProvider: {
              source: GitProviderVendors.github,
              url: 'https://github.com',
              token: null,
              authMethod: 'app',
              appInstallationId: 42,
            },
            organizationId,
            userId: memberUser.id,
          });

          expect(result).toEqual(expectedResult);
        });
      });

      describe('when appInstallationId is missing on shared mode', () => {
        it('throws', async () => {
          const uc = makeUseCase('shared');

          await expect(
            uc.execute({
              gitProvider: {
                source: GitProviderVendors.github,
                url: 'https://github.com',
                token: null,
                authMethod: 'app',
              },
              organizationId,
              userId: memberUser.id,
            }),
          ).rejects.toThrow('GitHub App installation ID is required');
        });
      });
    });

    describe('app auth method on on-prem mode', () => {
      describe('when appInstallationId and organizationGitHubAppId are provided', () => {
        it('succeeds', async () => {
          const uc = makeUseCase('on-prem');
          const expectedResult = gitProviderFactory({
            organizationId,
            token: null,
            authMethod: 'app',
            appInstallationId: 42,
            organizationGitHubAppId: orgGitHubAppId,
          });
          mockGitProviderService.addGitProvider.mockResolvedValue(
            expectedResult,
          );

          const result = await uc.execute({
            gitProvider: {
              source: GitProviderVendors.github,
              url: 'https://github.com',
              token: null,
              authMethod: 'app',
              appInstallationId: 42,
              organizationGitHubAppId: orgGitHubAppId,
            },
            organizationId,
            userId: memberUser.id,
          });

          expect(result).toEqual(expectedResult);
        });
      });

      describe('when appInstallationId is missing', () => {
        it('throws', async () => {
          const uc = makeUseCase('on-prem');

          await expect(
            uc.execute({
              gitProvider: {
                source: GitProviderVendors.github as GitProviderVendor,
                url: 'https://github.com',
                token: null,
                authMethod: 'app' as const,
                organizationGitHubAppId: orgGitHubAppId,
              },
              organizationId,
              userId: memberUser.id,
            }),
          ).rejects.toThrow('GitHub App installation ID is required');
        });
      });

      describe('when organizationGitHubAppId is missing on on-prem mode', () => {
        it('throws', async () => {
          const uc = makeUseCase('on-prem');

          await expect(
            uc.execute({
              gitProvider: {
                source: GitProviderVendors.github,
                url: 'https://github.com',
                token: null,
                authMethod: 'app',
                appInstallationId: 42,
              },
              organizationId,
              userId: memberUser.id,
            }),
          ).rejects.toThrow(
            'organizationGitHubAppId is required when authMethod is "app"',
          );
        });
      });

      describe('when token is set with app authMethod', () => {
        it('throws BadRequestException', async () => {
          const uc = makeUseCase('on-prem');

          await expect(
            uc.execute({
              gitProvider: {
                source: GitProviderVendors.github,
                url: 'https://github.com',
                token: 'some-token',
                authMethod: 'app',
                appInstallationId: 42,
                organizationGitHubAppId: orgGitHubAppId,
              },
              organizationId,
              userId: memberUser.id,
            }),
          ).rejects.toThrow('Token must not be set when authMethod is "app"');
        });
      });
    });
  });

  describe('allowTokenlessProvider flag', () => {
    describe('when allowTokenlessProvider is true', () => {
      const input = {
        gitProvider: {
          source: GitProviderVendors.github,
          url: 'https://github.com',
          token: null,
          authMethod: 'token' as const,
        },
        organizationId: organizationId,
        userId: memberUser.id,
        allowTokenlessProvider: true,
      };

      let result: Awaited<ReturnType<typeof useCase.execute>>;
      let expectedResult: ReturnType<typeof gitProviderFactory>;

      beforeEach(async () => {
        expectedResult = gitProviderFactory({
          id: createGitProviderId('provider-123'),
          ...input.gitProvider,
          organizationId: input.organizationId,
        });

        mockGitProviderService.addGitProvider.mockResolvedValue(expectedResult);

        result = await useCase.execute(input);
      });

      it('returns the created git provider', () => {
        expect(result).toEqual(expectedResult);
      });

      it('calls addGitProvider', () => {
        expect(mockGitProviderService.addGitProvider).toHaveBeenCalled();
      });
    });

    describe('when allowTokenlessProvider is false', () => {
      const input = {
        gitProvider: {
          source: GitProviderVendors.github,
          url: 'https://github.com',
          token: null,
          authMethod: 'token' as const,
        },
        organizationId: organizationId,
        userId: memberUser.id,
        allowTokenlessProvider: false,
      };

      let thrownError: Error | null = null;

      beforeEach(async () => {
        thrownError = null;
        try {
          await useCase.execute(input);
        } catch (error) {
          thrownError = error as Error;
        }
      });

      it('throws error', () => {
        expect(thrownError?.message).toBe('Git provider token is required');
      });

      it('does not call addGitProvider', () => {
        expect(mockGitProviderService.addGitProvider).not.toHaveBeenCalled();
      });
    });

    describe('when allowTokenlessProvider is not provided', () => {
      const input = {
        gitProvider: {
          source: GitProviderVendors.github,
          url: 'https://github.com',
          token: null,
          authMethod: 'token' as const,
        },
        organizationId: organizationId,
        userId: memberUser.id,
      };

      let thrownError: Error | null = null;

      beforeEach(async () => {
        thrownError = null;
        try {
          await useCase.execute(input);
        } catch (error) {
          thrownError = error as Error;
        }
      });

      it('throws error', () => {
        expect(thrownError?.message).toBe('Git provider token is required');
      });

      it('does not call addGitProvider', () => {
        expect(mockGitProviderService.addGitProvider).not.toHaveBeenCalled();
      });
    });
  });

  describe('displayName validation', () => {
    const baseInput = {
      gitProvider: {
        source: GitProviderVendors.github,
        url: 'https://github.com',
        token: 'test-token',
        authMethod: 'token' as const,
      },
      organizationId,
      userId: memberUser.id,
    };

    describe('when displayName is omitted', () => {
      it('persists empty displayName', async () => {
        mockGitProviderService.addGitProvider.mockResolvedValue(
          gitProviderFactory(),
        );

        await useCase.execute(baseInput);

        expect(mockGitProviderService.addGitProvider).toHaveBeenCalledWith(
          expect.objectContaining({ displayName: '' }),
        );
      });
    });

    describe('when displayName is provided with surrounding whitespace', () => {
      it('persists the trimmed value', async () => {
        mockGitProviderService.addGitProvider.mockResolvedValue(
          gitProviderFactory(),
        );

        await useCase.execute({
          ...baseInput,
          gitProvider: { ...baseInput.gitProvider, displayName: '  Prod  ' },
        });

        expect(mockGitProviderService.addGitProvider).toHaveBeenCalledWith(
          expect.objectContaining({ displayName: 'Prod' }),
        );
      });
    });

    describe('when displayName is whitespace-only', () => {
      beforeEach(async () => {
        mockGitProviderService.addGitProvider.mockResolvedValue(
          gitProviderFactory(),
        );

        await useCase.execute({
          ...baseInput,
          gitProvider: { ...baseInput.gitProvider, displayName: '   ' },
        });
      });

      it('persists empty displayName', () => {
        expect(mockGitProviderService.addGitProvider).toHaveBeenCalledWith(
          expect.objectContaining({ displayName: '' }),
        );
      });

      it('does not check uniqueness against other providers', () => {
        expect(
          mockGitProviderService.findGitProvidersByOrganizationId,
        ).not.toHaveBeenCalled();
      });
    });

    describe('when displayName exceeds 64 characters', () => {
      it('persists the value truncated to 64 characters', async () => {
        mockGitProviderService.addGitProvider.mockResolvedValue(
          gitProviderFactory(),
        );
        const longName = 'a'.repeat(100);

        await useCase.execute({
          ...baseInput,
          gitProvider: { ...baseInput.gitProvider, displayName: longName },
        });

        expect(mockGitProviderService.addGitProvider).toHaveBeenCalledWith(
          expect.objectContaining({ displayName: 'a'.repeat(64) }),
        );
      });
    });

    describe('when another provider in the org already uses the same name (case-insensitive)', () => {
      it('throws GitProviderDisplayNameAlreadyUsedError', async () => {
        mockGitProviderService.findGitProvidersByOrganizationId.mockResolvedValue(
          [
            gitProviderFactory({
              organizationId,
              displayName: 'Production',
            }),
          ],
        );

        await expect(
          useCase.execute({
            ...baseInput,
            gitProvider: {
              ...baseInput.gitProvider,
              displayName: 'production',
            },
          }),
        ).rejects.toBeInstanceOf(GitProviderDisplayNameAlreadyUsedError);
      });
    });

    describe('when another provider in the org has an empty displayName', () => {
      it('allows creating another provider with an empty displayName', async () => {
        mockGitProviderService.findGitProvidersByOrganizationId.mockResolvedValue(
          [gitProviderFactory({ organizationId, displayName: '' })],
        );
        mockGitProviderService.addGitProvider.mockResolvedValue(
          gitProviderFactory(),
        );

        await useCase.execute(baseInput);

        expect(mockGitProviderService.addGitProvider).toHaveBeenCalledWith(
          expect.objectContaining({ displayName: '' }),
        );
      });
    });
  });
});
