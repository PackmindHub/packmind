import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  createGitProviderId,
  createGitRepoId,
  createMarketplaceId,
  createOrganizationId,
  createUserId,
  GitProviderMissingTokenError,
  GitProviderNotFoundError,
  GitProviderOrganizationMismatchError,
  GitRepoAlreadyLinkedAsStandardError,
  IDeploymentPort,
  LinkMarketplaceResponse,
  ListMarketplacesResponse,
  Marketplace,
  MarketplaceAlreadyLinkedError,
  MarketplaceDescriptor,
  MarketplaceDescriptorNotFoundError,
  MarketplaceDescriptorParseError,
  MarketplaceNotFoundError,
  MarketplaceUrlNotReachableError,
  UnknownMarketplaceDescriptorError,
  UnlinkMarketplaceResponse,
  ValidateMarketplaceUrlResponse,
} from '@packmind/types';
import {
  AuthenticatedRequest,
  OrganizationAdminRequiredError,
} from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import { MarketplacesController } from './marketplaces.controller';
import { LinkMarketplaceBodyDto } from './dto/LinkMarketplaceBody.dto';
import { ValidateMarketplaceUrlQueryDto } from './dto/ValidateMarketplaceUrlQuery.dto';

describe('MarketplacesController', () => {
  const organizationId = createOrganizationId(
    '11111111-1111-1111-1111-111111111111',
  );
  const userId = createUserId('22222222-2222-2222-2222-222222222222');
  const gitProviderId = createGitProviderId(
    '33333333-3333-3333-3333-333333333333',
  );
  const gitRepoId = createGitRepoId('44444444-4444-4444-4444-444444444444');
  const marketplaceId = createMarketplaceId(
    '55555555-5555-5555-5555-555555555555',
  );

  const baseRequest = {
    user: { userId, name: 'Test User' },
    organization: {
      id: organizationId,
      name: 'Test',
      slug: 'test',
      role: 'admin',
    },
    clientSource: 'ui',
  } as unknown as AuthenticatedRequest;

  const descriptor: MarketplaceDescriptor = {
    vendor: 'anthropic',
    name: 'Anthropic Marketplace',
    plugins: [],
    raw: {},
  };

  const marketplace: Marketplace = {
    id: marketplaceId,
    organizationId,
    gitRepoId,
    name: 'Anthropic Marketplace',
    vendor: 'anthropic',
    addedBy: userId,
    linkedAt: new Date('2026-05-29T10:00:00.000Z'),
    state: 'healthy',
    lastValidatedAt: new Date('2026-05-29T10:00:00.000Z'),
    descriptor,
    pluginCount: 3,
    createdAt: new Date('2026-05-29T10:00:00.000Z'),
    updatedAt: new Date('2026-05-29T10:00:00.000Z'),
    deletedAt: null,
  };

  const linkResponse: LinkMarketplaceResponse = {
    ...marketplace,
    addedByUserName: 'Test User',
  };

  let controller: MarketplacesController;
  let mockDeploymentAdapter: jest.Mocked<IDeploymentPort>;

  beforeEach(() => {
    mockDeploymentAdapter = {
      linkMarketplace: jest.fn(),
      unlinkMarketplace: jest.fn(),
      listMarketplaces: jest.fn(),
      validateMarketplaceUrl: jest.fn(),
    } as unknown as jest.Mocked<IDeploymentPort>;

    controller = new MarketplacesController(
      mockDeploymentAdapter,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /organizations/:orgId/marketplaces (linkMarketplace)', () => {
    const body: LinkMarketplaceBodyDto = {
      gitProviderId,
      owner: 'anthropic',
      repo: 'marketplace',
      branch: 'main',
      name: 'Anthropic Marketplace',
    };

    describe('on successful link', () => {
      let result: LinkMarketplaceResponse;

      beforeEach(async () => {
        mockDeploymentAdapter.linkMarketplace.mockResolvedValue(linkResponse);

        result = await controller.linkMarketplace(
          organizationId,
          body,
          baseRequest,
        );
      });

      it('returns the response from the deployment adapter', () => {
        expect(result).toEqual(linkResponse);
      });

      it('forwards the command to the deployment adapter', () => {
        expect(mockDeploymentAdapter.linkMarketplace).toHaveBeenCalledWith({
          userId,
          organizationId,
          gitProviderId,
          owner: body.owner,
          repo: body.repo,
          branch: body.branch,
          name: body.name,
          source: 'ui',
        });
      });
    });

    describe('error mapping', () => {
      it('maps MarketplaceAlreadyLinkedError to ConflictException with verbatim contract message', async () => {
        const error = new MarketplaceAlreadyLinkedError(body.owner, body.repo);
        mockDeploymentAdapter.linkMarketplace.mockRejectedValue(error);

        await expect(
          controller.linkMarketplace(organizationId, body, baseRequest),
        ).rejects.toMatchObject({
          constructor: ConflictException,
          message: `The marketplace ${body.owner}/${body.repo} has already been linked to your organization`,
        });
      });

      it('maps GitRepoAlreadyLinkedAsStandardError to ConflictException (409)', async () => {
        mockDeploymentAdapter.linkMarketplace.mockRejectedValue(
          new GitRepoAlreadyLinkedAsStandardError(body.owner, body.repo),
        );

        await expect(
          controller.linkMarketplace(organizationId, body, baseRequest),
        ).rejects.toBeInstanceOf(ConflictException);
      });

      it('maps MarketplaceDescriptorNotFoundError to BadRequestException (400) naming the missing file', async () => {
        const descriptorError = new MarketplaceDescriptorNotFoundError(
          body.owner,
          body.repo,
        );
        mockDeploymentAdapter.linkMarketplace.mockRejectedValue(
          descriptorError,
        );

        await expect(
          controller.linkMarketplace(organizationId, body, baseRequest),
        ).rejects.toMatchObject({
          constructor: BadRequestException,
          message: descriptorError.message,
        });
      });

      it('maps UnknownMarketplaceDescriptorError to BadRequestException (400)', async () => {
        mockDeploymentAdapter.linkMarketplace.mockRejectedValue(
          new UnknownMarketplaceDescriptorError(),
        );

        await expect(
          controller.linkMarketplace(organizationId, body, baseRequest),
        ).rejects.toBeInstanceOf(BadRequestException);
      });

      it('maps MarketplaceDescriptorParseError to BadRequestException (400)', async () => {
        mockDeploymentAdapter.linkMarketplace.mockRejectedValue(
          new MarketplaceDescriptorParseError(
            'Invalid JSON',
            new Error('boom'),
          ),
        );

        await expect(
          controller.linkMarketplace(organizationId, body, baseRequest),
        ).rejects.toBeInstanceOf(BadRequestException);
      });

      it('maps GitProviderNotFoundError to NotFoundException (404) without leaking the provider UUID', async () => {
        mockDeploymentAdapter.linkMarketplace.mockRejectedValue(
          new GitProviderNotFoundError(gitProviderId),
        );

        await expect(
          controller.linkMarketplace(organizationId, body, baseRequest),
        ).rejects.toMatchObject({
          constructor: NotFoundException,
          // The fixed message carries no UUID — asserting it exactly proves
          // the provider id never reaches the user.
          message: 'The selected Git provider could not be found.',
        });
      });

      it('maps GitProviderOrganizationMismatchError to ForbiddenException (403) without leaking the provider UUID', async () => {
        mockDeploymentAdapter.linkMarketplace.mockRejectedValue(
          new GitProviderOrganizationMismatchError(
            gitProviderId,
            organizationId,
          ),
        );

        await expect(
          controller.linkMarketplace(organizationId, body, baseRequest),
        ).rejects.toMatchObject({
          constructor: ForbiddenException,
          message:
            'The selected Git provider does not belong to your organization.',
        });
      });

      it('maps GitProviderMissingTokenError to BadRequestException (400) without leaking the provider UUID', async () => {
        mockDeploymentAdapter.linkMarketplace.mockRejectedValue(
          new GitProviderMissingTokenError(gitProviderId),
        );

        await expect(
          controller.linkMarketplace(organizationId, body, baseRequest),
        ).rejects.toMatchObject({
          constructor: BadRequestException,
          // The fixed message carries no UUID — asserting it exactly proves
          // the provider id never reaches the user.
          message:
            'The selected Git provider has no access token configured. Connect it in your Git settings and try again.',
        });
      });

      it('maps OrganizationAdminRequiredError to ForbiddenException (403) for non-admin link attempts', async () => {
        mockDeploymentAdapter.linkMarketplace.mockRejectedValue(
          new OrganizationAdminRequiredError({ userId, organizationId }),
        );

        await expect(
          controller.linkMarketplace(organizationId, body, baseRequest),
        ).rejects.toBeInstanceOf(ForbiddenException);
      });

      it('rethrows unknown errors unchanged', async () => {
        const original = new Error('boom');
        mockDeploymentAdapter.linkMarketplace.mockRejectedValue(original);

        await expect(
          controller.linkMarketplace(organizationId, body, baseRequest),
        ).rejects.toBe(original);
      });
    });
  });

  describe('DELETE /organizations/:orgId/marketplaces/:marketplaceId (unlinkMarketplace)', () => {
    const unlinkResponse: UnlinkMarketplaceResponse = { marketplaceId };

    describe('on successful unlink', () => {
      let result: UnlinkMarketplaceResponse;

      beforeEach(async () => {
        mockDeploymentAdapter.unlinkMarketplace.mockResolvedValue(
          unlinkResponse,
        );

        result = await controller.unlinkMarketplace(
          organizationId,
          marketplaceId,
          baseRequest,
        );
      });

      it('returns the response from the deployment adapter', () => {
        expect(result).toEqual(unlinkResponse);
      });

      it('forwards the command to the deployment adapter', () => {
        expect(mockDeploymentAdapter.unlinkMarketplace).toHaveBeenCalledWith({
          userId,
          organizationId,
          marketplaceId,
          source: 'ui',
        });
      });
    });

    describe('error mapping', () => {
      it('maps MarketplaceNotFoundError to NotFoundException (404) without leaking the marketplace UUID', async () => {
        mockDeploymentAdapter.unlinkMarketplace.mockRejectedValue(
          new MarketplaceNotFoundError(marketplaceId),
        );

        await expect(
          controller.unlinkMarketplace(
            organizationId,
            marketplaceId,
            baseRequest,
          ),
        ).rejects.toMatchObject({
          constructor: NotFoundException,
          // The fixed message carries no UUID — asserting it exactly proves
          // the marketplace id never reaches the user.
          message:
            'The marketplace could not be found. It may have already been unlinked.',
        });
      });

      it('maps OrganizationAdminRequiredError to ForbiddenException (403) for non-admin unlink attempts', async () => {
        mockDeploymentAdapter.unlinkMarketplace.mockRejectedValue(
          new OrganizationAdminRequiredError({ userId, organizationId }),
        );

        await expect(
          controller.unlinkMarketplace(
            organizationId,
            marketplaceId,
            baseRequest,
          ),
        ).rejects.toBeInstanceOf(ForbiddenException);
      });

      it('rethrows unknown errors unchanged', async () => {
        const original = new Error('boom');
        mockDeploymentAdapter.unlinkMarketplace.mockRejectedValue(original);

        await expect(
          controller.unlinkMarketplace(
            organizationId,
            marketplaceId,
            baseRequest,
          ),
        ).rejects.toBe(original);
      });
    });
  });

  describe('GET /organizations/:orgId/marketplaces (listMarketplaces)', () => {
    describe('for any member', () => {
      const listResponse: ListMarketplacesResponse = [
        {
          ...marketplace,
          addedByUserName: 'Test User',
          repository: {
            owner: 'acme',
            repo: 'plugins',
            branch: 'main',
            providerSource: 'github',
            url: 'https://github.com/acme/plugins',
          },
        },
      ];
      let result: ListMarketplacesResponse;

      beforeEach(async () => {
        mockDeploymentAdapter.listMarketplaces.mockResolvedValue(listResponse);

        result = await controller.listMarketplaces(organizationId, baseRequest);
      });

      it('returns 200-equivalent body with the list of marketplaces', () => {
        expect(result).toEqual(listResponse);
      });

      it('forwards the command to the deployment adapter', () => {
        expect(mockDeploymentAdapter.listMarketplaces).toHaveBeenCalledWith({
          userId,
          organizationId,
          source: 'ui',
        });
      });
    });

    describe('when the organization has no marketplaces', () => {
      it('returns an empty array', async () => {
        mockDeploymentAdapter.listMarketplaces.mockResolvedValue([]);

        const result = await controller.listMarketplaces(
          organizationId,
          baseRequest,
        );

        expect(result).toEqual([]);
      });
    });

    it('rethrows unknown errors unchanged', async () => {
      const original = new Error('boom');
      mockDeploymentAdapter.listMarketplaces.mockRejectedValue(original);

      await expect(
        controller.listMarketplaces(organizationId, baseRequest),
      ).rejects.toBe(original);
    });
  });

  describe('GET /organizations/:orgId/marketplaces/validate-url (validateMarketplaceUrl)', () => {
    const query: ValidateMarketplaceUrlQueryDto = {
      url: 'https://github.com/anthropic/marketplace',
    };

    const validateResponse: ValidateMarketplaceUrlResponse = {
      kind: 'verified',
      repoPath: 'anthropic/marketplace',
      defaultBranch: 'main',
      pluginCount: 3,
    };

    describe('on successful validation', () => {
      let result: ValidateMarketplaceUrlResponse;

      beforeEach(async () => {
        mockDeploymentAdapter.validateMarketplaceUrl.mockResolvedValue(
          validateResponse,
        );

        result = await controller.validateMarketplaceUrl(
          organizationId,
          query,
          baseRequest,
        );
      });

      it('returns the response from the deployment adapter', () => {
        expect(result).toEqual(validateResponse);
      });

      it('forwards the command to the deployment adapter', () => {
        expect(
          mockDeploymentAdapter.validateMarketplaceUrl,
        ).toHaveBeenCalledWith({
          userId,
          organizationId,
          url: query.url,
          source: 'ui',
        });
      });
    });

    describe('error mapping', () => {
      it('maps MarketplaceDescriptorNotFoundError to BadRequestException (400)', async () => {
        mockDeploymentAdapter.validateMarketplaceUrl.mockRejectedValue(
          new MarketplaceDescriptorNotFoundError('anthropic', 'marketplace'),
        );

        await expect(
          controller.validateMarketplaceUrl(organizationId, query, baseRequest),
        ).rejects.toBeInstanceOf(BadRequestException);
      });

      it('maps UnknownMarketplaceDescriptorError to BadRequestException (400)', async () => {
        mockDeploymentAdapter.validateMarketplaceUrl.mockRejectedValue(
          new UnknownMarketplaceDescriptorError(),
        );

        await expect(
          controller.validateMarketplaceUrl(organizationId, query, baseRequest),
        ).rejects.toBeInstanceOf(BadRequestException);
      });

      it('maps MarketplaceDescriptorParseError to BadRequestException (400)', async () => {
        mockDeploymentAdapter.validateMarketplaceUrl.mockRejectedValue(
          new MarketplaceDescriptorParseError(
            'Invalid JSON',
            new Error('boom'),
          ),
        );

        await expect(
          controller.validateMarketplaceUrl(organizationId, query, baseRequest),
        ).rejects.toBeInstanceOf(BadRequestException);
      });

      it('maps MarketplaceUrlNotReachableError to BadRequestException (400)', async () => {
        mockDeploymentAdapter.validateMarketplaceUrl.mockRejectedValue(
          new MarketplaceUrlNotReachableError(query.url),
        );

        await expect(
          controller.validateMarketplaceUrl(organizationId, query, baseRequest),
        ).rejects.toBeInstanceOf(BadRequestException);
      });
    });
  });
});
