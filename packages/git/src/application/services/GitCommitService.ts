import { GitCommit, GitCommitId } from '@packmind/types';
import { IGitCommitRepository } from '../../domain/repositories/IGitCommitRepository';
import { PackmindLogger } from '@packmind/logger';

const origin = 'GitCommitService';

export class GitCommitService {
  constructor(
    private readonly gitCommitRepository: IGitCommitRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async addCommit(commitData: Omit<GitCommit, 'id'>): Promise<GitCommit> {
    this.logger.info('Adding git commit', { sha: commitData.sha });
    return this.gitCommitRepository.add(commitData);
  }

  async getCommit(id: GitCommitId): Promise<GitCommit | null> {
    return this.gitCommitRepository.get(id);
  }
}
