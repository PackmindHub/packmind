import { CommandsInternalError } from './CommandsInternalError';

/**
 * The lifecycle guards on the deploy-commands queue handle. Both name a step
 * of our own wiring that ran out of order — the queue is built and
 * initialized by the adapter that owns it, never by a request — so neither is
 * anything a caller can provoke or correct.
 */

export class DeployCommandsQueueNotInitializedError extends CommandsInternalError {
  constructor() {
    super(
      'deploy_commands_queue_not_initialized',
      {},
      'Queue not initialized. Call initialize() first.',
    );
    this.name = 'DeployCommandsQueueNotInitializedError';
  }
}

export class DeployCommandsDelayedJobNotCreatedError extends CommandsInternalError {
  constructor() {
    super(
      'deploy_commands_delayed_job_not_created',
      {},
      'DelayedJob not created. Call createQueue() first.',
    );
    this.name = 'DeployCommandsDelayedJobNotCreatedError';
  }
}
