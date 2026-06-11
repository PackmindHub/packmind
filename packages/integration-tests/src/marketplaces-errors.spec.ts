import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  GitProviderMissingTokenError,
  GitProviderNotFoundError,
  GitProviderOrganizationMismatchError,
  GitRepoAlreadyLinkedAsStandardError,
  IGitPort,
  MarketplaceAlreadyLinkedError,
  MarketplaceDescriptorNotFoundError,
  MarketplaceDescriptorParseError,
  MarketplaceNotFoundError,
  MarketplaceUrlNotReachableError,
  UnknownMarketplaceDescriptorError,
  UserOrganizationMembership,
  createGitProviderId,
  createMarketplaceId,
  createUserId,
} from '@packmind/types';
import { OrganizationAdminRequiredError } from '@packmind/node-utils';
import { gitProviderFactory } from '@packmind/git/test';
import { v4 as uuidv4 } from 'uuid';
import { createIntegrationTestFixture } from './helpers/createIntegrationTestFixture';
import { DataFactory } from './helpers/DataFactory';
import { integrationTestSchemas } from './helpers/makeIntegrationTestDataSource';
import { TestApp } from './helpers/TestApp';

/**
 * Replicates `MarketplacesController.mapError` so this integration test can
 * verify that the typed domain errors thrown by the real backend stack are
 * mapped to the right NestJS HTTP exception. Keep in sync with
 * `apps/api/src/app/organizations/marketplaces/marketplaces.controller.ts`.
 */
function mapMarketplaceError(error: unknown): unknown {
  if (error instanceof MarketplaceAlreadyLinkedError) {
    return new ConflictException(error.message);
  }
  if (error instanceof GitRepoAlreadyLinkedAsStandardError) {
    return new ConflictException(error.message);
  }
  if (error instanceof MarketplaceDescriptorNotFoundError) {
    return new BadRequestException(error.message);
  }
  if (error instanceof UnknownMarketplaceDescriptorError) {
    return new BadRequestException(error.message);
  }
  if (error instanceof MarketplaceDescriptorParseError) {
    return new BadRequestException(error.message);
  }
  if (error instanceof MarketplaceUrlNotReachableError) {
    return new BadRequestException(error.message);
  }
  if (error instanceof MarketplaceNotFoundError) {
    return new NotFoundException(error.message);
  }
  if (error instanceof OrganizationAdminRequiredError) {
    return new ForbiddenException(error.message);
  }
  if (error instanceof GitProviderNotFoundError) {
    return new NotFoundException(error.message);
  }
  if (error instanceof GitProviderOrganizationMismatchError) {
    return new ForbiddenException(error.message);
  }
  if (error instanceof GitProviderMissingTokenError) {
    return new BadRequestException(error.message);
  }
  return error;
}

async function captureMappedError<T>(
  promise: Promise<T>,
): Promise<{ raw: unknown; mapped: unknown }> {
  try {
    await promise;
    throw new Error('Expected the operation to throw, but it resolved.');
  } catch (raw) {
    return { raw, mapped: mapMarketplaceError(raw) };
  }
}

