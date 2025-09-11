import { Branded, brandedIdFactory } from '../brandedTypes';
import { GitRepoId } from '../git';

export type TargetId = Branded<'TargetId'>;
export const createTargetId = brandedIdFactory<TargetId>();

export type Target = {
  id: TargetId;
  name: string;
  path: string;
  gitRepoId: GitRepoId;
};
