import { PackmindCommand, IUseCase } from '../../UseCase';
import { GitProvider } from '../GitProvider';

export type AddGitProviderCommand = PackmindCommand & {
  gitProvider: Omit<GitProvider, 'id' | 'organizationId'>;
  /**
   * Optional flag to allow creating providers without tokens.
   * This is used internally by the CLI for tokenless distribution tracking.
   * API endpoints should always override this to false for security.
   * @default false
   */
  allowTokenlessProvider?: boolean;
  /**
   * Check the supplied token against the provider before storing it, so a
   * connection is never created in a state that looks healthy and cannot fetch
   * anything.
   *
   * Opt-in because it costs a network round trip and is only meaningful when a
   * human just typed the credential: API endpoints that accept a token should
   * set it true. Programmatic creation — CLI repository tracking, the GitHub
   * App installation callback — leaves it false and stays offline.
   * @default false
   */
  verifyCredentials?: boolean;
};

export type AddGitProviderResponse = GitProvider;

export type IAddGitProviderUseCase = IUseCase<
  AddGitProviderCommand,
  AddGitProviderResponse
>;
