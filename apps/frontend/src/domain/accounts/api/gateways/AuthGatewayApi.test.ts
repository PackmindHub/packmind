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

  describe('signUp', () => {
    const signUpRequest: SignUpUserCommand = {
      username: 'testuser',
      password: 'password123',
      organizationId: createOrganizationId('org-1'),
    };

    it('calls API service with correct parameters', async () => {
      const mockResponse = {
        id: '1',
        username: 'testuser',
        passwordHash: 'hashedpassword',
        organizationId: 'org-1',
      };
      mockApiPost.mockResolvedValue(mockResponse);

      const result = await gateway.signUp(signUpRequest);

      expect(mockApiPost).toHaveBeenCalledWith('/auth/signup', signUpRequest);
      expect(result).toEqual(mockResponse);
    });

    it('handles API errors', async () => {
      const error = new Error('Username already exists');
      mockApiPost.mockRejectedValue(error);

      await expect(gateway.signUp(signUpRequest)).rejects.toThrow(
        'Username already exists',
      );
    });

    it('handles validation errors', async () => {
      const error = new Error(
        'Username, password, and organizationId are required',
      );
      mockApiPost.mockRejectedValue(error);

      const invalidRequest = {
        username: '',
        password: '',
        organizationId: createOrganizationId(''),
      };
      await expect(gateway.signUp(invalidRequest)).rejects.toThrow(
        'Username, password, and organizationId are required',
      );
    });

    it('handles organization not found errors', async () => {
      const error = new Error('Organization not found');
      mockApiPost.mockRejectedValue(error);

      const requestWithInvalidOrg = {
        ...signUpRequest,
        organizationId: createOrganizationId('non-existent-org'),
      };
      await expect(gateway.signUp(requestWithInvalidOrg)).rejects.toThrow(
        'Organization not found',
      );
    });
  });

  describe('signIn', () => {
    it('calls API service with correct parameters', async () => {
      const signInRequest = {
        username: 'testuser',
        password: 'password123',
        organizationId: createOrganizationId('org-1'),
      };
      const mockResponse = {
        message: 'Sign in successful',
        user: {
          id: '1',
          username: 'testuser',
          organizationId: createOrganizationId('org-1'),
        },
        organization: { id: 'org-1', name: 'Test Org', slug: 'test-org' },
        accessToken: 'token123',
      };
      mockApiPost.mockResolvedValue(mockResponse);

      const result = await gateway.signIn(signInRequest);

      expect(mockApiPost).toHaveBeenCalledWith('/auth/signin', signInRequest);
      expect(result).toEqual(mockResponse);
    });

    it('handles API errors', async () => {
      const signInRequest = {
        username: 'testuser',
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
          username: 'testuser',
          organizationId: createOrganizationId('org-1'),
        },
        organization: { id: 'org-1', name: 'Test Org', slug: 'test-org' },
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
