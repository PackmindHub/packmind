import {
  createMarketplaceDistributionId,
  createMarketplaceId,
  createOrganizationId,
  createPackageId,
  createUserId,
  DistributionStatus,
  FindMarketplaceDistributionByIdResponse,
  IDeploymentPort,
  MarketplaceDistribution,
} from '@packmind/types';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import { MarketplaceDistributionsController } from './marketplace-distributions.controller';

describe('MarketplaceDistributionsController', () => {
  const organizationId = createOrganizationId(
    '11111111-1111-1111-1111-111111111111',
  );
  const userId = createUserId('22222222-2222-2222-2222-222222222222');
  const marketplaceId = createMarketplaceId(
    '33333333-3333-3333-3333-333333333333',
  );
  const packageId = createPackageId('44444444-4444-4444-4444-444444444444');
  const marketplaceDistributionId = createMarketplaceDistributionId(
    '55555555-5555-5555-5555-555555555555',
  );

  const baseRequest = {
    user: { userId, name: 'Test User' },
    organization: {
      id: organizationId,
      name: 'Test',
      slug: 'test',
      role: 'member',
    },
    clientSource: 'ui',
  } as unknown as AuthenticatedRequest;

  const distributionRow: MarketplaceDistribution = {
    id: marketplaceDistributionId,
    organizationId,
    marketplaceId,
    packageId,
    pluginSlug: 'security',
    authorId: userId,
    status: DistributionStatus.in_progress,
    source: 'app',
  } as MarketplaceDistribution;

  let mockDeploymentAdapter: jest.Mocked<IDeploymentPort>;
  let controller: MarketplaceDistributionsController;

  beforeEach(() => {
    mockDeploymentAdapter = {
      findMarketplaceDistributionById: jest.fn(),
    } as unknown as jest.Mocked<IDeploymentPort>;

    controller = new MarketplaceDistributionsController(
      mockDeploymentAdapter,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('on successful lookup', () => {
    let result: FindMarketplaceDistributionByIdResponse;

    beforeEach(async () => {
      mockDeploymentAdapter.findMarketplaceDistributionById.mockResolvedValue({
        marketplaceDistribution: distributionRow,
      });
      result = await controller.getMarketplaceDistributionById(
        organizationId,
        marketplaceDistributionId,
        baseRequest,
      );
    });

    it('returns the wrapped distribution row', () => {
      expect(result).toEqual({ marketplaceDistribution: distributionRow });
    });

    it('forwards the command to the deployment adapter', () => {
      expect(
        mockDeploymentAdapter.findMarketplaceDistributionById,
      ).toHaveBeenCalledWith({
        userId,
        organizationId,
        marketplaceDistributionId,
        source: 'ui',
      });
    });
  });

  describe('when the distribution is not found', () => {
    let result: FindMarketplaceDistributionByIdResponse;

    beforeEach(async () => {
      mockDeploymentAdapter.findMarketplaceDistributionById.mockResolvedValue({
        marketplaceDistribution: null,
      });
      result = await controller.getMarketplaceDistributionById(
        organizationId,
        marketplaceDistributionId,
        baseRequest,
      );
    });

    it('returns null inside the response wrapper', () => {
      expect(result).toEqual({ marketplaceDistribution: null });
    });
  });
});
