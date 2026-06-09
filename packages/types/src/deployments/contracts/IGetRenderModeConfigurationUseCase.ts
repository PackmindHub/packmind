import { IUseCase, PackmindCommand } from '../../UseCase';
import { RenderModeConfiguration } from '../RenderModeConfiguration';

export type GetRenderModeConfigurationCommand = PackmindCommand;

export type GetRenderModeConfigurationResponse = {
  configuration: RenderModeConfiguration | null;
};

export type IGetRenderModeConfigurationUseCase = IUseCase<
  GetRenderModeConfigurationCommand,
  GetRenderModeConfigurationResponse
>;
