import { UserGatewayApi } from './UserGatewayApi';
import { createOrganizationId } from '@packmind/types';

// Mock the PackmindGateway
const mockApiGet = jest.fn();

jest.mock('../../../../shared/PackmindGateway', () => {
  return {
    PackmindGateway: jest.fn().mockImplementation(function (
      this: { _endpoint: string; _api: { get: jest.Mock } },
      endpoint: string,
    ) {
      this._endpoint = endpoint;
      this._api = {
        get: mockApiGet,
      };
    }),
  };
});

describe('UserGatewayApi', () => {
  let gateway: UserGatewayApi;

  beforeEach(() => {
    mockApiGet.mockClear();
    gateway = new UserGatewayApi();
  });

  describe('getUsersInMyOrganization', () => {
    const organizationId = createOrganizationId('org-123');

    it('calls API service with correct parameters', async () => {
      const mockUsers = [
        {
          id: '1',
          email: 'user1@packmind.com',
          passwordHash: 'hash1',
          active: true,
          memberships: [
            {
              userId: '1',
              organizationId: 'org-1',
              role: 'admin',
            },
          ],
        },
        {
          id: '2',
          email: 'user2@packmind.com',
          passwordHash: 'hash2',
          active: true,
          memberships: [
            {
              userId: '2',
              organizationId: 'org-1',
              role: 'admin',
            },
          ],
        },
      ];
      mockApiGet.mockResolvedValue(mockUsers);

      const result = await gateway.getUsersInMyOrganization({ organizationId });

      expect(mockApiGet).toHaveBeenCalledWith('/organizations/org-123/users');
      expect(result).toEqual(mockUsers);
    });

    it('handles API errors', async () => {
      const error = new Error('Network error');
      mockApiGet.mockRejectedValue(error);

      await expect(
        gateway.getUsersInMyOrganization({ organizationId }),
      ).rejects.toThrow('Network error');
    });

    it('returns empty array when no users found', async () => {
      mockApiGet.mockResolvedValue([]);

      const result = await gateway.getUsersInMyOrganization({ organizationId });

      expect(mockApiGet).toHaveBeenCalledWith('/organizations/org-123/users');
      expect(result).toEqual([]);
    });
  });
});
