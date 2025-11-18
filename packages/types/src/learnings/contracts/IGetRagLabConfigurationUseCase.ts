import { IUseCase, PackmindCommand } from '../../UseCase';
import { RagLabConfiguration } from '../RagLabConfiguration';

export type GetRagLabConfigurationCommand = PackmindCommand;

export type GetRagLabConfigurationResult = {
  configuration: RagLabConfiguration;
};

export type IGetRagLabConfigurationUseCase = IUseCase<
  GetRagLabConfigurationCommand,
  GetRagLabConfigurationResult
>;
