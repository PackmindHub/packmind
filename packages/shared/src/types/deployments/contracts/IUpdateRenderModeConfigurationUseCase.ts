import { IUseCase, PackmindCommand } from '@packmind/types';
import { RenderMode } from '../RenderMode';
import { RenderModeConfiguration } from '../RenderModeConfiguration';

export type UpdateRenderModeConfigurationCommand = PackmindCommand & {
  activeRenderModes: RenderMode[];
};

export type IUpdateRenderModeConfigurationUseCase = IUseCase<
  UpdateRenderModeConfigurationCommand,
  RenderModeConfiguration
>;
