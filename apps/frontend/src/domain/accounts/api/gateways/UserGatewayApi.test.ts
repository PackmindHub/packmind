import { UserGatewayApi } from './UserGatewayApi';
import {
  ListOrganizationUsersResponse,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import type { Mock } from 'vitest';

// Mock the PackmindGateway
const mockApiGet = vi.fn();

vi.mock('../../../../shared/PackmindGateway', () => {
  return {
    PackmindGateway: vi.fn().mockImplementation(function (
      this: { _endpoint: string; _api: { get: Mock } },
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
      const mockResponse: ListOrganizationUsersResponse = {
        users: [
          {
            userId: createUserId('1'),
            displayName: 'user1',
            role: 'admin',
          },
          {
            userId: createUserId('2'),
            displayName: 'user2',
            role: 'member',
          },
        ],
      };
      let result: ListOrganizationUsersResponse;

      beforeEach(async () => {
        mockApiGet.mockResolvedValue(mockResponse);
        result = await gateway.getUsersInMyOrganization({ organizationId });
      });

      it('calls API with correct endpoint', () => {
        expect(mockApiGet).toHaveBeenCalledWith('/organizations/org-123/users');
      });

      it('returns the users from API response', () => {
        expect(result).toEqual(mockResponse);
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
      let result: ListOrganizationUsersResponse;

      beforeEach(async () => {
        mockApiGet.mockResolvedValue({ users: [] });
        result = await gateway.getUsersInMyOrganization({ organizationId });
      });

      it('calls API with correct endpoint', () => {
        expect(mockApiGet).toHaveBeenCalledWith('/organizations/org-123/users');
      });

      it('returns an empty user list', () => {
        expect(result).toEqual({ users: [] });
      });
    });
  });
});
