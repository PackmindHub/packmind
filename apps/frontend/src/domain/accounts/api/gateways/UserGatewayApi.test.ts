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

    describe('when fetching users successfully', () => {
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
      let result: typeof mockUsers;

      beforeEach(async () => {
        mockApiGet.mockResolvedValue(mockUsers);
        result = await gateway.getUsersInMyOrganization({ organizationId });
      });

      it('calls API with correct endpoint', () => {
        expect(mockApiGet).toHaveBeenCalledWith('/organizations/org-123/users');
      });

      it('returns the users from API response', () => {
        expect(result).toEqual(mockUsers);
      });
    });

    describe('when API returns an error', () => {
      it('propagates the error', async () => {
        const error = new Error('Network error');
        mockApiGet.mockRejectedValue(error);

        await expect(
          gateway.getUsersInMyOrganization({ organizationId }),
        ).rejects.toThrow('Network error');
      });
    });

    describe('when no users exist', () => {
      let result: unknown[];

      beforeEach(async () => {
        mockApiGet.mockResolvedValue([]);
        result = await gateway.getUsersInMyOrganization({ organizationId });
      });

      it('calls API with correct endpoint', () => {
        expect(mockApiGet).toHaveBeenCalledWith('/organizations/org-123/users');
      });

      it('returns an empty array', () => {
        expect(result).toEqual([]);
      });
    });
  });
});
