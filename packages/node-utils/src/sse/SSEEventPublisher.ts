import { RedisSSEClient } from './RedisSSEClient';
import {
  createSSEEventMessage,
  SSE_REDIS_CHANNELS,
  serializeSSERedisMessage,
} from './types';
import { PackmindLogger } from '@packmind/logger';
import {
  AnySSEEvent,
  createProgramStatusChangeEvent,
  createAssessmentStatusChangeEvent,
  createDetectionHeuristicsUpdatedEvent,
  createUserContextChangeEvent,
  createDistributionStatusChangeEvent,
  createChangeProposalUpdateEvent,
  type UserContextChangeType,
} from '@packmind/types';
import { UserOrganizationRole } from '@packmind/types';

const origin = 'SSEEventPublisher';

/**
 * Publishes SSE events onto Redis pub/sub rather than straight to a connection:
 * the subscriber may be attached to a different API instance than the one
 * handling the write.
 */
export class SSEEventPublisher {
  private static instance: SSEEventPublisher;
  private static redisClient: RedisSSEClient;

  static getInstance(): SSEEventPublisher {
    if (!SSEEventPublisher.instance) {
      SSEEventPublisher.instance = new SSEEventPublisher();
      SSEEventPublisher.getInstance().logger.info(
        'Creating new SSEEventPublisher instance',
      );
      SSEEventPublisher.redisClient = RedisSSEClient.getInstance();
    }
    return SSEEventPublisher.instance;
  }

