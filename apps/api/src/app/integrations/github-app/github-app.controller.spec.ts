import { Test, TestingModule } from '@nestjs/testing';
import { GitHubAppController } from './github-app.controller';
import { PackmindLogger } from '@packmind/logger';
import { GIT_ADAPTER_TOKEN } from '../../shared/HexaRegistryModule';
import { stubLogger } from '@packmind/test-utils';
import {
  createGitProviderId,
  createOrganizationId,
  createUserId,
  IGitPort,
} from '@packmind/types';
import { AuthenticatedRequest } from '@packmind/node-utils';

const userId = createUserId('user-1');
const organizationId = createOrganizationId('org-1');

const mockRequest = {
  user: { userId },
  organization: { id: organizationId, name: 'Org', slug: 'org', role: 'admin' },
} as Partial<AuthenticatedRequest> as AuthenticatedRequest;

describe('GitHubAppController', () => {
  let controller: GitHubAppController;
  let mockGitAdapter: jest.Mocked<Partial<IGitPort>>;

  beforeAll(async () => {
    mockGitAdapter = {
      buildGitHubAppManifest: jest.fn(),
      registerGitHubAppFromManifest: jest.fn(),
      getGitHubAppStatus: jest.fn(),
      linkGitHubAppInstallation: jest.fn(),
      unlinkGitHubAppInstallation: jest.fn(),
      listInstallationRepositories: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GitHubAppController],
      providers: [
        {
          provide: GIT_ADAPTER_TOKEN,
          useValue: mockGitAdapter,
        },
        {
          provide: PackmindLogger,
          useValue: stubLogger(),
        },
      ],
    }).compile();

    controller = module.get<GitHubAppController>(GitHubAppController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('buildManifest', () => {
    it('calls buildGitHubAppManifest with userId and organizationId', async () => {
      const response = {
        manifest: {} as never,
        state: 'abc',
        manifestPostUrl: 'https://github.com/apps/manifests/new',
      };
      (mockGitAdapter.buildGitHubAppManifest as jest.Mock).mockResolvedValue(
        response,
      );

      const result = await controller.buildManifest(mockRequest);

      expect(mockGitAdapter.buildGitHubAppManifest).toHaveBeenCalledWith({
        userId: String(userId),
        organizationId: String(organizationId),
      });
      expect(result).toBe(response);
    });
  });

  describe('registerFromManifest', () => {
    it('calls registerGitHubAppFromManifest with code and state', async () => {
      const response = {
        id: 'config-1',
        slug: 'my-app',
        appId: 42,
        htmlUrl: 'https://github.com/apps/my-app',
        installUrl: 'https://github.com/apps/my-app/installations/new',
      } as never;
      (
        mockGitAdapter.registerGitHubAppFromManifest as jest.Mock
      ).mockResolvedValue(response);

      const result = await controller.registerFromManifest(mockRequest, {
        code: 'code123',
        state: 'state456',
      });

      expect(mockGitAdapter.registerGitHubAppFromManifest).toHaveBeenCalledWith(
        {
          userId: String(userId),
          organizationId: String(organizationId),
          code: 'code123',
          state: 'state456',
        },
      );
      expect(result).toBe(response);
    });
  });

  describe('getStatus', () => {
    it('calls getGitHubAppStatus with userId and organizationId', async () => {
      const response = { registered: false as const };
      (mockGitAdapter.getGitHubAppStatus as jest.Mock).mockResolvedValue(
        response,
      );

      const result = await controller.getStatus(mockRequest);

      expect(mockGitAdapter.getGitHubAppStatus).toHaveBeenCalledWith({
        userId: String(userId),
        organizationId: String(organizationId),
      });
      expect(result).toBe(response);
    });
  });

  describe('linkInstallation', () => {
    it('calls linkGitHubAppInstallation with installationId', async () => {
      const response = {
        gitProvider: {} as never,
        installationAccount: {} as never,
      };
      (mockGitAdapter.linkGitHubAppInstallation as jest.Mock).mockResolvedValue(
        response,
      );

      const result = await controller.linkInstallation(mockRequest, {
        installationId: 99,
      });

      expect(mockGitAdapter.linkGitHubAppInstallation).toHaveBeenCalledWith({
        userId: String(userId),
        organizationId: String(organizationId),
        installationId: 99,
      });
      expect(result).toBe(response);
    });
  });

  describe('unlinkInstallation', () => {
    it('calls unlinkGitHubAppInstallation with userId and organizationId', async () => {
      const response = { unlinked: true };
      (
        mockGitAdapter.unlinkGitHubAppInstallation as jest.Mock
      ).mockResolvedValue(response);

      const result = await controller.unlinkInstallation(mockRequest);

      expect(mockGitAdapter.unlinkGitHubAppInstallation).toHaveBeenCalledWith({
        userId: String(userId),
        organizationId: String(organizationId),
      });
      expect(result).toBe(response);
    });
  });

  describe('listRepositories', () => {
    it('calls listInstallationRepositories with gitProviderId', async () => {
      const providerId = createGitProviderId('provider-1');
      const response = { repositories: [] };
      (
        mockGitAdapter.listInstallationRepositories as jest.Mock
      ).mockResolvedValue(response);

      const result = await controller.listRepositories(mockRequest, providerId);

      expect(mockGitAdapter.listInstallationRepositories).toHaveBeenCalledWith({
        userId: String(userId),
        organizationId: String(organizationId),
        gitProviderId: providerId,
      });
      expect(result).toBe(response);
    });
  });
});
