import {
  ExternalRepository,
  GitRepo,
  ListAvailableReposResponse,
  createGitProviderId,
  createGitRepoId,
} from '@packmind/types';
import {
  addGitRepoHandler,
  AddGitRepoHandlerDependencies,
} from './addGitRepoHandler';
import { PackmindCliHexa } from '../../../PackmindCliHexa';

jest.mock('../../utils/consoleLogger', () => ({
  logInfoConsole: jest.fn(),
  logSuccessConsole: jest.fn(),
  logErrorConsole: jest.fn(),
}));

const connectionId = createGitProviderId('provider-1');

function buildCreatedRepo(branch: string): GitRepo {
  return {
    id: createGitRepoId('repo-1'),
    owner: 'myOrga',
    repo: 'myRepo',
    branch,
    providerId: connectionId,
    isTracked: false,
  };
}

function buildAvailableRepo(
  overrides: Partial<ExternalRepository> = {},
): ExternalRepository {
  return {
    name: 'myRepo',
    owner: 'myOrga',
    private: true,
    defaultBranch: 'main',
    stars: 0,
    ...overrides,
  };
}

function buildAvailablePage(
  repositories: ExternalRepository[],
  overrides: Partial<ListAvailableReposResponse> = {},
): ListAvailableReposResponse {
  return {
    currentPage: 1,
    availablePages: 1,
    lastLoadedPage: 1,
    repositories,
    ...overrides,
  };
}

describe('addGitRepoHandler', () => {
  let mockExit: jest.Mock;
  let mockAddGitRepo: jest.Mock;
  let mockListAvailableGitRepos: jest.Mock;

  function buildDeps(
    overrides: Partial<AddGitRepoHandlerDependencies> = {},
  ): AddGitRepoHandlerDependencies {
    return {
      packmindCliHexa: {
        addGitRepo: mockAddGitRepo,
        listAvailableGitRepos: mockListAvailableGitRepos,
      } as unknown as PackmindCliHexa,
      connectionId,
      repository: 'myOrga/myRepo',
      exit: mockExit,
      ...overrides,
    };
  }

  beforeEach(() => {
    mockExit = jest.fn();
    mockAddGitRepo = jest.fn();
    mockListAvailableGitRepos = jest.fn();
  });

  afterEach(() => jest.clearAllMocks());

  describe('when a branch is provided', () => {
    beforeEach(() => {
      mockAddGitRepo.mockResolvedValue(buildCreatedRepo('develop'));
    });

    it('adds the repo with the given branch without resolving a default', async () => {
      await addGitRepoHandler(buildDeps({ branch: 'develop' }));

      expect(mockAddGitRepo).toHaveBeenCalledWith({
        gitProviderId: connectionId,
        owner: 'myOrga',
        repo: 'myRepo',
        branch: 'develop',
      });
    });

    it('does not query available repositories', async () => {
      await addGitRepoHandler(buildDeps({ branch: 'develop' }));

      expect(mockListAvailableGitRepos).not.toHaveBeenCalled();
    });

    it('exits with code 0', async () => {
      await addGitRepoHandler(buildDeps({ branch: 'develop' }));

      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when the branch is omitted', () => {
    beforeEach(() => {
      mockAddGitRepo.mockResolvedValue(buildCreatedRepo('main'));
    });

    it('resolves the default branch from the available repositories', async () => {
      mockListAvailableGitRepos.mockResolvedValue(
        buildAvailablePage([buildAvailableRepo({ defaultBranch: 'main' })]),
      );

      await addGitRepoHandler(buildDeps());

      expect(mockAddGitRepo).toHaveBeenCalledWith({
        gitProviderId: connectionId,
        owner: 'myOrga',
        repo: 'myRepo',
        branch: 'main',
      });
    });

    it('scans further pages until it finds the repository', async () => {
      mockListAvailableGitRepos
        .mockResolvedValueOnce(
          buildAvailablePage([buildAvailableRepo({ name: 'other' })], {
            availablePages: 2,
          }),
        )
        .mockResolvedValueOnce(
          buildAvailablePage([buildAvailableRepo({ defaultBranch: 'main' })], {
            currentPage: 2,
            availablePages: 2,
          }),
        );

      await addGitRepoHandler(buildDeps());

      expect(mockListAvailableGitRepos).toHaveBeenLastCalledWith(
        connectionId,
        2,
      );
    });

    describe('and the repository is not among the available ones', () => {
      beforeEach(() => {
        mockListAvailableGitRepos.mockResolvedValue(
          buildAvailablePage([buildAvailableRepo({ name: 'other' })]),
        );
      });

      it('exits with code 1', async () => {
        await addGitRepoHandler(buildDeps());

        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('when the repository argument is malformed', () => {
    it('does not call the API', async () => {
      await addGitRepoHandler(buildDeps({ repository: 'not-a-slug' }));

      expect(mockAddGitRepo).not.toHaveBeenCalled();
    });

    it('exits with code 1', async () => {
      await addGitRepoHandler(buildDeps({ repository: 'not-a-slug' }));

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when the API call fails', () => {
    it('exits with code 1', async () => {
      mockAddGitRepo.mockRejectedValue(new Error('boom'));

      await addGitRepoHandler(buildDeps({ branch: 'main' }));

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});
