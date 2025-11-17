import { FastifyInstance } from 'fastify';
import { IEventTrackingPort } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';

export interface UserContext {
  email: string;
  userId: string;
  organizationId: string;
  role: string;
}

export interface ToolDependencies {
  fastify: FastifyInstance;
  userContext?: UserContext;
  analyticsAdapter: IEventTrackingPort;
  logger: PackmindLogger;
  mcpToolPrefix: string;
}
