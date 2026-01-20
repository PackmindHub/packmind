import { UserOrganizationRole } from '../accounts/User';

// Base SSE Event structure
export interface SSEEvent<TData = unknown> {
  type: string;
  data: TData;
  timestamp: string;
}

// Specific event types that can be sent through SSE
export type SSEEventType =
  | 'hello_world'
  | 'PUT'
  | 'DELETE'
  | 'CREATE'
  | 'UPDATE'
  | 'NOTIFICATION'
  | 'PROGRAM_STATUS_CHANGE'
  | 'ASSESSMENT_STATUS_CHANGE'
  | 'DETECTION_HEURISTICS_UPDATED'
  | 'USER_CONTEXT_CHANGE'
  | 'DISTRIBUTION_STATUS_CHANGE';

// Hello World event for testing
export interface HelloWorldEvent extends SSEEvent<{ message: string }> {
  type: 'hello_world';
}

// Generic data change events
export interface DataChangeEvent<
  TPayload = unknown,
> extends SSEEvent<TPayload> {
  type: 'PUT' | 'DELETE' | 'CREATE' | 'UPDATE';
}

// Notification event
export interface NotificationEvent extends SSEEvent<{
  title: string;
  message: string;
  level: 'info' | 'warning' | 'error' | 'success';
}> {
  type: 'NOTIFICATION';
}

// Program status change event for cache invalidation
export interface ProgramStatusChangeEvent extends SSEEvent<{
  ruleId: string;
  language: string;
}> {
  type: 'PROGRAM_STATUS_CHANGE';
}

// Assessment status change event for cache invalidation
export interface AssessmentStatusChangeEvent extends SSEEvent<{
  ruleId: string;
  language: string;
}> {
  type: 'ASSESSMENT_STATUS_CHANGE';
}

// Detection heuristics updated event for cache invalidation
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

// Distribution status change event for cache invalidation
export interface DistributionStatusChangeEvent extends SSEEvent<{
  distributionId: string;
  status: string;
  organizationId: string;
}> {
  type: 'DISTRIBUTION_STATUS_CHANGE';
}

// Union type of all possible SSE events
export type AnySSEEvent =
  | HelloWorldEvent
  | DataChangeEvent
  | NotificationEvent
  | ProgramStatusChangeEvent
  | AssessmentStatusChangeEvent
  | DetectionHeuristicsUpdatedEvent
  | UserContextChangeEvent
  | DistributionStatusChangeEvent;

// Event creation helpers
export function createHelloWorldEvent(message: string): HelloWorldEvent {
  return {
    type: 'hello_world',
    data: { message },
    timestamp: new Date().toISOString(),
  };
}

export function createDataChangeEvent<TPayload>(
  type: 'PUT' | 'DELETE' | 'CREATE' | 'UPDATE',
  data: TPayload,
): DataChangeEvent<TPayload> {
  return {
    type,
    data,
    timestamp: new Date().toISOString(),
  };
}

export function createNotificationEvent(
  title: string,
  message: string,
  level: 'info' | 'warning' | 'error' | 'success' = 'info',
): NotificationEvent {
  return {
    type: 'NOTIFICATION',
    data: { title, message, level },
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
