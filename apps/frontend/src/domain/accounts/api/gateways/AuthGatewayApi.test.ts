import { AuthGatewayApi } from './AuthGatewayApi';
import { createOrganizationId, SignUpUserCommand } from '@packmind/types';

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
    describe('when signing in with valid credentials', () => {
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
      let result: Awaited<ReturnType<typeof gateway.signIn>>;

      beforeEach(async () => {
        mockApiPost.mockResolvedValue(mockResponse);
        result = await gateway.signIn(signInRequest);
      });

      it('calls API service with correct parameters', () => {
        expect(mockApiPost).toHaveBeenCalledWith('/auth/signin', signInRequest);
      });

      it('returns the response', () => {
        expect(result).toEqual(mockResponse);
      });
    });

    describe('when API returns an error', () => {
      it('propagates the error', async () => {
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
  });

  describe('getMe', () => {
    describe('when user is authenticated', () => {
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
      let result: Awaited<ReturnType<typeof gateway.getMe>>;

      beforeEach(async () => {
        mockApiGet.mockResolvedValue(mockResponse);
        result = await gateway.getMe();
      });

      it('calls API service with correct endpoint', () => {
        expect(mockApiGet).toHaveBeenCalledWith('/auth/me');
      });

      it('returns the response', () => {
        expect(result).toEqual(mockResponse);
      });
    });

    describe('when user is not authenticated', () => {
      it('returns authentication failure response', async () => {
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
});
