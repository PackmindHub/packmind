import { GitInternalError } from './GitInternalError';

/**
 * The fetch-file-content queue was registered but its factory exposes no
 * delayed job. The queue is built during `initialize()` from our own code, so
 * a missing job is our broken invariant.
 */
export class FetchFileContentDelayedJobMissingError extends GitInternalError {
  constructor() {
    super(
      'fetch_file_content_delayed_job_missing',
      {},
      'DelayedJob not found for FetchFileContent',
    );
    this.name = 'FetchFileContentDelayedJobMissingError';
  }
}
