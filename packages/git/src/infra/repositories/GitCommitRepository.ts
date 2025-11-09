import { GitCommit, GitCommitId, createGitCommitId } from '@packmind/types';
import { IGitCommitRepository } from '../../domain/repositories/IGitCommitRepository';
import { GitCommitSchema } from '../schemas/GitCommitSchema';
import { Repository } from 'typeorm';
import { localDataSource } from '@packmind/node-utils';
import { v4 as uuidv4 } from 'uuid';

export class GitCommitRepository implements IGitCommitRepository {
  constructor(
    private readonly repository: Repository<GitCommit> = localDataSource.getRepository<GitCommit>(
      GitCommitSchema,
    ),
  ) {}

  async add(gitCommit: Omit<GitCommit, 'id'>): Promise<GitCommit> {
    const gitCommitWithId = {
      ...gitCommit,
      id: createGitCommitId(uuidv4()),
    };
    return this.repository.save(gitCommitWithId);
  }

  async get(id: GitCommitId): Promise<GitCommit | null> {
    return this.repository.findOne({ where: { id } });
  }
}
