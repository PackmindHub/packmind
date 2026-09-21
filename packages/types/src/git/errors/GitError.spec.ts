import { isDomainError } from '../../errors';
import { GitHubAppRevokedError } from './GitHubAppRevokedError';
import { GitProviderHasRepositoriesError } from './GitProviderHasRepositoriesError';
import { GitProviderNotFoundError } from './GitProviderNotFoundError';
import { GitProviderOrganizationMismatchError } from './GitProviderOrganizationMismatchError';
import { GitRemoteAccessForbiddenError } from './GitRemoteAccessForbiddenError';
import { GitRepoAlreadyExistsError } from './GitRepoAlreadyExistsError';
import { InvalidGitProviderCredentialsError } from './InvalidGitProviderCredentialsError';
import { NoTrackedRepositoryError } from './NoTrackedRepositoryError';
import { RepositoryNotTrackableError } from './RepositoryNotTrackableError';
import { TargetPathUpdateForbiddenError } from './TargetPathUpdateForbiddenError';

describe('GitProviderNotFoundError', () => {
  const error = new GitProviderNotFoundError('provider-1');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers not_found', () => {
    expect(error.kind).toBe('not_found');
  });

  it('carries the reason a client branches on', () => {
    expect(error.reason).toBe('git_provider_not_found');
  });

  it('keeps the provider id in the context', () => {
    expect(error.context).toEqual({ gitProviderId: 'provider-1' });
  });

  it('does not name the provider in the message', () => {
    expect(error.message).toBe('Git provider not found');
  });
});

describe('GitProviderOrganizationMismatchError', () => {
  const error = new GitProviderOrganizationMismatchError('provider-1', 'org-1');

  it('answers not_found', () => {
    expect(error.kind).toBe('not_found');
  });

  it('reads exactly like a provider that was never there', () => {
    expect(error.message).toBe(
      new GitProviderNotFoundError('provider-1').message,
    );
  });

  it('shares the reason of a provider that was never there', () => {
    expect(error.reason).toBe('git_provider_not_found');
  });

  it('keeps the organization the lookup was scoped to in the context', () => {
    expect(error.context).toEqual({
      gitProviderId: 'provider-1',
      organizationId: 'org-1',
    });
  });
});

describe('GitRepoAlreadyExistsError', () => {
  const error = new GitRepoAlreadyExistsError(
    'packmind',
    'packmind',
    'main',
    'org-1',
  );

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers conflict', () => {
    expect(error.kind).toBe('conflict');
  });

  it('keeps the caller-supplied repository in the message', () => {
    expect(error.message).toBe(
      "Repository packmind/packmind on branch 'main' already exists in this organization",
    );
  });

  it('keeps the whole coordinate in the context', () => {
    expect(error.context).toEqual({
      owner: 'packmind',
      repo: 'packmind',
      branch: 'main',
      organizationId: 'org-1',
    });
  });
});

describe('GitProviderHasRepositoriesError', () => {
  const error = new GitProviderHasRepositoriesError('provider-1', 3);

  it('answers invalid_input', () => {
    expect(error.kind).toBe('invalid_input');
  });

  it('keeps the count in the message', () => {
    expect(error.message).toContain('3 repositories');
  });

  it('keeps the provider out of the message', () => {
    expect(error.message).not.toContain('provider-1');
  });

  it('carries the provider and the count in the context', () => {
    expect(error.context).toEqual({
      gitProviderId: 'provider-1',
      repositoryCount: 3,
    });
  });
});

describe('TargetPathUpdateForbiddenError', () => {
  const error = new TargetPathUpdateForbiddenError('target-1');

  it('answers invalid_input', () => {
    expect(error.kind).toBe('invalid_input');
  });

  it('keeps the target id out of the message', () => {
    expect(error.message).not.toContain('target-1');
  });

  it('carries the target id in the context', () => {
    expect(error.context).toEqual({ targetId: 'target-1' });
  });
});

describe('GitHubAppRevokedError', () => {
  const error = new GitHubAppRevokedError('provider-1');

  it('answers forbidden', () => {
    expect(error.kind).toBe('forbidden');
  });

  it('keeps the provider id out of the message', () => {
    expect(error.message).not.toContain('provider-1');
  });

  it('carries the provider id in the context', () => {
    expect(error.context).toEqual({ gitProviderId: 'provider-1' });
  });
});

describe('InvalidGitProviderCredentialsError', () => {
  const error = new InvalidGitProviderCredentialsError('Token is expired');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers invalid_input', () => {
    expect(error.kind).toBe('invalid_input');
  });

  it('keeps the probe message it was built with', () => {
    expect(error.message).toBe('Token is expired');
  });

  it('carries a literal reason rather than the free-text message', () => {
    expect(error.reason).toBe('invalid_git_provider_credentials');
  });
});

describe.each([
  ['NoTrackedRepositoryError', new NoTrackedRepositoryError('acme', 'app')],
  [
    'RepositoryNotTrackableError',
    new RepositoryNotTrackableError('acme', 'app'),
  ],
])('%s', (_name, error) => {
  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers conflict, so the CLI does not read it as an unavailable feature', () => {
    expect(error.kind).toBe('conflict');
  });

  it('keeps the repository coordinate in the context', () => {
    expect(error.context).toEqual({ owner: 'acme', repo: 'app' });
  });
});

describe('GitRemoteAccessForbiddenError', () => {
  const error = new GitRemoteAccessForbiddenError(
    'GitHub',
    'acme',
    'app',
    'write',
  );

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers forbidden', () => {
    expect(error.kind).toBe('forbidden');
  });

  it('carries the reason a client branches on', () => {
    expect(error.reason).toBe('git_remote_access_forbidden');
  });

  it('keeps the coordinate and the missing access in the context', () => {
    expect(error.context).toEqual({
      vendor: 'GitHub',
      owner: 'acme',
      repo: 'app',
      action: 'write',
    });
  });

  it('names the vendor, the repository and the access the token lacks', () => {
    expect(error.message).toBe(
      "Access to the GitHub repository acme/app was refused. Check that the connection's token has write access.",
    );
  });

  it('reads the same for the other vendor', () => {
    expect(
      new GitRemoteAccessForbiddenError('GitLab', 'acme', 'app', 'write')
        .message,
    ).toBe(
      "Access to the GitLab repository acme/app was refused. Check that the connection's token has write access.",
    );
  });
});
