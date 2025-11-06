import { Target } from './Target';
import { GitRepo } from '../git/GitRepo';

export type TargetWithRepository = Target & {
  repository: Pick<GitRepo, 'owner' | 'repo' | 'branch'>;
};