  private constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  /** Makes the frontend's React Query cache refetch the program. */
  static async publishProgramStatusEvent(
    programId: string,
    ruleId: string,
    language: string,
    userId?: string,
    organizationId?: string,
  ): Promise<void> {
    SSEEventPublisher.getInstance().logger.info(
      'Publishing program status change event',
      {
        programId,
        ruleId,
        language,
        userId,
        organizationId,
      },
    );

    try {
      const event = createProgramStatusChangeEvent(ruleId, language);

      await SSEEventPublisher.publishEvent(
        'program_status_change',
        [ruleId, language],
        event,
        userId ? [userId] : undefined,
      );

      SSEEventPublisher.getInstance().logger.debug(
        'Successfully published program status change event',
        { programId, ruleId, language },
      );
    } catch (error) {
      SSEEventPublisher.getInstance().logger.error(
        'Failed to publish program status change event',
        {
          programId,
          userId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  /** Makes the frontend's React Query cache refetch the assessment. */
  static async publishAssessmentStatusEvent(
    ruleId: string,
    language: string,
    userId?: string,
    organizationId?: string,
  ): Promise<void> {
    SSEEventPublisher.getInstance().logger.info(
      'Publishing assessment status change event',
      {
        ruleId,
        language,
        userId,
        organizationId,
      },
    );

    try {
      const event = createAssessmentStatusChangeEvent(ruleId, language);

      await SSEEventPublisher.publishEvent(
        'assessment_status_change',
        [ruleId, language],
        event,
        userId ? [userId] : undefined,
      );

      SSEEventPublisher.getInstance().logger.debug(
        'Successfully published assessment status change event',
        { ruleId, language },
      );
    } catch (error) {
      SSEEventPublisher.getInstance().logger.error(
        'Failed to publish assessment status change event',
        {
          userId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  /** Makes the frontend's React Query cache refetch the heuristics. */
  static async publishDetectionHeuristicsUpdatedEvent(
    ruleId: string,
    language: string,
    detectionHeuristicsId: string,
    userId?: string,
    organizationId?: string,
  ): Promise<void> {
    SSEEventPublisher.getInstance().logger.info(
      'Publishing detection heuristics updated event',
      {
        ruleId,
        language,
        detectionHeuristicsId,
        userId,
        organizationId,
      },
    );

    try {
      const event = createDetectionHeuristicsUpdatedEvent(
        ruleId,
        language,
        detectionHeuristicsId,
      );

      await SSEEventPublisher.publishEvent(
        'detection_heuristics_updated',
        [ruleId, language, detectionHeuristicsId],
        event,
        userId ? [userId] : undefined,
      );

      SSEEventPublisher.getInstance().logger.debug(
        'Successfully published detection heuristics updated event',
        { ruleId, language, detectionHeuristicsId },
      );
    } catch (error) {
      SSEEventPublisher.getInstance().logger.error(
        'Failed to publish detection heuristics updated event',
        {
          ruleId,
          language,
          detectionHeuristicsId,
          userId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  /**
   * Signals a change to the user's own role or membership, which the frontend
   * answers by refetching /me.
   */
  static async publishUserContextChangeEvent(
    userId: string,
    organizationId: string,
    changeType: UserContextChangeType,
    role?: UserOrganizationRole,
  ): Promise<void> {
    SSEEventPublisher.getInstance().logger.info(
      'Publishing user context change event',
      {
        userId,
        organizationId,
        changeType,
        role,
      },
    );

    try {
      const event = createUserContextChangeEvent(
        userId,
        organizationId,
        changeType,
        role,
      );

      await SSEEventPublisher.publishEvent('user_context_change', [], event, [
        userId,
      ]);

      SSEEventPublisher.getInstance().logger.debug(
        'Successfully published user context change event',
        {
          userId,
          organizationId,
          changeType,
        },
      );
    } catch (error) {
      SSEEventPublisher.getInstance().logger.error(
        'Failed to publish user context change event',
        {
          userId,
          organizationId,
          changeType,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  /**
   * Makes the frontend's React Query cache refetch the distribution. Scoped to
   * the organization rather than one user, so every viewer sees the new status.
   */
  static async publishDistributionStatusChangeEvent(
    distributionId: string,
    status: string,
    organizationId: string,
  ): Promise<void> {
    SSEEventPublisher.getInstance().logger.info(
      'Publishing distribution status change event',
      {
        distributionId,
        status,
        organizationId,
      },
    );

    try {
      const event = createDistributionStatusChangeEvent(
        distributionId,
        status,
        organizationId,
      );

      await SSEEventPublisher.publishEvent(
        'DISTRIBUTION_STATUS_CHANGE',
        [organizationId],
        event,
      );

      SSEEventPublisher.getInstance().logger.debug(
        'Successfully published distribution status change event',
        {
          distributionId,
          status,
          organizationId,
        },
      );
    } catch (error) {
      SSEEventPublisher.getInstance().logger.error(
        'Failed to publish distribution status change event',
        {
          distributionId,
          status,
          organizationId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  /**
   * Makes the frontend's React Query cache refetch change proposals. Scoped to
   * the space rather than one user, so every viewer sees the change.
   */
  static async publishChangeProposalUpdateEvent(
    organizationId: string,
    spaceId: string,
  ): Promise<void> {
    SSEEventPublisher.getInstance().logger.info(
      'Publishing change proposal update event',
      {
        organizationId,
        spaceId,
      },
    );

    try {
      const event = createChangeProposalUpdateEvent(organizationId, spaceId);

      await SSEEventPublisher.publishEvent(
        'CHANGE_PROPOSAL_UPDATE',
        [spaceId],
        event,
      );

      SSEEventPublisher.getInstance().logger.debug(
        'Successfully published change proposal update event',
        {
          organizationId,
          spaceId,
        },
      );
    } catch (error) {
      SSEEventPublisher.getInstance().logger.error(
        'Failed to publish change proposal update event',
        {
          organizationId,
          spaceId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  static async publishEvent(
    eventType: string,
    params: string[],
    data: AnySSEEvent,
    targetUserIds?: string[],
  ): Promise<void> {
    SSEEventPublisher.getInstance().logger.info('Publishing SSE event', {
      eventType,
      params,
      targetUserIds: targetUserIds?.length || 'all',
    });

    try {
      // Only called for its side effect: it is what assigns redisClient.
      SSEEventPublisher.getInstance();
      const redisClient = SSEEventPublisher.redisClient;

      const message = createSSEEventMessage(
        eventType,
        params,
        data,
        targetUserIds,
      );

      const serializedMessage = serializeSSERedisMessage(message);
      await redisClient.publish(SSE_REDIS_CHANNELS.EVENTS, serializedMessage);

      SSEEventPublisher.getInstance().logger.debug(
        'Successfully published SSE event',
        {
          eventType,
          params,
        },
      );
    } catch (error) {
      SSEEventPublisher.getInstance().logger.error(
        'Failed to publish SSE event',
        {
          eventType,
          params,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
