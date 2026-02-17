import { DeploymentGateway } from './DeploymentGateway';
import { createMockHttpClient } from '../../mocks/createMockHttpClient';
import { PackmindHttpClient } from '../http/PackmindHttpClient';

describe('DeploymentGateway', () => {
  let gateway: DeploymentGateway;
  let mockHttpClient: jest.Mocked<PackmindHttpClient>;
  const mockOrganizationId = 'org-123';

  beforeEach(() => {
    mockHttpClient = createMockHttpClient({
      getAuthContext: jest.fn().mockReturnValue({
        host: 'https://api.packmind.com',
        jwt: 'mock-jwt',
        organizationId: mockOrganizationId,
      }),
    });

    gateway = new DeploymentGateway(mockHttpClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('notifyDistribution', () => {
    describe('when notification succeeds', () => {
      const mockApiResponse = {
        deploymentId: 'deployment-456',
      };

      beforeEach(() => {
        mockHttpClient.request.mockResolvedValue(mockApiResponse);
      });

      it('calls the API with correct endpoint and parameters', async () => {
        await gateway.notifyDistribution({
          distributedPackages: ['backend', 'frontend'],
          gitRemoteUrl: 'github.com/user/repo',
          gitBranch: 'main',
          relativePath: '/src/',
        });

        expect(mockHttpClient.request).toHaveBeenCalledWith(
          `/api/v0/organizations/${mockOrganizationId}/deployments`,
          {
            method: 'POST',
            body: {
              distributedPackages: ['backend', 'frontend'],
              gitRemoteUrl: 'github.com/user/repo',
              gitBranch: 'main',
              relativePath: '/src/',
            },
          },
        );
      });

      it('returns the deployment ID', async () => {
        const result = await gateway.notifyDistribution({
          distributedPackages: ['backend', 'frontend'],
          gitRemoteUrl: 'github.com/user/repo',
          gitBranch: 'main',
          relativePath: '/src/',
        });

        expect(result).toEqual({ deploymentId: 'deployment-456' });
      });
    });

    describe('when API request fails', () => {
      it('propagates the error from httpClient', async () => {
        mockHttpClient.request.mockRejectedValue(
          new Error('Invalid package slug'),
        );

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
      it('propagates the network error from httpClient', async () => {
        mockHttpClient.request.mockRejectedValue(
          new Error(
            'Packmind server is not accessible at https://api.packmind.com. Please check your network connection or the server URL.',
          ),
        );

        await expect(
          gateway.notifyDistribution({
            distributedPackages: ['backend'],
            gitRemoteUrl: 'github.com/user/repo',
            gitBranch: 'main',
            relativePath: '/',
          }),
        ).rejects.toThrow(
          'Packmind server is not accessible at https://api.packmind.com. Please check your network connection or the server URL.',
        );
      });
    });
  });

  describe('getDeployed', () => {
    const defaultCommand = {
      packagesSlugs: ['backend'],
      gitRemoteUrl: 'github.com/user/repo',
      gitBranch: 'main',
      relativePath: '/src/',
    };

    describe('when request succeeds', () => {
      const mockApiResponse = {
        fileUpdates: { createOrUpdate: [], delete: [] },
        skillFolders: [],
      };

      beforeEach(() => {
        mockHttpClient.request.mockResolvedValue(mockApiResponse);
      });

      it('calls the API with POST and correct body', async () => {
        await gateway.getDeployed(defaultCommand);

        expect(mockHttpClient.request).toHaveBeenCalledWith(
          `/api/v0/organizations/${mockOrganizationId}/deployed-content`,
          {
            method: 'POST',
            body: {
              packagesSlugs: ['backend'],
              gitRemoteUrl: 'github.com/user/repo',
              gitBranch: 'main',
              relativePath: '/src/',
            },
          },
        );
      });

      it('returns the response', async () => {
        const result = await gateway.getDeployed(defaultCommand);

        expect(result).toEqual(mockApiResponse);
      });
    });

    describe('when agents are provided', () => {
      beforeEach(() => {
        mockHttpClient.request.mockResolvedValue({});
      });

      it('includes agents in the body', async () => {
        await gateway.getDeployed({
          ...defaultCommand,
          agents: ['claude', 'cursor'],
        });

        expect(mockHttpClient.request).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.objectContaining({
              agents: ['claude', 'cursor'],
            }),
          }),
        );
      });
    });

    describe('when agents is an empty array', () => {
      beforeEach(() => {
        mockHttpClient.request.mockResolvedValue({});
      });

      it('includes empty agents array in the body', async () => {
        await gateway.getDeployed({
          ...defaultCommand,
          agents: [],
        });

        expect(mockHttpClient.request).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.objectContaining({
              agents: [],
            }),
          }),
        );
      });
    });

    describe('when agents is not provided', () => {
      beforeEach(() => {
        mockHttpClient.request.mockResolvedValue({});
      });

      it('does not include agents in the body', async () => {
        await gateway.getDeployed(defaultCommand);

        expect(mockHttpClient.request).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.not.objectContaining({
              agents: expect.anything(),
            }),
          }),
        );
      });
    });
  });

  describe('getRenderModeConfiguration', () => {
    describe('when request succeeds', () => {
      const mockApiResponse = {
        configuration: {
          id: 'config-123',
          organizationId: mockOrganizationId,
          activeRenderModes: ['CLAUDE', 'CURSOR'],
        },
      };

      beforeEach(() => {
        mockHttpClient.request.mockResolvedValue(mockApiResponse);
      });

      it('calls the API with correct endpoint', async () => {
        await gateway.getRenderModeConfiguration({});

        expect(mockHttpClient.request).toHaveBeenCalledWith(
          `/api/v0/organizations/${mockOrganizationId}/deployments/renderModeConfiguration`,
        );
      });

      it('returns the configuration', async () => {
        const result = await gateway.getRenderModeConfiguration({});

        expect(result).toEqual(mockApiResponse);
      });
    });

    describe('when no configuration exists', () => {
      beforeEach(() => {
        mockHttpClient.request.mockResolvedValue({ configuration: null });
      });

      it('returns null configuration', async () => {
        const result = await gateway.getRenderModeConfiguration({});

        expect(result).toEqual({ configuration: null });
      });
    });

    describe('when API request fails', () => {
      it('propagates the error from httpClient', async () => {
        mockHttpClient.request.mockRejectedValue(new Error('Unauthorized'));

        await expect(gateway.getRenderModeConfiguration({})).rejects.toThrow(
          'Unauthorized',
        );
      });
    });
  });
});
