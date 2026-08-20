import { GitRepo, GitRepoId } from '@packmind/types';
import { GetTrackingInfoUseCase } from './GetTrackingInfoUseCase';
import { IRepositoryTrackingGateway } from '../../../domain/repositories/IRepositoryTrackingGateway';
import { IGitService } from '../../../domain/services/IGitService';
import { GetTrackingInfoResult } from '../../../domain/useCases/trackRepository/IGetTrackingInfoUseCase';

const REMOTE_URL = 'https://github.com/my-orga/my-repo';

function makeGitRepo(branch: string): GitRepo {
  return {
    id: 'repo-id' as GitRepoId,
    owner: 'my-orga',
    repo: 'my-repo',
    branch,
    providerId: 'provider-id' as GitRepo['providerId'],
    isTracked: true,
    trackingRemovedAt: null,
  };
}

describe('GetTrackingInfoUseCase', () => {
  let gateway: jest.Mocked<IRepositoryTrackingGateway>;
  let gitService: jest.Mocked<IGitService>;
  let useCase: GetTrackingInfoUseCase;

  beforeEach(() => {
    gateway = {
      getTrackedRepository: jest.fn(),
      setTrackedRepository: jest.fn(),
      updateTrackedBranch: jest.fn(),
      removeTrackedRepository: jest.fn(),
    };
    gitService = {
      getGitRemoteUrl: jest.fn().mockReturnValue({ gitRemoteUrl: REMOTE_URL }),
      getCurrentBranch: jest
        .fn()
        .mockReturnValue({ branch: 'dev', detached: false }),
      branchExists: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<IGitService>;
    useCase = new GetTrackingInfoUseCase(gateway, gitService);
  });

  afterEach(() => jest.clearAllMocks());

  it('looks up the repository derived from the git remote', async () => {
    gateway.getTrackedRepository.mockResolvedValue({ gitRepo: null });

    await useCase.execute({ repoPath: '/repo' });

    expect(gateway.getTrackedRepository).toHaveBeenCalledWith({
      owner: 'my-orga',
      repo: 'my-repo',
    });
  });

  describe('when the tracked branch is the checked-out one', () => {
    let result: GetTrackingInfoResult;

    beforeEach(async () => {
      gateway.getTrackedRepository.mockResolvedValue({
        gitRepo: makeGitRepo('dev'),
      });
      result = await useCase.execute({ repoPath: '/repo' });
    });

    it('reports both branches as dev', () => {
      expect(result).toEqual({
        status: 'tracked',
        owner: 'my-orga',
        repo: 'my-repo',
        trackedBranch: 'dev',
        currentBranch: 'dev',
        trackedBranchExists: true,
        currentBranchDetached: false,
      });
    });

    // Standing on the branch proves it exists.
    it('does not ask git whether the branch exists', () => {
      expect(gitService.branchExists).not.toHaveBeenCalled();
    });
  });

  describe('when another branch is tracked', () => {
    let result: GetTrackingInfoResult;

    beforeEach(async () => {
      gateway.getTrackedRepository.mockResolvedValue({
        gitRepo: makeGitRepo('main'),
      });
      result = await useCase.execute({ repoPath: '/repo' });
    });

    // The mismatch is what makes distributions go unrecorded, so both branches
    // travel back to the caller instead of only the tracked one.
    it('reports the tracked branch alongside the checked-out one', () => {
      expect(result).toEqual({
        status: 'tracked',
        owner: 'my-orga',
        repo: 'my-repo',
        trackedBranch: 'main',
        currentBranch: 'dev',
        trackedBranchExists: true,
        currentBranchDetached: false,
      });
    });

    it('checks the tracked branch against the repository', () => {
      expect(gitService.branchExists).toHaveBeenCalledWith('/repo', 'main');
    });
  });

  // The state left behind by a merged pull request whose branch was deleted:
  // tracking survives the branch, and records nothing for anybody.
  describe('when the tracked branch no longer exists', () => {
    let result: GetTrackingInfoResult;

    beforeEach(async () => {
      gitService.branchExists.mockReturnValue(false);
      gateway.getTrackedRepository.mockResolvedValue({
        gitRepo: makeGitRepo('feature/login'),
      });
      result = await useCase.execute({ repoPath: '/repo' });
    });

    it('reports the tracked branch as gone', () => {
      expect(result).toEqual({
        status: 'tracked',
        owner: 'my-orga',
        repo: 'my-repo',
        trackedBranch: 'feature/login',
        currentBranch: 'dev',
        trackedBranchExists: false,
        currentBranchDetached: false,
      });
    });
  });

  describe('when the repository is not tracked', () => {
    let result: GetTrackingInfoResult;

    beforeEach(async () => {
      gateway.getTrackedRepository.mockResolvedValue({ gitRepo: null });
      result = await useCase.execute({ repoPath: '/repo' });
    });

    it('reports the repository and the checked-out branch', () => {
      expect(result).toEqual({
        status: 'not-tracked',
        owner: 'my-orga',
        repo: 'my-repo',
        currentBranch: 'dev',
        currentBranchDetached: false,
      });
    });
  });

  describe('when the gateway fails', () => {
    beforeEach(() => {
      gateway.getTrackedRepository.mockRejectedValue(new Error('boom'));
    });

    // Mapping failures to user-facing copy belongs to the handler.
    it('propagates the error', async () => {
      await expect(useCase.execute({ repoPath: '/repo' })).rejects.toThrow(
        'boom',
      );
    });
  });
});
