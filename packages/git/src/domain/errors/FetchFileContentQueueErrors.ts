import { GitInternalError } from './GitInternalError';

/**
 * The lifecycle guards on the fetch-file-content queue handle. Both name a
 * step of our own wiring that ran out of order — the queue is built and
 * initialized by the module that owns it, never by a request — so neither is
 * anything a caller can provoke or correct.
 */

export class FetchFileContentQueueNotInitializedError extends GitInternalError {
  constructor() {
    super(
      'fetch_file_content_queue_not_initialized',
      {},
      'Queue not initialized. Call initialize() first.',
    );
    this.name = 'FetchFileContentQueueNotInitializedError';
  }
}

export class FetchFileContentDelayedJobNotCreatedError extends GitInternalError {
  constructor() {
    super(
      'fetch_file_content_delayed_job_not_created',
      {},
      'DelayedJob not created. Call createQueue() first.',
    );
    this.name = 'FetchFileContentDelayedJobNotCreatedError';
  }
}
