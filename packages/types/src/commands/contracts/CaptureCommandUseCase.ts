import { IUseCase, PackmindCommand } from '../../UseCase';
import { Command } from '../Command';
import { SpaceId } from '../../spaces';

export type CommandStep = {
  name: string;
  description: string;
  codeSnippet?: string;
};

export type CaptureCommandCommand = PackmindCommand & {
  name: string;
  spaceId: SpaceId; // Required space ID for space-specific recipes
  slug?: string; // Optional user-provided slug; if not provided, auto-generated from name
  // New structured format (preferred)
  summary?: string;
  whenToUse?: string[];
  contextValidationCheckpoints?: string[];
  steps?: CommandStep[];
  // Legacy format (deprecated, for backward compatibility)
  content?: string;
  directUpdate?: boolean;
};

export type CaptureCommandResponse = Command;

export type ICaptureCommandUseCase = IUseCase<
  CaptureCommandCommand,
  CaptureCommandResponse
>;
