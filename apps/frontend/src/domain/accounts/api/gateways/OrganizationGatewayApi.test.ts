import { OrganizationGatewayApi } from './OrganizationGatewayApi';

// Mock the PackmindGateway
const mockApiPost = jest.fn();
const mockApiGet = jest.fn();
const mockApiDelete = jest.fn();

jest.mock('../../../../shared/PackmindGateway', () => {
  return {
    PackmindGateway: jest.fn().mockImplementation(function (
      this: {
        _endpoint: string;
        _api: { post: jest.Mock; get: jest.Mock; delete: jest.Mock };
      },
      endpoint: string,
    ) {
      this._endpoint = endpoint;
      this._api = {
        post: mockApiPost,
        get: mockApiGet,
        delete: mockApiDelete,
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

  describe('inviteUsers', () => {
    it('calls API service with correct parameters', async () => {
      const mockResponse = {
        created: [{ email: 'test@example.com', userId: 'user123' }],
        organizationInvitations: [],
        skipped: [],
      };
      mockApiPost.mockResolvedValue(mockResponse);

      const result = await gateway.inviteUsers({
        organizationId: 'org123',
        emails: ['test@example.com'],
        role: 'member',
      });

      expect(mockApiPost).toHaveBeenCalledWith(
        '/organizations/org123/users/invite',
        { emails: ['test@example.com'], role: 'member' },
      );
      expect(result).toEqual(mockResponse);
    });

    it('handles API errors', async () => {
      const error = new Error('Invalid email');
      mockApiPost.mockRejectedValue(error);

      await expect(
        gateway.inviteUsers({
          organizationId: 'org123',
          emails: ['invalid-email'],
          role: 'member',
        }),
      ).rejects.toThrow('Invalid email');
    });
  });

  describe('removeUser', () => {
    it('calls API service with correct parameters', async () => {
      const mockResponse = { removed: true };
      mockApiDelete.mockResolvedValue(mockResponse);

      const result = await gateway.removeUser({
        organizationId: 'org123',
        targetUserId: 'user456',
      });

      expect(mockApiDelete).toHaveBeenCalledWith(
        '/organizations/org123/users/user456',
      );
      expect(result).toEqual(mockResponse);
    });

    it('handles API errors', async () => {
      const error = new Error('User not found');
      mockApiDelete.mockRejectedValue(error);

      await expect(
        gateway.removeUser({
          organizationId: 'org123',
          targetUserId: 'user456',
        }),
      ).rejects.toThrow('User not found');
    });
  });
});
