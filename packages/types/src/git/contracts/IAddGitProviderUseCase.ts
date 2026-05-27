import { PackmindCommand, IUseCase } from '../../UseCase';
import { GitProvider, GitProviderAuthType } from '../GitProvider';

export type AddGitProviderCommand = PackmindCommand & {
  gitProvider: Omit<
    GitProvider,
    'id' | 'organizationId' | 'authType' | 'githubAppInstallationId'
  > & {
    authType?: GitProviderAuthType;
    githubAppInstallationId?: number | null;
  };
  /**
   * Optional flag to allow creating providers without tokens.
   * This is used internally by the CLI for tokenless distribution tracking.
   * API endpoints should always override this to false for security.
   * @default false
   */
  allowTokenlessProvider?: boolean;
};

export type IAddGitProviderUseCase = IUseCase<
  AddGitProviderCommand,
  GitProvider
>;
