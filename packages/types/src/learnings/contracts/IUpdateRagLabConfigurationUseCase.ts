import { IUseCase, PackmindCommand } from '../../UseCase';
import { RagLabConfiguration } from '../RagLabConfiguration';

export type UpdateRagLabConfigurationCommand = PackmindCommand & {
  embeddingModel: string;
  embeddingDimensions: number;
  includeCodeBlocks: boolean;
  maxTextLength: number | null;
};

export type IUpdateRagLabConfigurationUseCase = IUseCase<
  UpdateRagLabConfigurationCommand,
  RagLabConfiguration
>;
