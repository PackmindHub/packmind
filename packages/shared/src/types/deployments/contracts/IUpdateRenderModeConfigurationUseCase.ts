import { IUseCase, PackmindCommand } from '../../UseCase';
import { RenderMode } from '../RenderMode';
import { RenderModeConfiguration } from '../RenderModeConfiguration';

export type UpdateRenderModeConfigurationCommand = PackmindCommand & {
  activeRenderModes: RenderMode[];
};

export type IUpdateRenderModeConfigurationUseCase = IUseCase<
  UpdateRenderModeConfigurationCommand,
  RenderModeConfiguration
>;
