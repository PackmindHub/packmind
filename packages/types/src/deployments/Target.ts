import { TargetId } from './TargetId';
import { GitRepoId } from '../git/GitRepoId';
import { GitRepo } from '../git/GitRepo';

export type Target = {
  id: TargetId;
  name: string;
  path: string;
  gitRepoId: GitRepoId;
  gitRepo?: GitRepo;
};
