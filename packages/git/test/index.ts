import { DataSource } from 'typeorm';

export * from './gitProviderFactory';
export * from './gitRepoFactory';
import { gitCommitFactory } from './gitCommitFactory';

import { GitCommit } from '../src/domain/entities/GitCommit';
import { GitCommitSchema } from '../src/infra/schemas/GitCommitSchema';

export { gitCommitFactory };

export const createGitCommit = async (
  dataSource: DataSource,
  user?: Partial<GitCommit>,
): Promise<GitCommit> => {
  const repository = dataSource.getRepository(GitCommitSchema);
  return repository.save(gitCommitFactory(user));
};
