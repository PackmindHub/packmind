import { OrganizationProvider, UserProvider } from '@packmind/types';
import {
  AbstractMemberUseCase,
  GetRenderModeConfigurationCommand,
  GetRenderModeConfigurationResult,
  MemberContext,
} from '@packmind/shared';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';

const origin = 'GetRenderModeConfigurationUseCase';

export class GetRenderModeConfigurationUseCase extends AbstractMemberUseCase<
  GetRenderModeConfigurationCommand,
  GetRenderModeConfigurationResult
> {
  constructor(
    private readonly renderModeConfigurationService: RenderModeConfigurationService,
    userProvider: UserProvider,
    organizationProvider: OrganizationProvider,
    logger: PackmindLogger = new PackmindLogger(origin, LogLevel.INFO),
  ) {
    super(userProvider, organizationProvider, logger);
    this.logger.info('GetRenderModeConfigurationUseCase initialized');
  }

  protected async executeForMembers(
    command: GetRenderModeConfigurationCommand & MemberContext,
  ): Promise<GetRenderModeConfigurationResult> {
    this.logger.info('Retrieving render mode configuration', {
      organizationId: command.organizationId,
      userId: command.userId,
    });

    try {
      const configuration =
        await this.renderModeConfigurationService.getConfiguration(
          command.organization.id,
        );

      if (!configuration) {
        this.logger.info('Render mode configuration not found', {
          organizationId: command.organizationId,
        });

        return { configuration: null };
      }

      this.logger.info('Render mode configuration retrieved successfully', {
        organizationId: command.organizationId,
        activeRenderModes: configuration.activeRenderModes,
      });

      return { configuration };
    } catch (error) {
      this.logger.error('Failed to retrieve render mode configuration', {
        organizationId: command.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
