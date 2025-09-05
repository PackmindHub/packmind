import { OrganizationGatewayApi } from './OrganizationGatewayApi';

// Mock the PackmindGateway
const mockApiPost = jest.fn();
const mockApiGet = jest.fn();

jest.mock('../../../../shared/PackmindGateway', () => {
  return {
    PackmindGateway: jest.fn().mockImplementation(function (
      this: { _endpoint: string; _api: { post: jest.Mock; get: jest.Mock } },
      endpoint: string,
    ) {
      this._endpoint = endpoint;
      this._api = {
        post: mockApiPost,
        get: mockApiGet,
      };
    }),
  };
});

describe('OrganizationGatewayApi', () => {
  let gateway: OrganizationGatewayApi;

  beforeEach(() => {
    gateway = new OrganizationGatewayApi();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrganization', () => {
    it('calls API service with correct parameters', async () => {
      const mockResponse = { id: '1', name: 'Test Org', slug: 'test-org' };
      mockApiPost.mockResolvedValue(mockResponse);

      const result = await gateway.createOrganization({ name: 'Test Org' });

      expect(mockApiPost).toHaveBeenCalledWith('/organizations', {
        name: 'Test Org',
      });
      expect(result).toEqual(mockResponse);
    });

    it('handles API errors', async () => {
      const error = new Error('Network error');
      mockApiPost.mockRejectedValue(error);

      await expect(
        gateway.createOrganization({ name: 'Test Org' }),
      ).rejects.toThrow('Network error');
    });
  });

  describe('getBySlug', () => {
    it('calls API service with correct parameters', async () => {
      const mockResponse = { id: '1', name: 'Test Org', slug: 'test-org' };
      mockApiGet.mockResolvedValue(mockResponse);

      const result = await gateway.getBySlug('test-org');

      expect(mockApiGet).toHaveBeenCalledWith('/organizations/slug/test-org');
      expect(result).toEqual(mockResponse);
    });

    it('handles API errors', async () => {
      const error = new Error('Organization not found');
      mockApiGet.mockRejectedValue(error);

      await expect(gateway.getBySlug('non-existent')).rejects.toThrow(
        'Organization not found',
      );
    });
  });
});
