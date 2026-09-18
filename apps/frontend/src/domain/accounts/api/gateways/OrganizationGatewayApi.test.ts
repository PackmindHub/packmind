import { OrganizationGatewayApi } from './OrganizationGatewayApi';
import { CreateInvitationsResponse, createUserId } from '@packmind/types';
import type { Mock } from 'vitest';

// Mock the PackmindGateway
const mockApiPost = vi.fn();
const mockApiGet = vi.fn();
const mockApiDelete = vi.fn();

vi.mock('../../../../shared/PackmindGateway', () => {
  return {
    PackmindGateway: vi.fn().mockImplementation(function (
      this: {
        _endpoint: string;
        _api: { post: Mock; get: Mock; delete: Mock };
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
    vi.clearAllMocks();
  });

  describe('createOrganization', () => {
    describe('when API call succeeds', () => {
      const mockResponse = { id: '1', name: 'Test Org', slug: 'test-org' };
      let result: typeof mockResponse;

      beforeEach(async () => {
        mockApiPost.mockResolvedValue(mockResponse);
        result = await gateway.createOrganization({ name: 'Test Org' });
      });

      it('calls API service with correct parameters', () => {
        expect(mockApiPost).toHaveBeenCalledWith('/organizations', {
          name: 'Test Org',
        });
      });

      it('returns the API response', () => {
        expect(result).toEqual(mockResponse);
      });
    });

    describe('when API call fails', () => {
      it('throws the error', async () => {
        const error = new Error('Network error');
        mockApiPost.mockRejectedValue(error);

        await expect(
          gateway.createOrganization({ name: 'Test Org' }),
        ).rejects.toThrow('Network error');
      });
    });
  });

  describe('inviteUsers', () => {
    describe('when API call succeeds', () => {
      const mockResponse: CreateInvitationsResponse = {
        created: [
          {
            email: 'test@example.com',
            userId: createUserId('user123'),
            invitation: {
              id: 'invitation-1',
              userId: createUserId('user123'),
              token: 'invitation-token',
              expirationDate: new Date('2026-01-01T00:00:00.000Z'),
            },
          },
        ],
        organizationInvitations: [],
        skipped: [],
      };
      let result: CreateInvitationsResponse;

      beforeEach(async () => {
        mockApiPost.mockResolvedValue(mockResponse);
        result = await gateway.inviteUsers({
          organizationId: 'org123',
          emails: ['test@example.com'],
          role: 'member',
        });
      });

      it('calls API service with correct parameters', () => {
        expect(mockApiPost).toHaveBeenCalledWith(
          '/organizations/org123/users/invite',
          { emails: ['test@example.com'], role: 'member' },
        );
      });

      it('returns the API response', () => {
        expect(result).toEqual(mockResponse);
      });
    });

    describe('when API call fails', () => {
      it('throws the error', async () => {
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
  });

  describe('removeUser', () => {
    describe('when API call succeeds', () => {
      const mockResponse = { removed: true };
      let result: typeof mockResponse;

      beforeEach(async () => {
        mockApiDelete.mockResolvedValue(mockResponse);
        result = await gateway.removeUser({
          organizationId: 'org123',
          targetUserId: createUserId('user456'),
        });
      });

      it('calls API service with correct parameters', () => {
        expect(mockApiDelete).toHaveBeenCalledWith(
          '/organizations/org123/users/user456',
        );
      });

      it('returns the API response', () => {
        expect(result).toEqual(mockResponse);
      });
    });

    describe('when API call fails', () => {
      it('throws the error', async () => {
        const error = new Error('User not found');
        mockApiDelete.mockRejectedValue(error);

        await expect(
          gateway.removeUser({
            organizationId: 'org123',
            targetUserId: createUserId('user456'),
          }),
        ).rejects.toThrow('User not found');
      });
    });
  });
});
