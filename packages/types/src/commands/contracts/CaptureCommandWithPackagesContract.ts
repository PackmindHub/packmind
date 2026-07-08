import { IUseCase, PackmindCommand } from '../../UseCase';
import { Command } from '../Command';
import { CommandStep } from './CaptureCommandUseCase';
import { SpaceId } from '../../spaces';

export type CaptureCommandWithPackagesCommand = PackmindCommand & {
  name: string;
  spaceId: SpaceId;
  summary?: string;
  whenToUse?: string[];
  contextValidationCheckpoints?: string[];
  steps?: CommandStep[];
  packageSlugs?: string[];
};

export type CaptureCommandWithPackagesResponse = {
  recipe: Command;
};

export type ICaptureCommandWithPackagesUseCase = IUseCase<
  CaptureCommandWithPackagesCommand,
  CaptureCommandWithPackagesResponse
>;
