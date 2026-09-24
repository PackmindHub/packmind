import { UserOrganizationRole } from '../accounts/User';
import { PublishFailureReason } from '../deployments/PublishFailureReason';

export interface SSEEvent<TData = unknown> {
  type: string;
  data: TData;
  timestamp: string;
}

// Test-only, with no domain meaning.
export interface HelloWorldEvent extends SSEEvent<{ message: string }> {
  type: 'hello_world';
}

export interface DataChangeEvent<
  TPayload = unknown,
> extends SSEEvent<TPayload> {
  type: 'PUT' | 'DELETE' | 'CREATE' | 'UPDATE';
}

export interface NotificationEvent extends SSEEvent<{
  title: string;
  message: string;
  level: 'info' | 'warning' | 'error' | 'success';
}> {
  type: 'NOTIFICATION';
}

// Drives client cache invalidation.
export interface ProgramStatusChangeEvent extends SSEEvent<{
  ruleId: string;
  language: string;
}> {
  type: 'PROGRAM_STATUS_CHANGE';
}

// Drives client cache invalidation.
export interface AssessmentStatusChangeEvent extends SSEEvent<{
  ruleId: string;
  language: string;
}> {
  type: 'ASSESSMENT_STATUS_CHANGE';
}

// Drives client cache invalidation.
export interface DetectionHeuristicsUpdatedEvent extends SSEEvent<{
  ruleId: string;
  language: string;
  detectionHeuristicsId: string;
}> {
  type: 'DETECTION_HEURISTICS_UPDATED';
}

export type UserContextChangeType = 'role_changed' | 'removed' | 'invited';

export interface UserContextChangeEvent extends SSEEvent<{
  userId: string;
  organizationId: string;
  changeType: UserContextChangeType;
  role?: UserOrganizationRole;
}> {
  type: 'USER_CONTEXT_CHANGE';
}

// Drives client cache invalidation.
export interface DistributionStatusChangeEvent extends SSEEvent<{
  distributionId: string;
  status: string;
  organizationId: string;
}> {
  type: 'DISTRIBUTION_STATUS_CHANGE';
}

// Drives client cache invalidation.
export interface ChangeProposalUpdateEvent extends SSEEvent<{
  organizationId: string;
  spaceId: string;
}> {
  type: 'CHANGE_PROPOSAL_UPDATE';
}

/**
 * Something a space content surface shows is different: a standard, command or
 * skill was created, edited or deleted, a package was created, renamed or
 * deleted, or a component joined or left one.
 *
 * Drives client cache invalidation, and carries no more than the two ids needed
 * to route it. A subscriber is not checked for membership of the space it names,
 * so what the event says has to be worth nothing on its own — the reader learns
 * what changed by refetching through an endpoint that does check.
 *
 * One event for all of it rather than one per kind of change. A package holds
 * ids and a row is drawn by resolving each against the space's catalogue, so
 * the two halves are read together and are stale together; splitting them would
 * mean a reader who heard one half and not the other, which is the state this
 * exists to end. It also means a publisher has one thing to remember rather
 * than a choice to get wrong.
 */
export interface SpaceContentChangedEvent extends SSEEvent<{
  organizationId: string;
  spaceId: string;
}> {
  type: 'SPACE_CONTENT_CHANGED';
}

export type MarketplacePublishCompletedStatus =
  | 'success'
  | 'no_changes'
  | 'failure';

// Shown to the user as a notification, not merely a cache-invalidation hint.
export interface MarketplacePublishCompletedEvent extends SSEEvent<{
  marketplaceDistributionId: string;
  marketplaceId: string;
  packageId: string;
  pluginSlug: string;
  packageName: string;
  marketplaceName: string;
  status: MarketplacePublishCompletedStatus;
  prUrl?: string;
  failureReason?: PublishFailureReason;
}> {
  type: 'MARKETPLACE_PUBLISH_COMPLETED';
}

export type AnySSEEvent =
  | HelloWorldEvent
  | DataChangeEvent
  | NotificationEvent
  | ProgramStatusChangeEvent
  | AssessmentStatusChangeEvent
  | DetectionHeuristicsUpdatedEvent
  | UserContextChangeEvent
  | DistributionStatusChangeEvent
  | ChangeProposalUpdateEvent
  | SpaceContentChangedEvent
  | MarketplacePublishCompletedEvent;

export function createHelloWorldEvent(message: string): HelloWorldEvent {
  return {
    type: 'hello_world',
    data: { message },
    timestamp: new Date().toISOString(),
  };
}

export function createProgramStatusChangeEvent(
  ruleId: string,
  language: string,
): ProgramStatusChangeEvent {
  return {
    type: 'PROGRAM_STATUS_CHANGE',
    data: { ruleId, language },
    timestamp: new Date().toISOString(),
  };
}

export function createAssessmentStatusChangeEvent(
  ruleId: string,
  language: string,
): AssessmentStatusChangeEvent {
  return {
    type: 'ASSESSMENT_STATUS_CHANGE',
    data: {
      ruleId,
      language,
    },
    timestamp: new Date().toISOString(),
  };
}

export function createDetectionHeuristicsUpdatedEvent(
  ruleId: string,
  language: string,
  detectionHeuristicsId: string,
): DetectionHeuristicsUpdatedEvent {
  return {
    type: 'DETECTION_HEURISTICS_UPDATED',
    data: {
      ruleId,
      language,
      detectionHeuristicsId,
    },
    timestamp: new Date().toISOString(),
  };
}

export function createUserContextChangeEvent(
  userId: string,
  organizationId: string,
  changeType: UserContextChangeType,
  role?: UserOrganizationRole,
): UserContextChangeEvent {
  return {
    type: 'USER_CONTEXT_CHANGE',
    data: {
      userId,
      organizationId,
      changeType,
      role,
    },
    timestamp: new Date().toISOString(),
  };
}

export function createDistributionStatusChangeEvent(
  distributionId: string,
  status: string,
  organizationId: string,
): DistributionStatusChangeEvent {
  return {
    type: 'DISTRIBUTION_STATUS_CHANGE',
    data: {
      distributionId,
      status,
      organizationId,
    },
    timestamp: new Date().toISOString(),
  };
}

export function createChangeProposalUpdateEvent(
  organizationId: string,
  spaceId: string,
): ChangeProposalUpdateEvent {
  return {
    type: 'CHANGE_PROPOSAL_UPDATE',
    data: {
      organizationId,
      spaceId,
    },
    timestamp: new Date().toISOString(),
  };
}

export function createSpaceContentChangedEvent(
  organizationId: string,
  spaceId: string,
): SpaceContentChangedEvent {
  return {
    type: 'SPACE_CONTENT_CHANGED',
    data: {
      organizationId,
      spaceId,
    },
    timestamp: new Date().toISOString(),
  };
}

export function createMarketplacePublishCompletedEvent(params: {
  marketplaceDistributionId: string;
  marketplaceId: string;
  packageId: string;
  pluginSlug: string;
  packageName: string;
  marketplaceName: string;
  status: MarketplacePublishCompletedStatus;
  prUrl?: string;
  failureReason?: PublishFailureReason;
}): MarketplacePublishCompletedEvent {
  return {
    type: 'MARKETPLACE_PUBLISH_COMPLETED',
    data: params,
    timestamp: new Date().toISOString(),
  };
}
