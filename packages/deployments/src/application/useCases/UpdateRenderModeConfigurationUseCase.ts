import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AbstractAdminUseCase, AdminContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  IUpdateRenderModeConfigurationUseCase,
  RenderMode,
  RenderModeConfiguration,
  UpdateRenderModeConfigurationCommand,
} from '@packmind/types';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';

const origin = 'UpdateRenderModeConfigurationUseCase';

const allowedRenderModes = new Set(Object.values(RenderMode));

export class UpdateRenderModeConfigurationUseCase
  extends AbstractAdminUseCase<
    UpdateRenderModeConfigurationCommand,
    RenderModeConfiguration
  >
  implements IUpdateRenderModeConfigurationUseCase
{
  constructor(
    private readonly renderModeConfigurationService: RenderModeConfigurationService,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin, LogLevel.INFO),
  ) {
    super(accountsPort, logger);
    this.logger.info('UpdateRenderModeConfigurationUseCase initialized');
  }

  protected async executeForAdmins(
    command: UpdateRenderModeConfigurationCommand & AdminContext,
  ) {
    this.logger.info('Updating render mode configuration (admin)', {
      organizationId: command.organizationId,
      userId: command.userId,
      requestedRenderModes: command.activeRenderModes,
    });

    this.ensureValidRenderModes(command.activeRenderModes);

    try {
      const existingConfiguration =
        await this.renderModeConfigurationService.getConfiguration(
          command.organization.id,
        );

      const configuration = existingConfiguration
        ? await this.renderModeConfigurationService.updateConfiguration(
            command.organization.id,
            command.activeRenderModes,
          )
        : await this.renderModeConfigurationService.createConfiguration(
            command.organization.id,
            command.activeRenderModes,
          );

      this.logger.info('Render mode configuration updated successfully', {
        organizationId: command.organizationId,
        activeRenderModes: configuration.activeRenderModes,
      });

      return configuration;
    } catch (error) {
      this.logger.error('Failed to update render mode configuration', {
        organizationId: command.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private ensureValidRenderModes(renderModes: RenderMode[]): void {
    if (renderModes.length === 0) {
      return;
    }

    for (const mode of renderModes) {
      if (!allowedRenderModes.has(mode)) {
        throw new Error(`Invalid render mode provided: ${mode}`);
      }
    }
  }
}
