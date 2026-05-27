import { Configuration } from '@packmind/node-utils';
import {
  IAccountsPort,
  Organization,
  User,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { GitHubAppManifestStateService } from '../../../services/GitHubAppManifestStateService';
import { BuildGitHubAppManifestUseCase } from './buildGitHubAppManifest.usecase';

jest.mock('@packmind/node-utils', () => ({
  ...jest.requireActual('@packmind/node-utils'),
  Configuration: {
    getConfig: jest.fn(),
  },
}));

const mockGetConfig = Configuration.getConfig as jest.Mock;

describe('BuildGitHubAppManifestUseCase', () => {
  const organizationId = createOrganizationId('org-123');
  const userId = createUserId('admin-user');

  const adminUser: User = {
    id: userId,
    email: 'admin@example.com',
    passwordHash: null,
    active: true,
    memberships: [{ userId, organizationId, role: 'admin' }],
  };

  const organization: Organization = {
    id: organizationId,
    name: 'Test Org',
    slug: 'test-org',
  };

  let useCase: BuildGitHubAppManifestUseCase;
  let manifestStateService: GitHubAppManifestStateService;
  let accountsPort: jest.Mocked<IAccountsPort>;

  beforeEach(() => {
    mockGetConfig.mockImplementation((key: string) => {
      if (key === 'PACKMIND_GITHUB_APP_NAME') return Promise.resolve('my-app');
      if (key === 'APP_WEB_URL') return Promise.resolve('https://packmind.io');
      return Promise.resolve(null);
    });

    accountsPort = {
      getUserById: jest.fn().mockResolvedValue(adminUser),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    manifestStateService = new GitHubAppManifestStateService(stubLogger());

    useCase = new BuildGitHubAppManifestUseCase(
      accountsPort,
      manifestStateService,
      stubLogger(),
    );
  });

  afterEach(() => {
    manifestStateService.destroy();
    jest.clearAllMocks();
  });

  const buildCommand = () => ({
    userId,
    organizationId,
  });

  describe('manifest fields', () => {
    it('returns the app name from configuration', async () => {
      const result = await useCase.execute(buildCommand());
      expect(result.manifest.name).toBe('my-app');
    });

    it('defaults app name to "packmind" when env var is absent', async () => {
      mockGetConfig.mockImplementation((key: string) => {
        if (key === 'PACKMIND_GITHUB_APP_NAME') return Promise.resolve(null);
        if (key === 'APP_WEB_URL')
          return Promise.resolve('https://packmind.io');
        return Promise.resolve(null);
      });

      const result = await useCase.execute(buildCommand());
      expect(result.manifest.name).toBe('packmind');
    });

    it('returns the correct redirect_url', async () => {
      const result = await useCase.execute(buildCommand());
      expect(result.manifest.redirect_url).toBe(
        'https://packmind.io/integrations/github-app/manifest-callback',
      );
    });

    it('returns the correct callback_urls', async () => {
      const result = await useCase.execute(buildCommand());
      expect(result.manifest.callback_urls).toEqual([
        'https://packmind.io/integrations/github-app/install-callback',
      ]);
    });

    it('returns the correct webhook hook_attributes url', async () => {
      const result = await useCase.execute(buildCommand());
      expect(result.manifest.hook_attributes.url).toBe(
        'https://packmind.io/api/v0/hooks/github-app',
      );
    });

    it('sets public to false', async () => {
      const result = await useCase.execute(buildCommand());
      expect(result.manifest.public).toBe(false);
    });

    it('sets default_permissions correctly', async () => {
      const result = await useCase.execute(buildCommand());
      expect(result.manifest.default_permissions).toEqual({
        contents: 'write',
        metadata: 'read',
        pull_requests: 'write',
      });
    });

    it('sets default_events to push', async () => {
      const result = await useCase.execute(buildCommand());
      expect(result.manifest.default_events).toEqual(['push']);
    });
  });

  describe('state', () => {
    it('returns a non-empty state token', async () => {
      const result = await useCase.execute(buildCommand());
      expect(typeof result.state).toBe('string');
      expect(result.state.length).toBeGreaterThan(0);
    });

    it('returns unique state tokens across calls', async () => {
      const result1 = await useCase.execute(buildCommand());
      const result2 = await useCase.execute(buildCommand());
      expect(result1.state).not.toBe(result2.state);
    });
  });

  describe('manifestPostUrl', () => {
    it('returns the GitHub new app URL', async () => {
      const result = await useCase.execute(buildCommand());
      expect(result.manifestPostUrl).toBe(
        'https://github.com/settings/apps/new',
      );
    });
  });
});
