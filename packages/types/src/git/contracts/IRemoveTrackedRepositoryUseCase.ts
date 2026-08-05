import { PackmindCommand, IUseCase } from '../../UseCase';
import { GitRepo } from '../GitRepo';

export type RemoveTrackedRepositoryCommand = PackmindCommand & {
  owner: string;
  repo: string;
};

/**
 * Removal has two non-error outcomes, which the CLI reports differently:
 * something was tracked and is not any more, or nothing was tracked and the
 * call was a no-op. A repository Packmind has never seen is neither — it throws
 * `RepositoryNotTrackableError`.
 *
 * `organizationName` travels with the no-op case because the CLI cannot name
 * the organization itself: `IAuthContext` in `PackmindHttpClient` holds only an
 * organization id.
 */
export type RemoveTrackedRepositoryResponse =
  | { status: 'removed'; gitRepo: GitRepo }
  | { status: 'not-tracked'; organizationName: string };

export type IRemoveTrackedRepositoryUseCase = IUseCase<
  RemoveTrackedRepositoryCommand,
  RemoveTrackedRepositoryResponse
>;
