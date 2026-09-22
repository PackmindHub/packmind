import { GitError } from './GitError';

/** CLI-managed: created automatically by `packmind`, not configurable from the UI. */
export class GitProviderDisplayNameNotEditableError extends GitError {
  constructor(public readonly gitProviderId: string) {
    super(
      'forbidden',
      'git_provider_display_name_not_editable',
      { gitProviderId },
      'Display name is not editable on a CLI-managed git provider',
    );
    this.name = 'GitProviderDisplayNameNotEditableError';
  }
}
