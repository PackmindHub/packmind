import { GitRepo, GitRepoId } from '@packmind/types';
import { TrackRepositoryUseCase } from './TrackRepositoryUseCase';
import { IRepositoryTrackingGateway } from '../../../domain/repositories/IRepositoryTrackingGateway';
import { IGitService } from '../../../domain/services/IGitService';
import { NotLoggedInError } from '../../../domain/errors/NotLoggedInError';
import {
  TrackRepositoryConfirmation,
  TrackRepositoryResult,
} from '../../../domain/useCases/trackRepository/ITrackRepositoryUseCase';

const REMOTE_URL = 'https://github.com/my-orga/my-repo';

function makeGitRepo(branch: string, isTracked = true): GitRepo {
  return {
    id: 'repo-id' as GitRepoId,
    owner: 'my-orga',
    repo: 'my-repo',
    branch,
    providerId: 'provider-id' as GitRepo['providerId'],
    isTracked,
  };
}

describe('TrackRepositoryUseCase', () => {
  let gateway: jest.Mocked<IRepositoryTrackingGateway>;
  let gitService: jest.Mocked<IGitService>;
  let useCase: TrackRepositoryUseCase;
  let confirm: jest.MockedFunction<
    (details: TrackRepositoryConfirmation) => Promise<boolean>
  >;

  beforeEach(() => {
    gateway = {
      getTrackedRepository: jest.fn(),
      setTrackedRepository: jest.fn(),
      updateTrackedBranch: jest.fn(),
    };
    gitService = {
      getGitRemoteUrl: jest.fn().mockReturnValue({ gitRemoteUrl: REMOTE_URL }),
      getCurrentBranch: jest.fn().mockReturnValue({ branch: 'dev' }),
    } as unknown as jest.Mocked<IGitService>;
    confirm = jest.fn().mockResolvedValue(true);
    useCase = new TrackRepositoryUseCase(gateway, gitService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('when nothing is tracked and update is false', () => {
    let result: TrackRepositoryResult;

    beforeEach(async () => {
      gateway.getTrackedRepository.mockResolvedValue({ gitRepo: null });
      gateway.setTrackedRepository.mockResolvedValue(makeGitRepo('dev'));
      result = await useCase.execute({
        repoPath: '/repo',
        origin: 'track',
        update: false,
        confirm,
      });
    });

    it('prompts for confirmation with the set details', () => {
      expect(confirm).toHaveBeenCalledWith({
        mode: 'set',
        owner: 'my-orga',
        repo: 'my-repo',
        branch: 'dev',
      });
    });

    it('sets the tracked repository through the gateway', () => {
      expect(gateway.setTrackedRepository).toHaveBeenCalledWith({
        owner: 'my-orga',
        repo: 'my-repo',
        branch: 'dev',
        origin: 'track',
        providerVendor: 'github',
        gitRemoteUrl: REMOTE_URL,
      });
    });

    it('returns the set outcome', () => {
      expect(result).toEqual({
        status: 'set',
        owner: 'my-orga',
        repo: 'my-repo',
        branch: 'dev',
        gitRepo: makeGitRepo('dev'),
      });
    });
  });

  describe('when nothing is tracked and the confirmation is declined', () => {
    let result: TrackRepositoryResult;

    beforeEach(async () => {
      gateway.getTrackedRepository.mockResolvedValue({ gitRepo: null });
      confirm.mockResolvedValue(false);
      result = await useCase.execute({
        repoPath: '/repo',
        origin: 'track',
        update: false,
        confirm,
      });
    });

    it('does not set anything', () => {
      expect(gateway.setTrackedRepository).not.toHaveBeenCalled();
    });

    it('returns the cancelled outcome', () => {
      expect(result).toEqual({ status: 'cancelled' });
    });
  });

  describe('when a different branch is already tracked and update is false', () => {
    let result: TrackRepositoryResult;

    beforeEach(async () => {
      gateway.getTrackedRepository.mockResolvedValue({
        gitRepo: makeGitRepo('main'),
      });
      result = await useCase.execute({
        repoPath: '/repo',
        origin: 'track',
        update: false,
        confirm,
      });
    });

    it('does not prompt for confirmation', () => {
      expect(confirm).not.toHaveBeenCalled();
    });

    it('does not set anything', () => {
      expect(gateway.setTrackedRepository).not.toHaveBeenCalled();
    });

    it('returns the already-tracked-other-branch outcome', () => {
      expect(result).toEqual({
        status: 'already-tracked-other-branch',
        owner: 'my-orga',
        repo: 'my-repo',
        branch: 'dev',
        trackedBranch: 'main',
      });
    });
  });

  describe('when the same branch is already tracked and update is false', () => {
    it('returns the already-tracked-same-branch outcome', async () => {
      gateway.getTrackedRepository.mockResolvedValue({
        gitRepo: makeGitRepo('dev'),
      });

      const result = await useCase.execute({
        repoPath: '/repo',
        origin: 'track',
        update: false,
        confirm,
      });

      expect(result).toEqual({
        status: 'already-tracked-same-branch',
        owner: 'my-orga',
        repo: 'my-repo',
        branch: 'dev',
      });
    });
  });

  describe('when update is true and a different branch is tracked', () => {
    let result: TrackRepositoryResult;

    beforeEach(async () => {
      gateway.getTrackedRepository.mockResolvedValue({
        gitRepo: makeGitRepo('main'),
      });
      gateway.updateTrackedBranch.mockResolvedValue(makeGitRepo('dev'));
      result = await useCase.execute({
        repoPath: '/repo',
        origin: 'track',
        update: true,
        confirm,
      });
    });

    it('prompts to confirm the branch change', () => {
      expect(confirm).toHaveBeenCalledWith({
        mode: 'update',
        owner: 'my-orga',
        repo: 'my-repo',
        branch: 'dev',
        fromBranch: 'main',
      });
    });

    it('updates the tracked branch through the gateway', () => {
      expect(gateway.updateTrackedBranch).toHaveBeenCalledWith({
        owner: 'my-orga',
        repo: 'my-repo',
        branch: 'dev',
      });
    });

    it('returns the updated outcome', () => {
      expect(result).toEqual({
        status: 'updated',
        owner: 'my-orga',
        repo: 'my-repo',
        branch: 'dev',
        fromBranch: 'main',
        gitRepo: makeGitRepo('dev'),
      });
    });
  });

  describe('when update is true and the change is declined', () => {
    let result: TrackRepositoryResult;

    beforeEach(async () => {
      gateway.getTrackedRepository.mockResolvedValue({
        gitRepo: makeGitRepo('main'),
      });
      confirm.mockResolvedValue(false);
      result = await useCase.execute({
        repoPath: '/repo',
        origin: 'track',
        update: true,
        confirm,
      });
    });

    it('does not update anything', () => {
      expect(gateway.updateTrackedBranch).not.toHaveBeenCalled();
    });

    it('returns the cancelled outcome', () => {
      expect(result).toEqual({ status: 'cancelled' });
    });
  });

  describe('when update is true and the same branch is tracked', () => {
    let result: TrackRepositoryResult;

    beforeEach(async () => {
      gateway.getTrackedRepository.mockResolvedValue({
        gitRepo: makeGitRepo('dev'),
      });
      result = await useCase.execute({
        repoPath: '/repo',
        origin: 'track',
        update: true,
        confirm,
      });
    });

    it('does not update anything', () => {
      expect(gateway.updateTrackedBranch).not.toHaveBeenCalled();
    });

    it('returns the already-tracked-same-branch outcome', () => {
      expect(result).toEqual({
        status: 'already-tracked-same-branch',
        owner: 'my-orga',
        repo: 'my-repo',
        branch: 'dev',
      });
    });
  });

  describe('when update is true and nothing is tracked', () => {
    let result: TrackRepositoryResult;

    beforeEach(async () => {
      gateway.getTrackedRepository.mockResolvedValue({ gitRepo: null });
      result = await useCase.execute({
        repoPath: '/repo',
        origin: 'track',
        update: true,
        confirm,
      });
    });

    it('does not update anything', () => {
      expect(gateway.updateTrackedBranch).not.toHaveBeenCalled();
    });

    it('returns the nothing-tracked outcome', () => {
      expect(result).toEqual({
        status: 'nothing-tracked',
        owner: 'my-orga',
        repo: 'my-repo',
        branch: 'dev',
      });
    });
  });

  describe('when not inside a git repository', () => {
    beforeEach(() => {
      gitService.getGitRemoteUrl.mockImplementation(() => {
        throw new Error('not a git repository');
      });
    });

    it('propagates the git service error', async () => {
      await expect(
        useCase.execute({
          repoPath: '/repo',
          origin: 'track',
          update: false,
          confirm,
        }),
      ).rejects.toThrow('not a git repository');
    });

    it('does not query the tracking gateway', async () => {
      await useCase
        .execute({
          repoPath: '/repo',
          origin: 'track',
          update: false,
          confirm,
        })
        .catch(() => undefined);

      expect(gateway.getTrackedRepository).not.toHaveBeenCalled();
    });
  });

  describe('when there is no git remote', () => {
    it('propagates the git service error', async () => {
      gitService.getGitRemoteUrl.mockImplementation(() => {
        throw new Error('No Git remotes found in the repository');
      });

      await expect(
        useCase.execute({
          repoPath: '/repo',
          origin: 'track',
          update: false,
          confirm,
        }),
      ).rejects.toThrow('No Git remotes found in the repository');
    });
  });

  describe('when the user is not logged in', () => {
    it('propagates the NotLoggedInError', async () => {
      gateway.getTrackedRepository.mockRejectedValue(new NotLoggedInError());

      await expect(
        useCase.execute({
          repoPath: '/repo',
          origin: 'track',
          update: false,
          confirm,
        }),
      ).rejects.toBeInstanceOf(NotLoggedInError);
    });
  });

  describe('when the gateway mutation fails', () => {
    it('propagates the gateway error', async () => {
      gateway.getTrackedRepository.mockResolvedValue({ gitRepo: null });
      const error: Error & { statusCode?: number } = new Error(
        'You are not an admin',
      );
      error.statusCode = 403;
      gateway.setTrackedRepository.mockRejectedValue(error);

      await expect(
        useCase.execute({
          repoPath: '/repo',
          origin: 'track',
          update: false,
          confirm,
        }),
      ).rejects.toThrow('You are not an admin');
    });
  });
});
