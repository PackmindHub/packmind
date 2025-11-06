import { TokensUsed } from '../ai/prompts/types';
import { DetectionProgramId } from './DetectionProgram';

export type DetectionProgramMetadata = {
  id: string;
  detectionProgramId: DetectionProgramId;
  taskId: string;
  tokens: TokensUsed | null;
  logs: ExecutionLog[] | null;
  programDescription: string;
  detectionHeuristics: string;
};

export type ExecutionLog = {
  timestamp: number;
  message: string;
  metadata?: ExecutionLogMetadata;
};

export type ExecutionLogMetadata = Record<string, string>;
