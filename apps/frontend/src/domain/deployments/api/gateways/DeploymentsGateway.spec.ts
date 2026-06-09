import { ApiService } from '../../../../services/api/ApiService';
import { DeploymentsGatewayApi } from './DeploymentsGateway';
import type {
  FindMarketplaceDistributionByIdResponse,
  MarketplaceDistribution,
  MarketplaceDistributionId,
  MarketplaceId,
  OrganizationId,
  PackageId,
  PublishPackageOnMarketplaceResponse,
} from '@packmind/types';

describe('DeploymentsGatewayApi - marketplace publish wrappers', () => {
  const organizationId = 'org-1' as OrganizationId;
  const marketplaceId = 'mkt-1' as MarketplaceId;
  const packageId = 'pkg-1' as PackageId;
  const marketplaceDistributionId =
    'md-1' as unknown as MarketplaceDistributionId;

  let postMock: jest.Mock;
  let getMock: jest.Mock;
  let apiServiceMock: ApiService;
  let gateway: DeploymentsGatewayApi;

  beforeEach(() => {
    postMock = jest.fn();
    getMock = jest.fn();
    apiServiceMock = {
      baseApiUrl: 'http://localhost/api/v0',
      post: postMock,
      get: getMock,
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      getAxiosInstance: jest.fn(),
    } as unknown as ApiService;

    // The default constructor wires the real api service; we replace it
    // through the protected field once for testability — mirrors the
    // structure of PackmindGateway without leaking the injection surface.
    gateway = new DeploymentsGatewayApi();
    (gateway as unknown as { _api: ApiService })._api = apiServiceMock;
  });

  describe('publishPackageOnMarketplace', () => {
    describe('when the api service resolves with a publish response', () => {
      const response: PublishPackageOnMarketplaceResponse = {
        marketplaceDistributionId,
        status: 'in_progress',
        marketplaceId,
        packageId,
        pluginSlug: 'my-plugin',
      };
      let result: PublishPackageOnMarketplaceResponse;

      beforeEach(async () => {
        postMock.mockResolvedValueOnce(response);

        result = await gateway.publishPackageOnMarketplace({
          organizationId,
          marketplaceId,
          packageId,
        });
      });

      it('POSTs the marketplace publish endpoint with the package id', () => {
        expect(postMock).toHaveBeenCalledWith(
          `/organizations/${organizationId}/marketplaces/${marketplaceId}/publish`,
          { packageId },
        );
      });

      it('returns the response from the api service', () => {
        expect(result).toBe(response);
      });
    });

    it('propagates errors thrown by the api service so callers can map them', async () => {
      const apiError = new Error('boom');
      postMock.mockRejectedValueOnce(apiError);

      await expect(
        gateway.publishPackageOnMarketplace({
          organizationId,
          marketplaceId,
          packageId,
        }),
      ).rejects.toBe(apiError);
    });
  });

  describe('findMarketplaceDistributionById', () => {
    describe('when the api service resolves with a wrapped distribution row', () => {
      let response: FindMarketplaceDistributionByIdResponse;
      let result: FindMarketplaceDistributionByIdResponse;

      beforeEach(async () => {
        response = {
          marketplaceDistribution: {
            id: marketplaceDistributionId,
            status: 'in_progress',
          } as unknown as MarketplaceDistribution,
        };
        getMock.mockResolvedValueOnce(response);

        result = await gateway.findMarketplaceDistributionById({
          organizationId,
          marketplaceDistributionId,
        });
      });

      it('GETs the marketplace-distributions endpoint with the row id', () => {
        expect(getMock).toHaveBeenCalledWith(
          `/organizations/${organizationId}/marketplace-distributions/${marketplaceDistributionId}`,
        );
      });

      it('returns the wrapped response from the api service', () => {
        expect(result).toBe(response);
      });
    });

    describe('when the api service resolves with a null row', () => {
      let result: FindMarketplaceDistributionByIdResponse;

      beforeEach(async () => {
        getMock.mockResolvedValueOnce({ marketplaceDistribution: null });

        result = await gateway.findMarketplaceDistributionById({
          organizationId,
          marketplaceDistributionId,
        });
      });

      it('returns the null wrapper from the api service', () => {
        expect(result).toEqual({ marketplaceDistribution: null });
      });
    });
  });
});
