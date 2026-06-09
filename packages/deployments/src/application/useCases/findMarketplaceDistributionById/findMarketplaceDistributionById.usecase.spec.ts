import { v4 as uuidv4 } from 'uuid';
import { stubLogger } from '@packmind/test-utils';
import {
  createMarketplaceDistributionId,
  createMarketplaceId,
  createOrganizationId,
  createPackageId,
  createUserId,
  DistributionStatus,
  IAccountsPort,
  MarketplaceDistribution,
  Organization,
  User,
} from '@packmind/types';
import { IMarketplaceDistributionRepository } from '../../../domain/repositories/IMarketplaceDistributionRepository';
import { FindMarketplaceDistributionByIdUseCase } from './findMarketplaceDistributionById.usecase';

describe('FindMarketplaceDistributionByIdUseCase', () => {
  const organizationId = createOrganizationId(uuidv4());
  const otherOrganizationId = createOrganizationId(uuidv4());
  const userId = createUserId(uuidv4());
  const marketplaceId = createMarketplaceId(uuidv4());
  const packageId = createPackageId(uuidv4());
  const distributionId = createMarketplaceDistributionId(uuidv4());

  const memberUser = {
    id: userId,
    email: 'member@example.com',
    displayName: 'Member User',
    passwordHash: null,
    active: true,
    memberships: [{ userId, organizationId, role: 'member' as const }],
    trial: false,
  } as unknown as User;

  const organization: Organization = {
    id: organizationId,
    name: 'Test Org',
    slug: 'test-org',
  };

  const distribution = {
    id: distributionId,
    organizationId,
    marketplaceId,
    packageId,
    pluginSlug: 'my-plugin',
    authorId: userId,
    status: DistributionStatus.success,
    source: 'app',
  } as unknown as MarketplaceDistribution;

  let mockMarketplaceDistributionRepository: jest.Mocked<IMarketplaceDistributionRepository>;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let useCase: FindMarketplaceDistributionByIdUseCase;

  beforeEach(() => {
    mockMarketplaceDistributionRepository = {
      findById: jest.fn().mockResolvedValue(distribution),
    } as unknown as jest.Mocked<IMarketplaceDistributionRepository>;

    mockAccountsPort = {
      getUserById: jest.fn().mockResolvedValue(memberUser),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    useCase = new FindMarketplaceDistributionByIdUseCase(
      mockMarketplaceDistributionRepository,
      mockAccountsPort,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('happy path', () => {
    let response: Awaited<
      ReturnType<FindMarketplaceDistributionByIdUseCase['execute']>
    >;

    beforeEach(async () => {
      response = await useCase.execute({
        userId,
        organizationId,
        marketplaceDistributionId: distributionId,
      });
    });

    it('returns the distribution row', () => {
      expect(response.marketplaceDistribution).toEqual(distribution);
    });
  });

  describe('when the row is missing', () => {
    let response: Awaited<
      ReturnType<FindMarketplaceDistributionByIdUseCase['execute']>
    >;

    beforeEach(async () => {
      mockMarketplaceDistributionRepository.findById.mockResolvedValue(null);
      response = await useCase.execute({
        userId,
        organizationId,
        marketplaceDistributionId: distributionId,
      });
    });

    it('returns a null distribution', () => {
      expect(response.marketplaceDistribution).toBeNull();
    });
  });

  describe('when the row belongs to another organization', () => {
    let response: Awaited<
      ReturnType<FindMarketplaceDistributionByIdUseCase['execute']>
    >;

    beforeEach(async () => {
      mockMarketplaceDistributionRepository.findById.mockResolvedValue({
        ...distribution,
        organizationId: otherOrganizationId,
      } as MarketplaceDistribution);
      response = await useCase.execute({
        userId,
        organizationId,
        marketplaceDistributionId: distributionId,
      });
    });

    it('returns a null distribution', () => {
      expect(response.marketplaceDistribution).toBeNull();
    });
  });
});
