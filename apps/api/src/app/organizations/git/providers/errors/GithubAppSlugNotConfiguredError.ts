import { ApiInternalError } from '../../../../errors/ApiInternalError';

/**
 * GITHUB_APP_SLUG is missing although 'shared' mode is only entered when it is
 * present: a broken invariant (config race), never a caller fault.
 */
export class GithubAppSlugNotConfiguredError extends ApiInternalError {
  constructor() {
    super(
      'github_app_slug_not_configured',
      {},
      'GITHUB_APP_SLUG is not configured',
    );
    this.name = 'GithubAppSlugNotConfiguredError';
  }
}