describe('Marketplace HTTP boundary error mapping', () => {
  const fixture = createIntegrationTestFixture(integrationTestSchemas);

  let testApp: TestApp;
  let dataFactory: DataFactory;
  let gitPort: IGitPort;

  beforeAll(() => fixture.initialize());

  beforeEach(async () => {
    testApp = new TestApp(fixture.datasource);
    await testApp.initialize();

    dataFactory = new DataFactory(testApp);
    await dataFactory.withUserAndOrganization({ email: 'admin@example.com' });

    gitPort = testApp.gitHexa.getAdapter();

    // Stub the reconciliation job so a successful link does not try to
    // contact a real queue.
    const deploymentsAdapter = testApp.deploymentsHexa.getAdapter();
    const adapterAny = deploymentsAdapter as unknown as {
      _linkMarketplaceUseCase: {
        reconciliationJob: {
          scheduleRecurring: () => Promise<void>;
          addJob: () => Promise<string>;
          cancelRecurring: () => Promise<void>;
        };
      };
    };
    jest
      .spyOn(
        adapterAny._linkMarketplaceUseCase.reconciliationJob,
        'scheduleRecurring',
      )
      .mockResolvedValue(undefined);
    jest
      .spyOn(adapterAny._linkMarketplaceUseCase.reconciliationJob, 'addJob')
      .mockResolvedValue('mock-job-id');
    jest
      .spyOn(
        adapterAny._linkMarketplaceUseCase.reconciliationJob,
        'cancelRecurring',
      )
      .mockResolvedValue(undefined);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  /**
   * Seeds a non-admin (member) user on the same organization so the use
   * cases can exercise the `OrganizationAdminRequiredError` denial path.
   */
  async function seedNonAdminMember(): Promise<
    ReturnType<typeof createUserId>
  > {
    const userId = createUserId(uuidv4());
    const userRepo = fixture.datasource.getRepository('User');
    const membershipRepo = fixture.datasource.getRepository(
      'UserOrganizationMembership',
    );

    await userRepo.save({
      id: userId,
      email: 'member@example.com',
      displayName: 'Member User',
      passwordHash: null,
      active: true,
      trial: false,
    });

    const membership: UserOrganizationMembership = {
      userId,
      organizationId: dataFactory.organization.id,
      role: 'member',
    };
    await membershipRepo.save(membership);
    return userId;
  }

  describe('linkMarketplace', () => {
    describe('non-admin denial (AC-4)', () => {
      let raw: unknown;
      let mapped: unknown;

      beforeEach(async () => {
        const memberUserId = await seedNonAdminMember();
        // Use a real provider; the admin check fires before the use case
        // resolves it, so no further fixtures are needed.
        const { gitProvider } = await dataFactory.withGitProvider(
          gitProviderFactory({ token: 'gh-pat-test-token' }),
        );

        ({ raw, mapped } = await captureMappedError(
          testApp.deploymentsHexa.getAdapter().linkMarketplace({
            userId: memberUserId,
            organizationId: dataFactory.organization.id,
            gitProviderId: gitProvider.id,
            owner: 'anthropic',
            repo: 'marketplace',
            branch: 'main',
            name: 'Anthropic Marketplace',
          }),
        ));
      });

      it('throws OrganizationAdminRequiredError', () => {
        expect(raw).toBeInstanceOf(OrganizationAdminRequiredError);
      });

      it('maps to 403 ForbiddenException', () => {
        expect(mapped).toBeInstanceOf(ForbiddenException);
      });
    });

    describe('GitProviderNotFoundError → 404', () => {
      let raw: unknown;
      let mapped: unknown;

      beforeEach(async () => {
        const missingProviderId = createGitProviderId(uuidv4());

        ({ raw, mapped } = await captureMappedError(
          testApp.deploymentsHexa.getAdapter().linkMarketplace({
            ...dataFactory.packmindCommand(),
            gitProviderId: missingProviderId,
            owner: 'anthropic',
            repo: 'marketplace',
            branch: 'main',
            name: 'Anthropic Marketplace',
          }),
        ));
      });

      it('throws GitProviderNotFoundError', () => {
        expect(raw).toBeInstanceOf(GitProviderNotFoundError);
      });

      it('maps to NotFoundException', () => {
        expect(mapped).toBeInstanceOf(NotFoundException);
      });
    });

    describe('GitProviderMissingTokenError → 400', () => {
      describe('when the provider has no token', () => {
        let raw: unknown;
        let mapped: unknown;

        beforeEach(async () => {
          // Create a token-bearing provider through the normal flow, then null
          // the token at the DB level so the link use case sees a tokenless
          // provider — the `addGitProvider` use case rejects empty tokens up
          // front, so we cannot construct this state via the public API.
          const { gitProvider } = await dataFactory.withGitProvider(
            gitProviderFactory({ token: 'gh-pat-temp' }),
          );
          await fixture.datasource
            .createQueryRunner()
            .query('UPDATE git_providers SET token = NULL WHERE id = $1', [
              gitProvider.id,
            ]);

          ({ raw, mapped } = await captureMappedError(
            testApp.deploymentsHexa.getAdapter().linkMarketplace({
              ...dataFactory.packmindCommand(),
              gitProviderId: gitProvider.id,
              owner: 'anthropic',
              repo: 'marketplace',
              branch: 'main',
              name: 'Anthropic Marketplace',
            }),
          ));
        });

        it('throws GitProviderMissingTokenError', () => {
          expect(raw).toBeInstanceOf(GitProviderMissingTokenError);
        });

        it('maps to BadRequestException', () => {
          expect(mapped).toBeInstanceOf(BadRequestException);
        });
      });
    });

    describe('MarketplaceDescriptorNotFoundError → 400', () => {
      describe('when marketplace.json is missing', () => {
        let raw: unknown;
        let mapped: unknown;

        beforeEach(async () => {
          const { gitProvider } = await dataFactory.withGitProvider(
            gitProviderFactory({ token: 'gh-pat-test-token' }),
          );
          // Use a fresh git port spy that returns null (no descriptor file).
          jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue(null);

          ({ raw, mapped } = await captureMappedError(
            testApp.deploymentsHexa.getAdapter().linkMarketplace({
              ...dataFactory.packmindCommand(),
              gitProviderId: gitProvider.id,
              owner: 'anthropic',
              repo: 'no-marketplace-json-here',
              branch: 'main',
              name: 'Anthropic Marketplace',
            }),
          ));
        });

        it('throws MarketplaceDescriptorNotFoundError', () => {
          expect(raw).toBeInstanceOf(MarketplaceDescriptorNotFoundError);
        });

        it('maps to BadRequestException', () => {
          expect(mapped).toBeInstanceOf(BadRequestException);
        });
      });
    });

    describe('UnknownMarketplaceDescriptorError → 400', () => {
      describe('when no registered parser claims the descriptor', () => {
        let raw: unknown;
        let mapped: unknown;

        beforeEach(async () => {
          const { gitProvider } = await dataFactory.withGitProvider(
            gitProviderFactory({ token: 'gh-pat-test-token' }),
          );
          // No `plugins` array → AnthropicParser declines → registry throws
          // UnknownMarketplaceDescriptorError.
          jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue({
            sha: 'mock-sha',
            content: JSON.stringify({ name: 'foreign-format', other: 'shape' }),
          });

          ({ raw, mapped } = await captureMappedError(
            testApp.deploymentsHexa.getAdapter().linkMarketplace({
              ...dataFactory.packmindCommand(),
              gitProviderId: gitProvider.id,
              owner: 'foreign',
              repo: 'descriptor',
              branch: 'main',
              name: 'Foreign Format Marketplace',
            }),
          ));
        });

        it('throws UnknownMarketplaceDescriptorError', () => {
          expect(raw).toBeInstanceOf(UnknownMarketplaceDescriptorError);
        });

        it('maps to BadRequestException', () => {
          expect(mapped).toBeInstanceOf(BadRequestException);
        });
      });
    });

    describe('MarketplaceDescriptorParseError → 400', () => {
      describe('when the descriptor is malformed JSON', () => {
        let raw: unknown;
        let mapped: unknown;

        beforeEach(async () => {
          const { gitProvider } = await dataFactory.withGitProvider(
            gitProviderFactory({ token: 'gh-pat-test-token' }),
          );
          jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue({
            sha: 'mock-sha',
            content: '{ this is not valid json',
          });

          ({ raw, mapped } = await captureMappedError(
            testApp.deploymentsHexa.getAdapter().linkMarketplace({
              ...dataFactory.packmindCommand(),
              gitProviderId: gitProvider.id,
              owner: 'broken',
              repo: 'descriptor',
              branch: 'main',
              name: 'Broken Descriptor Marketplace',
            }),
          ));
        });

        it('throws MarketplaceDescriptorParseError', () => {
          expect(raw).toBeInstanceOf(MarketplaceDescriptorParseError);
        });

        it('maps to BadRequestException', () => {
          expect(mapped).toBeInstanceOf(BadRequestException);
        });
      });
    });

    describe('MarketplaceAlreadyLinkedError → 409 with verbatim contract message (AC-5)', () => {
      let raw: unknown;
      let mapped: unknown;

      beforeEach(async () => {
        const { gitProvider } = await dataFactory.withGitProvider(
          gitProviderFactory({ token: 'gh-pat-test-token' }),
        );
        jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue({
          sha: 'mock-sha',
          content: JSON.stringify({
            name: 'Anthropic Marketplace',
            vendor: 'anthropic',
            plugins: [{ name: 'plugin-alpha' }],
          }),
        });

        // First link — succeeds.
        await testApp.deploymentsHexa.getAdapter().linkMarketplace({
          ...dataFactory.packmindCommand(),
          gitProviderId: gitProvider.id,
          owner: 'anthropic',
          repo: 'marketplace',
          branch: 'main',
          name: 'Anthropic Marketplace',
        });

        // Second link with the same coords — should be rejected.
        ({ raw, mapped } = await captureMappedError(
          testApp.deploymentsHexa.getAdapter().linkMarketplace({
            ...dataFactory.packmindCommand(),
            gitProviderId: gitProvider.id,
            owner: 'anthropic',
            repo: 'marketplace',
            branch: 'main',
            name: 'Anthropic Marketplace (again)',
          }),
        ));
      });

      it('throws MarketplaceAlreadyLinkedError', () => {
        expect(raw).toBeInstanceOf(MarketplaceAlreadyLinkedError);
      });

      it('carries the exact contract message on the raw error', () => {
        expect((raw as Error).message).toBe(
          'The marketplace anthropic/marketplace has already been linked to your organization',
        );
      });

      it('maps to ConflictException', () => {
        expect(mapped).toBeInstanceOf(ConflictException);
      });

      it('carries the exact contract message on the mapped exception', () => {
        expect((mapped as ConflictException).message).toBe(
          'The marketplace anthropic/marketplace has already been linked to your organization',
        );
      });
    });

    describe('GitRepoAlreadyLinkedAsStandardError → 409', () => {
      describe('when the coords are already a standard repo', () => {
        let raw: unknown;
        let mapped: unknown;

        beforeEach(async () => {
          const { gitProvider } = await dataFactory.withGitProvider(
            gitProviderFactory({ token: 'gh-pat-test-token' }),
          );
          // Seed a standard repo via the normal flow.
          await dataFactory.withGitRepo({
            owner: 'octocat',
            repo: 'hello-world',
            branch: 'main',
            providerId: gitProvider.id,
          });

          ({ raw, mapped } = await captureMappedError(
            testApp.deploymentsHexa.getAdapter().linkMarketplace({
              ...dataFactory.packmindCommand(),
              gitProviderId: gitProvider.id,
              owner: 'octocat',
              repo: 'hello-world',
              branch: 'main',
              name: 'Trying to link as marketplace',
            }),
          ));
        });

        it('throws GitRepoAlreadyLinkedAsStandardError', () => {
          expect(raw).toBeInstanceOf(GitRepoAlreadyLinkedAsStandardError);
        });

        it('maps to ConflictException', () => {
          expect(mapped).toBeInstanceOf(ConflictException);
        });
      });
    });
  });

  describe('unlinkMarketplace', () => {
    describe('MarketplaceNotFoundError → 404 (AC-10)', () => {
      describe('when the marketplace does not exist', () => {
        let raw: unknown;
        let mapped: unknown;

        beforeEach(async () => {
          const unknownMarketplaceId = createMarketplaceId(uuidv4());

          ({ raw, mapped } = await captureMappedError(
            testApp.deploymentsHexa.getAdapter().unlinkMarketplace({
              ...dataFactory.packmindCommand(),
              marketplaceId: unknownMarketplaceId,
            }),
          ));
        });

        it('throws MarketplaceNotFoundError', () => {
          expect(raw).toBeInstanceOf(MarketplaceNotFoundError);
        });

        it('maps to NotFoundException', () => {
          expect(mapped).toBeInstanceOf(NotFoundException);
        });
      });
    });

    describe('non-admin denial (AC-4)', () => {
      let raw: unknown;
      let mapped: unknown;

      beforeEach(async () => {
        const memberUserId = await seedNonAdminMember();
        const someMarketplaceId = createMarketplaceId(uuidv4());

        ({ raw, mapped } = await captureMappedError(
          testApp.deploymentsHexa.getAdapter().unlinkMarketplace({
            userId: memberUserId,
            organizationId: dataFactory.organization.id,
            marketplaceId: someMarketplaceId,
          }),
        ));
      });

      it('throws OrganizationAdminRequiredError', () => {
        expect(raw).toBeInstanceOf(OrganizationAdminRequiredError);
      });

      it('maps to 403 ForbiddenException', () => {
        expect(mapped).toBeInstanceOf(ForbiddenException);
      });
    });
  });
});
