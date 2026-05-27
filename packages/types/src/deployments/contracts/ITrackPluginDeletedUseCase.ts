import { IUseCase, PackmindCommand } from '../../UseCase';

export type TrackPluginDeletedCommand = PackmindCommand & {
  /** Opaque package slug, e.g. `security` or `@space/security`. */
  packageSlug: string;
  /** Git remote URL of the delete target; empty/undefined when the CLI is not in a git repo. */
  gitRemoteUrl?: string;
};

export type TrackPluginDeletedResponse = {
  tracked: boolean;
};

export type ITrackPluginDeletedUseCase = IUseCase<
  TrackPluginDeletedCommand,
  TrackPluginDeletedResponse
>;
