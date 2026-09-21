import {
  createPackageId,
  createOrganizationId,
  createSpaceId,
} from '@packmind/types';
import { DeploymentsGatewayApi } from './DeploymentsGateway';
import type { Mock } from 'vitest';

const mockApiGet = vi.fn();
const mockApiPost = vi.fn();

vi.mock('../../../../shared/PackmindGateway', () => {
  return {
    PackmindGateway: vi.fn().mockImplementation(function (
      this: { _endpoint: string; _api: { get: Mock; post: Mock } },
      endpoint: string,
    ) {
      this._endpoint = endpoint;
      this._api = {
        get: mockApiGet,
        post: mockApiPost,
      };
    }),
  };
});

describe('DeploymentsGatewayApi', () => {
  let gateway: DeploymentsGatewayApi;
  const organizationId = createOrganizationId('org-1');
  const spaceId = createSpaceId('space-1');
  const packageId = createPackageId('pkg-1');
  const version = '1.0.0';

  beforeEach(() => {
    mockApiGet.mockReset();
    mockApiGet.mockResolvedValue({});
    mockApiPost.mockReset();
    mockApiPost.mockResolvedValue({});
    gateway = new DeploymentsGatewayApi();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listPackageReleases', () => {
    it('requests the exact releases URL', async () => {
      await gateway.listPackageReleases({
        organizationId,
        spaceId,
        packageId,
      });

      expect(mockApiGet).toHaveBeenCalledWith(
        `/organizations/${organizationId}/spaces/${spaceId}/packages/${packageId}/releases`,
      );
    });
  });

  describe('createPackageRelease', () => {
    it('posts to the exact releases URL with a body of exactly { version }', async () => {
      await gateway.createPackageRelease({
        organizationId,
        spaceId,
        packageId,
        version,
      });

      expect(mockApiPost).toHaveBeenCalledWith(
        `/organizations/${organizationId}/spaces/${spaceId}/packages/${packageId}/releases`,
        { version },
      );
    });
  });

  describe('getPackageRelease', () => {
    it('requests the exact releases URL with the version appended', async () => {
      await gateway.getPackageRelease({
        organizationId,
        spaceId,
        packageId,
        version,
      });

      expect(mockApiGet).toHaveBeenCalledWith(
        `/organizations/${organizationId}/spaces/${spaceId}/packages/${packageId}/releases/${version}`,
      );
    });
  });
});
