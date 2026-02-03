import { DeploymentGateway } from './DeploymentGateway';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('DeploymentGateway', () => {
  let gateway: DeploymentGateway;
  const mockHost = 'https://api.packmind.com';

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('notifyDistribution', () => {
    const createValidApiKey = (orgId: string) => {
      // Create a JWT with organization.id
      const jwtPayload = { organization: { id: orgId } };
      const jwtPayloadBase64 = Buffer.from(JSON.stringify(jwtPayload)).toString(
        'base64',
      );
      const mockJwtWithOrg = `header.${jwtPayloadBase64}.signature`;

      const apiKeyPayload = {
        host: mockHost,
        jwt: mockJwtWithOrg,
      };
      return Buffer.from(JSON.stringify(apiKeyPayload)).toString('base64');
    };

    describe('when notification succeeds', () => {
      let result: Awaited<ReturnType<DeploymentGateway['notifyDistribution']>>;
      let validApiKey: string;
      const mockApiResponse = {
        deploymentId: 'deployment-456',
      };

      beforeEach(async () => {
        validApiKey = createValidApiKey('org-123');
        gateway = new DeploymentGateway(validApiKey);

        mockFetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue(mockApiResponse),
        } as unknown as Response);

        result = await gateway.notifyDistribution({
          distributedPackages: ['backend', 'frontend'],
          gitRemoteUrl: 'github.com/user/repo',
          gitBranch: 'main',
          relativePath: '/src/',
        });
      });

      it('calls the API with correct parameters', () => {
        expect(mockFetch).toHaveBeenCalledWith(
          `${mockHost}/api/v0/organizations/org-123/deployments`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${validApiKey}`,
            },
            body: JSON.stringify({
              distributedPackages: ['backend', 'frontend'],
              gitRemoteUrl: 'github.com/user/repo',
              gitBranch: 'main',
              relativePath: '/src/',
            }),
          },
        );
      });

      it('returns the deployment ID', () => {
        expect(result).toEqual({ deploymentId: 'deployment-456' });
      });
    });

    describe('when API key is invalid', () => {
      beforeEach(() => {
        gateway = new DeploymentGateway('invalid-key');
      });

      it('throws error', async () => {
        await expect(
          gateway.notifyDistribution({
            distributedPackages: ['backend'],
            gitRemoteUrl: 'github.com/user/repo',
            gitBranch: 'main',
            relativePath: '/',
          }),
        ).rejects.toThrow('Invalid API key:');
      });

      it('does not call fetch', async () => {
        try {
          await gateway.notifyDistribution({
            distributedPackages: ['backend'],
            gitRemoteUrl: 'github.com/user/repo',
            gitBranch: 'main',
            relativePath: '/',
          });
        } catch {
          // Expected to throw
        }

        expect(mockFetch).not.toHaveBeenCalled();
      });
    });

    describe('when API key is missing organization ID', () => {
      beforeEach(() => {
        // JWT without organization.id
        const jwtPayloadBase64 = Buffer.from(
          JSON.stringify({ user: 'test' }),
        ).toString('base64');
        const mockJwtNoOrg = `header.${jwtPayloadBase64}.signature`;
        const apiKeyPayload = { host: mockHost, jwt: mockJwtNoOrg };
        const invalidApiKey = Buffer.from(
          JSON.stringify(apiKeyPayload),
        ).toString('base64');
        gateway = new DeploymentGateway(invalidApiKey);
      });

      it('throws error', async () => {
        await expect(
          gateway.notifyDistribution({
            distributedPackages: ['backend'],
            gitRemoteUrl: 'github.com/user/repo',
            gitBranch: 'main',
            relativePath: '/',
          }),
        ).rejects.toThrow('Invalid API key: missing organizationId in JWT');
      });

      it('does not call fetch', async () => {
        try {
          await gateway.notifyDistribution({
            distributedPackages: ['backend'],
            gitRemoteUrl: 'github.com/user/repo',
            gitBranch: 'main',
            relativePath: '/',
          });
        } catch {
          // Expected to throw
        }

        expect(mockFetch).not.toHaveBeenCalled();
      });
    });

    describe('when API request fails', () => {
      it('throws error with message from response', async () => {
        const validApiKey = createValidApiKey('org-123');
        gateway = new DeploymentGateway(validApiKey);

        mockFetch.mockResolvedValue({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          json: jest.fn().mockResolvedValue({
            message: 'Invalid package slug',
          }),
        } as unknown as Response);

        await expect(
          gateway.notifyDistribution({
            distributedPackages: ['non-existent'],
            gitRemoteUrl: 'github.com/user/repo',
            gitBranch: 'main',
            relativePath: '/',
          }),
        ).rejects.toThrow('Invalid package slug');
      });
    });

    describe('when network error occurs', () => {
      it('throws server not accessible error', async () => {
        const validApiKey = createValidApiKey('org-123');
        gateway = new DeploymentGateway(validApiKey);

        mockFetch.mockRejectedValue(new Error('Failed to fetch'));

        await expect(
          gateway.notifyDistribution({
            distributedPackages: ['backend'],
            gitRemoteUrl: 'github.com/user/repo',
            gitBranch: 'main',
            relativePath: '/',
          }),
        ).rejects.toThrow(
          `Packmind server is not accessible at ${mockHost}. Please check your network connection or the server URL.`,
        );
      });
    });
  });
});
