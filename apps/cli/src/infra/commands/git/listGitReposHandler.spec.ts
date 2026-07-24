import {
  ExternalRepository,
  GitRepo,
  createGitProviderId,
  createGitRepoId,
  ListAvailableReposResponse,
} from '@packmind/types';
import {
  listGitReposHandler,
  ListGitReposHandlerDependencies,
} from './listGitReposHandler';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import * as consoleLogger from '../../utils/consoleLogger';

jest.mock('../../utils/consoleLogger', () => ({
  logConsole: jest.fn(),
  logInfoConsole: jest.fn(),
  logErrorConsole: jest.fn(),
  formatSlug: jest.fn((t: string) => t),
  formatLabel: jest.fn((t: string) => t),
}));

const mockLogger = consoleLogger as jest.Mocked<typeof consoleLogger>;

function getLoggedLines(): string[] {
  return mockLogger.logConsole.mock.calls.map(([msg]) => msg);
}

const connectionId = createGitProviderId('provider-1');

function buildManagedRepo(): GitRepo {
  return {
    id: createGitRepoId('repo-1'),
    owner: 'myOrga',
    repo: 'myRepo',
    branch: 'main',
    providerId: connectionId,
    isTracked: false,
  };
}

function buildAvailableRepo(): ExternalRepository {
  return {
    name: 'myRepo',
    owner: 'myOrga',
    private: true,
    defaultBranch: 'main',
    stars: 0,
  };
}

function buildAvailableResponse(): ListAvailableReposResponse {
  return {
    currentPage: 1,
    availablePages: 1,
    lastLoadedPage: 1,
    repositories: [buildAvailableRepo()],
  };
}

describe('listGitReposHandler', () => {
  let mockExit: jest.Mock;
  let mockListGitRepos: jest.Mock;
  let mockListAvailableGitRepos: jest.Mock;

  function buildDeps(
    overrides: Partial<ListGitReposHandlerDependencies> = {},
  ): ListGitReposHandlerDependencies {
    return {
      packmindCliHexa: {
        listGitRepos: mockListGitRepos,
        listAvailableGitRepos: mockListAvailableGitRepos,
      } as unknown as PackmindCliHexa,
      connectionId,
      showAvailable: false,
      exit: mockExit,
      ...overrides,
    };
  }

  beforeEach(() => {
    mockExit = jest.fn();
    mockListGitRepos = jest.fn();
    mockListAvailableGitRepos = jest.fn();
  });

  afterEach(() => jest.clearAllMocks());

  describe('when listing managed repositories', () => {
    beforeEach(() => {
      mockListGitRepos.mockResolvedValue([buildManagedRepo()]);
    });

    it('queries the managed repositories for the connection', async () => {
      await listGitReposHandler(buildDeps());

      expect(mockListGitRepos).toHaveBeenCalledWith(connectionId);
    });

    it('prints the managed repository slug', async () => {
      await listGitReposHandler(buildDeps());

      expect(getLoggedLines()).toContain('- myOrga/myRepo');
    });

    it('exits with code 0', async () => {
      await listGitReposHandler(buildDeps());

      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when no managed repositories exist', () => {
    beforeEach(() => {
      mockListGitRepos.mockResolvedValue([]);
    });

    it('reports that none were found', async () => {
      await listGitReposHandler(buildDeps());

      expect(getLoggedLines()).toContain(
        'No managed repositories found for this connection.',
      );
    });
  });

  describe('when listing available repositories', () => {
    beforeEach(() => {
      mockListAvailableGitRepos.mockResolvedValue(buildAvailableResponse());
    });

    it('queries the available repositories for the connection', async () => {
      await listGitReposHandler(buildDeps({ showAvailable: true, page: 2 }));

      expect(mockListAvailableGitRepos).toHaveBeenCalledWith(connectionId, 2);
    });

    it('prints the available repository slug', async () => {
      await listGitReposHandler(buildDeps({ showAvailable: true }));

      expect(getLoggedLines()).toContain('- myOrga/myRepo');
    });

    it('exits with code 0', async () => {
      await listGitReposHandler(buildDeps({ showAvailable: true }));

      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when the fetch fails', () => {
    beforeEach(() => {
      mockListGitRepos.mockRejectedValue(new Error('boom'));
    });

    it('exits with code 1', async () => {
      await listGitReposHandler(buildDeps());

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});
