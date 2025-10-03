import { AuthGatewayApi } from './AuthGatewayApi';
import {
  createOrganizationId,
  SignUpUserCommand,
} from '@packmind/accounts/types';

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

describe('AuthGatewayApi', () => {
  let gateway: AuthGatewayApi;

  beforeEach(() => {
    gateway = new AuthGatewayApi();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signIn', () => {
    it('calls API service with correct parameters', async () => {
      const signInRequest = {
        email: 'testuser@packmind.com',
        password: 'password123',
        organizationId: createOrganizationId('org-1'),
      };
      const mockResponse = {
        message: 'Sign in successful',
        user: {
          id: '1',
          email: 'testuser@packmind.com',
          active: true,
          memberships: [
            {
              userId: '1',
              organizationId: createOrganizationId('org-1'),
              role: 'admin',
            },
          ],
        },
        organization: {
          id: 'org-1',
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        accessToken: 'token123',
      };
      mockApiPost.mockResolvedValue(mockResponse);

      const result = await gateway.signIn(signInRequest);

      expect(mockApiPost).toHaveBeenCalledWith('/auth/signin', signInRequest);
      expect(result).toEqual(mockResponse);
    });

    it('handles API errors', async () => {
      const signInRequest = {
        email: 'testuser@packmind.com',
        password: 'wrongpassword',
        organizationId: createOrganizationId('org-1'),
      };
      const error = new Error('Invalid credentials');
      mockApiPost.mockRejectedValue(error);

      await expect(gateway.signIn(signInRequest)).rejects.toThrow(
        'Invalid credentials',
      );
    });
  });

  describe('getMe', () => {
    it('calls API service with correct endpoint', async () => {
      const mockResponse = {
        message: 'User authenticated',
        authenticated: true,
        user: {
          id: '1',
          email: 'testuser@packmind.com',
          active: true,
          memberships: [
            {
              userId: '1',
              organizationId: createOrganizationId('org-1'),
              role: 'admin',
            },
          ],
        },
        organization: {
          id: 'org-1',
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
      };
      mockApiGet.mockResolvedValue(mockResponse);

      const result = await gateway.getMe();

      expect(mockApiGet).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual(mockResponse);
    });

    it('handles authentication failure', async () => {
      const mockResponse = {
        message: 'Not authenticated',
        authenticated: false,
      };
      mockApiGet.mockResolvedValue(mockResponse);

      const result = await gateway.getMe();

      expect(result).toEqual(mockResponse);
    });
  });
});
