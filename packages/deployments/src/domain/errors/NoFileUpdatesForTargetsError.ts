/**
 * Raised when a repository is about to be published or cleaned up without a
 * single target having produced file updates, which would commit nothing while
 * reporting a deployment.
 */
export class NoFileUpdatesForTargetsError extends Error {
  constructor(public readonly repositoryId: string) {
    super(
      `No file updates found for any target of repository "${repositoryId}"`,
    );
    this.name = 'NoFileUpdatesForTargetsError';
  }
}
