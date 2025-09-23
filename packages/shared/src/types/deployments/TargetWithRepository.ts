import { Target } from './Target';
import { GitRepo } from '../git';

export type TargetWithRepository = Target & {
  repository: Pick<GitRepo, 'owner' | 'repo' | 'branch'>;
};
