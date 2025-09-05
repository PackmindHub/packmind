import { UserGatewayApi } from './UserGatewayApi';

// Mock the PackmindGateway
const mockApiGet = jest.fn();
const mockApiPost = jest.fn();

jest.mock('../../../../shared/PackmindGateway', () => {
  return {
    PackmindGateway: jest.fn().mockImplementation(function (
      this: { _endpoint: string; _api: { get: jest.Mock; post: jest.Mock } },
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

describe('UserGatewayApi', () => {
  let gateway: UserGatewayApi;

  beforeEach(() => {
    mockApiGet.mockClear();
    mockApiPost.mockClear();
    gateway = new UserGatewayApi();
  });

  describe('getUsersInMyOrganization', () => {
    it('calls API service with correct parameters', async () => {
      const mockUsers = [
        {
          id: '1',
          username: 'user1',
          organizationId: 'org-1',
          passwordHash: 'hash1',
        },
        {
          id: '2',
          username: 'user2',
          organizationId: 'org-1',
          passwordHash: 'hash2',
        },
      ];
      mockApiGet.mockResolvedValue(mockUsers);

      const result = await gateway.getUsersInMyOrganization();

      expect(mockApiGet).toHaveBeenCalledWith('/users/organization');
      expect(result).toEqual(mockUsers);
    });

    it('handles API errors', async () => {
      const error = new Error('Network error');
      mockApiGet.mockRejectedValue(error);

      await expect(gateway.getUsersInMyOrganization()).rejects.toThrow(
        'Network error',
      );
    });

    it('returns empty array when no users found', async () => {
      mockApiGet.mockResolvedValue([]);

      const result = await gateway.getUsersInMyOrganization();

      expect(mockApiGet).toHaveBeenCalledWith('/users/organization');
      expect(result).toEqual([]);
    });
  });

  describe('doesUsernameExist', () => {
    it('calls API service with correct parameters when username exists', async () => {
      const mockResponse = { exists: true };
      mockApiPost.mockResolvedValue(mockResponse);

      const result = await gateway.doesUsernameExist('existinguser');

      expect(mockApiPost).toHaveBeenCalledWith('/users/does-username-exist', {
        username: 'existinguser',
      });
      expect(result).toEqual(mockResponse);
    });

    it('calls API service with correct parameters when username does not exist', async () => {
      const mockResponse = { exists: false };
      mockApiPost.mockResolvedValue(mockResponse);

      const result = await gateway.doesUsernameExist('nonexistentuser');

      expect(mockApiPost).toHaveBeenCalledWith('/users/does-username-exist', {
        username: 'nonexistentuser',
      });
      expect(result).toEqual(mockResponse);
    });

    it('handles API errors', async () => {
      const error = new Error('Network error');
      mockApiPost.mockRejectedValue(error);

      await expect(gateway.doesUsernameExist('testuser')).rejects.toThrow(
        'Network error',
      );
      expect(mockApiPost).toHaveBeenCalledWith('/users/does-username-exist', {
        username: 'testuser',
      });
    });
  });
});
