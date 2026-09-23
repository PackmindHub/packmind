import { DeploymentsInternalError } from './DeploymentsInternalError';

/**
 * The adapter was constructed without the ports its use cases need.
 *
 * A wiring invariant: it fires at composition time, not on any caller's
 * request, and no request could avoid it.
 */
export class AdapterPortsMissingError extends DeploymentsInternalError {
  constructor() {
    super(
      'adapter_ports_missing',
      {},
      'DeploymentsAdapter: Required ports not provided',
    );
    this.name = 'AdapterPortsMissingError';
  }
}

/**
 * The queue accepted the enqueue call and handed back no job.
 *
 * Ours rather than the caller's: the publish was legitimate, and a queue that
 * answers without a job is a broken invariant of the queue, not a decision
 * the caller can revise.
 */
export class DelayedJobNotCreatedError extends DeploymentsInternalError {
  constructor() {
    super(
      'delayed_job_not_created',
      {},
      'DeploymentsAdapter: Failed to create delayed job for publish artifacts',
    );
    this.name = 'DelayedJobNotCreatedError';
  }
}
