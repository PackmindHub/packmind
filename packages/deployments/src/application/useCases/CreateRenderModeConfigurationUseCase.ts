import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  CreateRenderModeConfigurationCommand,
  IAccountsPort,
  ICreateRenderModeConfigurationUseCase,
  RenderMode,
  RenderModeConfiguration,
} from '@packmind/types';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';

const origin = 'CreateRenderModeConfigurationUseCase';

export class CreateRenderModeConfigurationUseCase
  extends AbstractMemberUseCase<
    CreateRenderModeConfigurationCommand,
    RenderModeConfiguration
  >
  implements ICreateRenderModeConfigurationUseCase
{
  constructor(
    public readonly renderModeConfigurationService: RenderModeConfigurationService,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin, LogLevel.INFO),
  ) {
    super(accountsPort, logger);
    this.logger.info('CreateRenderModeConfigurationUseCase initialized');
  }

  protected async executeForMembers(
    command: CreateRenderModeConfigurationCommand & MemberContext,
  ): Promise<RenderModeConfiguration> {
    const { membership, organization, activeRenderModes, user } = command;
    const isAdmin = membership.role === 'admin';

    const modesToApply = this.selectRenderModes(isAdmin, activeRenderModes);

    this.logger.info('Ensuring render mode configuration', {
      organizationId: organization.id,
      userId: user.id,
      role: membership.role,
      requestedRenderModes: activeRenderModes,
      appliedRenderModes: modesToApply,
    });

    return this.renderModeConfigurationService.createConfiguration(
      organization.id,
      modesToApply,
    );
  }

  private selectRenderModes(
    isAdmin: boolean,
    activeRenderModes: RenderMode[] | undefined,
  ): RenderMode[] | undefined {
    if (!isAdmin) {
      return undefined;
    }

    if (!activeRenderModes || activeRenderModes.length === 0) {
      return undefined;
    }

    return activeRenderModes;
  }
}
