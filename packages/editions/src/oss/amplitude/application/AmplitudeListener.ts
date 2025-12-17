import { PackmindLogger } from '@packmind/logger';
import { PackmindListener } from '@packmind/node-utils';
import {
  IEventTrackingPort,
  TrialStartedEvent,
  TrialAccountActivatedEvent,
} from '@packmind/types';

const origin = 'AmplitudeListener';

/**
 * Listener for tracking trial-related events to Amplitude.
 * Subscribes to trial domain events and forwards them to the event tracking port.
 */
export class AmplitudeListener extends PackmindListener<IEventTrackingPort> {
  private readonly logger: PackmindLogger;

  constructor(adapter: IEventTrackingPort) {
    super(adapter);
    this.logger = new PackmindLogger(origin);
  }

  protected registerHandlers(): void {
    this.subscribe(TrialStartedEvent, this.handleTrialStarted);
    this.subscribe(
      TrialAccountActivatedEvent,
      this.handleTrialAccountActivated,
    );
  }

  private handleTrialStarted = async (
    event: TrialStartedEvent,
  ): Promise<void> => {
    const { userId, organizationId, agent, startedAt } = event.payload;
    this.logger.info('Handling TrialStartedEvent', { userId, agent });

    try {
      await this.adapter.trackEvent(userId, organizationId, 'trial_started', {
        agent,
        startedAt: startedAt.toISOString(),
      });
      this.logger.info('Trial started event tracked successfully', {
        userId,
        agent,
      });
    } catch (error) {
      this.logger.error('Failed to track trial started event', {
        userId,
        agent,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't re-throw - we don't want to fail the use case if tracking fails
    }
  };

  private handleTrialAccountActivated = async (
    event: TrialAccountActivatedEvent,
  ): Promise<void> => {
    const { userId, organizationId } = event.payload;
    this.logger.info('Handling TrialAccountActivatedEvent', { userId });

    try {
      await this.adapter.trackEvent(
        userId,
        organizationId,
        'trial_account_activated',
        {},
      );
      this.logger.info('Trial account activated event tracked successfully', {
        userId,
      });
    } catch (error) {
      this.logger.error('Failed to track trial account activated event', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't re-throw - we don't want to fail the use case if tracking fails
    }
  };
}
