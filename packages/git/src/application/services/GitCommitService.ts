import { GitCommit, GitCommitId } from '../../domain/entities/GitCommit';
import { IGitCommitRepository } from '../../domain/repositories/IGitCommitRepository';
import { PackmindLogger } from '@packmind/shared';

export class GitCommitService {
  constructor(
    private readonly gitCommitRepository: IGitCommitRepository,
    private readonly logger: PackmindLogger,
  ) {}

  async addCommit(commitData: Omit<GitCommit, 'id'>): Promise<GitCommit> {
    this.logger.info('Adding git commit', { sha: commitData.sha });
    return this.gitCommitRepository.add(commitData);
  }

  async getCommit(id: GitCommitId): Promise<GitCommit | null> {
    return this.gitCommitRepository.get(id);
  }
}
