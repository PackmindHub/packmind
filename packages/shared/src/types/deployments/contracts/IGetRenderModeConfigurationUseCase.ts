import { IUseCase, PackmindCommand } from '../../UseCase';
import { RenderModeConfiguration } from '../RenderModeConfiguration';

export type GetRenderModeConfigurationCommand = PackmindCommand;

export type GetRenderModeConfigurationResult = {
  configuration: RenderModeConfiguration | null;
};

export type IGetRenderModeConfigurationUseCase = IUseCase<
  GetRenderModeConfigurationCommand,
  GetRenderModeConfigurationResult
>;
