import {
  GetTrackingInfoCommand,
  GetTrackingInfoResult,
  IGetTrackingInfoUseCase,
} from '../../../domain/useCases/trackRepository/IGetTrackingInfoUseCase';
import { IRepositoryTrackingGateway } from '../../../domain/repositories/IRepositoryTrackingGateway';
import { IGitService } from '../../../domain/services/IGitService';
import { parseOwnerRepo } from './TrackRepositoryUseCase';

/**
 * Reports what Packmind tracks for the local repository. Read-only counterpart
 * of the TrackRepositoryUseCase: no confirmation, no mutation, no console
 * output — the handler owns presentation.
 */
export class GetTrackingInfoUseCase implements IGetTrackingInfoUseCase {
  constructor(
    private readonly gateway: IRepositoryTrackingGateway,
    private readonly gitService: IGitService,
  ) {}

  public async execute({
    repoPath,
  }: GetTrackingInfoCommand): Promise<GetTrackingInfoResult> {
    // Both throw with a clear message when not in a git repo or when there is
    // no remote, matching how `track` reports the same situations.
    const { gitRemoteUrl } = this.gitService.getGitRemoteUrl(repoPath);
    const { branch: currentBranch } =
      this.gitService.getCurrentBranch(repoPath);
    const { owner, repo } = parseOwnerRepo(gitRemoteUrl);

    const { gitRepo } = await this.gateway.getTrackedRepository({
      owner,
      repo,
    });

    if (!gitRepo) {
      return { status: 'not-tracked', owner, repo, currentBranch };
    }

    return {
      status: 'tracked',
      owner,
      repo,
      trackedBranch: gitRepo.branch,
      currentBranch,
      // Skipped when it is the branch we are on: being on it proves it exists,
      // and this is the common case, so it saves a git call.
      trackedBranchExists:
        gitRepo.branch === currentBranch ||
        this.gitService.branchExists(repoPath, gitRepo.branch),
    };
  }
}
