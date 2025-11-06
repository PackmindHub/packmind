import { IUseCase, PackmindCommand } from '@packmind/types';
import { RenderMode } from '../RenderMode';
import { RenderModeConfiguration } from '../RenderModeConfiguration';

export type CreateRenderModeConfigurationCommand = PackmindCommand & {
  activeRenderModes?: RenderMode[];
};

export type ICreateRenderModeConfigurationUseCase = IUseCase<
  CreateRenderModeConfigurationCommand,
  RenderModeConfiguration
>;
