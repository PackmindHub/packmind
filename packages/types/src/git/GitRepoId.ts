import { Branded, brandedIdFactory } from '../brandedTypes';

export type GitRepoId = Branded<'GitRepoId'>;
export const createGitRepoId = brandedIdFactory<GitRepoId>();
