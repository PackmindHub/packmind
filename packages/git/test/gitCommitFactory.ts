import { Factory } from '@packmind/test-utils';
import { GitCommit, createGitCommitId } from '../src/domain/entities/GitCommit';
import { v4 as uuidv4 } from 'uuid';

export const gitCommitFactory: Factory<GitCommit> = (
  gitCommit?: Partial<GitCommit>,
) => {
  return {
    id: createGitCommitId(uuidv4()),
    sha: '1234567890abcdef1234567890abcdef12345678',
    message: 'Test commit message',
    author: 'Test Author <test@example.com>',
    url: 'https://github.com/test-owner/test-repo/commit/1234567890abcdef1234567890abcdef12345678',
    ...gitCommit,
  };
};
