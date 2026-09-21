import { isInternalError, isUpstreamError } from '@packmind/types';
import { AvailableRemoteDirectoriesFailedError } from './AvailableRemoteDirectoriesFailedError';
import { DirectoryExistenceCheckFailedError } from './DirectoryExistenceCheckFailedError';
import { GitlabApiOperationFailedError } from './GitlabApiOperationFailedError';
import { GitlabAvailableRepositoriesFailedError } from './GitlabAvailableRepositoriesFailedError';
import { GitlabBranchExistenceCheckFailedError } from './GitlabBranchExistenceCheckFailedError';
import {
  GitlabApiErrorResponseError,
  GitlabUnexpectedResponseFormatError,
} from './GitlabResponseShapeErrors';

describe.each([
  [
    'GitlabApiOperationFailedError',
    new GitlabApiOperationFailedError('commit files to GitLab', new Error('x')),
  ],
  [
    'GitlabAvailableRepositoriesFailedError',
    new GitlabAvailableRepositoriesFailedError(new Error('x')),
  ],
  [
    'GitlabBranchExistenceCheckFailedError',
    new GitlabBranchExistenceCheckFailedError(
      'acme',
      'app',
      'main',
      new Error('x'),
    ),
  ],
  [
    'GitlabApiErrorResponseError',
    new GitlabApiErrorResponseError('acme/app', 'main', 'boom'),
  ],
  [
    'GitlabUnexpectedResponseFormatError',
    new GitlabUnexpectedResponseFormatError('acme/app', 'main'),
  ],
  [
    'DirectoryExistenceCheckFailedError',
    new DirectoryExistenceCheckFailedError(
      'repo-1',
      'packmind',
      'main',
      new Error('x'),
    ),
  ],
  [
    'AvailableRemoteDirectoriesFailedError',
    new AvailableRemoteDirectoriesFailedError(
      'org-1',
      'repo-1',
      new Error('x'),
    ),
  ],
])('%s', (_name, error) => {
  it('is an upstream error', () => {
    expect(isUpstreamError(error)).toBe(true);
  });

  it('is no longer blamed on us', () => {
    expect(isInternalError(error)).toBe(false);
  });

  it('answers 502 rather than 500', () => {
    expect(error.kind).toBe('upstream_unavailable');
  });
});
