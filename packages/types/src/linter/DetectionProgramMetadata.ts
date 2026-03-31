import { TokensUsed } from '../ai/prompts/types';
import { DetectionProgramId } from './DetectionProgram';

export type DetectionProgramMetadata = {
  id: string;
  detectionProgramId: DetectionProgramId;
  taskId: string;
  tokens: TokensUsed | null;
  logs: ExecutionLog[] | null;
  programDescription: string;
};

export type ExecutionLog = {
  timestamp: number;
  message: string;
  metadata?: ExecutionLogMetadata;
};

export type ExecutionLogMetadata = Record<string, string>;

export const DETECTION_LOG_MESSAGES = {
  AI_AGENT_STRATEGY_ASSESSMENT: 'AI_AGENT_STRATEGY_ASSESSMENT',
  AI_AGENT_RESULT_NOT_GOOD_WILL_RESTART:
    'AI_AGENT_RESULT_NOT_GOOD_WILL_RESTART',
  AI_AGENT_RESULT_SUCCESS: 'AI_AGENT_RESULT_SUCCESS',
  AI_AGENT_CRASH_RESTART: 'AI_AGENT_CRASH_RESTART',

  AI_AGENT_PROGRAM_GENERATION_STARTED: 'AI_AGENT_PROGRAM_GENERATION_STARTED',
  AI_AGENT_NEW_PROGRAM_UNDER_TEST: 'AI_AGENT_NEW_PROGRAM_UNDER_TEST',
  AI_AGENT_PROGRAM_DEBUGGING: 'AI_AGENT_PROGRAM_DEBUGGING',
  AI_AGENT_PROGRAM_SUCCESSFUL: 'AI_AGENT_PROGRAM_SUCCESSFUL',
  AI_AGENT_PROGRAM_TEST_AGAINST_EXAMPLES:
    'AI_AGENT_PROGRAM_TEST_AGAINST_EXAMPLES',
  AI_AGENT_PROGRAM_CHECK_POSITIVE_EXAMPLES:
    'AI_AGENT_PROGRAM_CHECK_POSITIVE_EXAMPLES',

  AI_AGENT_RUN_TEST: 'AI_AGENT_RUN_TEST',
  AI_AGENT_RUN_TEST_NO_NAME: 'AI_AGENT_RUN_TEST_NO_NAME',

  AI_AGENT_TIMEOUT: 'AI_AGENT_TIMEOUT',
} as const;

export type DetectionLogMessageType =
  (typeof DETECTION_LOG_MESSAGES)[keyof typeof DETECTION_LOG_MESSAGES];
