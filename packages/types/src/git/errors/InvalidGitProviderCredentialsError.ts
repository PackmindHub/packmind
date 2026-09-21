import { GitError } from './GitError';

/**
 * The single positional argument is the user-facing message describing why
 * the credentials were rejected: it is built by the credential probe, which
 * already phrases the failure for the caller. It used to be exposed as
 * `reason`, which now belongs to the base class as a literal a client can
 * branch on.
 */
export class InvalidGitProviderCredentialsError extends GitError {
  constructor(message: string) {
    super('invalid_input', 'invalid_git_provider_credentials', {}, message);
    this.name = 'InvalidGitProviderCredentialsError';
  }
}
