import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  createUserId,
  IDeploymentPort,
  ISpacesPort,
  IStartTrial,
  RenderMode,
  StartTrialCommand,
  StartTrialResult,
  UserSignedUpEvent,
  TrialStartedEvent,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { OrganizationService } from '../../services/OrganizationService';
import { UserService } from '../../services/UserService';

const origin = 'StartTrialUseCase';

export class StartTrialUseCase implements IStartTrial {
  constructor(
    private readonly userService: UserService,
    private readonly organizationService: OrganizationService,
    private readonly eventEmitterService: PackmindEventEmitterService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
    private readonly spacesPort?: ISpacesPort,
    private readonly deploymentPort?: IDeploymentPort,
  ) {
    this.logger.info('StartTrialUseCase initialized');
  }

  async execute(command: StartTrialCommand): Promise<StartTrialResult> {
    this.logger.info('Starting trial user creation', { agent: command.agent });

    try {
      // Generate unique identifiers for trial user
      const trialId = uuidv4();
      const email = `trial-${trialId}@packmind.trial`;
      const password = uuidv4();
      const organizationName = `trial-${trialId}`;

      // Create organization
      this.logger.info('Creating trial organization', { organizationName });
      const organization =
        await this.organizationService.createOrganization(organizationName);

      // Create default "Global" space for the organization
      if (this.spacesPort) {
        this.logger.info(
          'Creating default Global space for trial organization',
          {
            organizationId: organization.id,
          },
        );
        try {
          await this.spacesPort.createSpace('Global', organization.id);
        } catch (error) {
          this.logger.error('Failed to create default Global space for trial', {
            organizationId: organization.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Create trial user
      this.logger.info('Creating trial user', { email });
      const user = await this.userService.createUser(
        email,
        password,
        organization.id,
        { trial: true },
      );

      // Emit sign-up event
      this.eventEmitterService.emit(
        new UserSignedUpEvent({
          userId: createUserId(user.id),
          organizationId: organization.id,
          email,
        }),
      );

      // Emit trial started event
      this.eventEmitterService.emit(
        new TrialStartedEvent({
          userId: createUserId(user.id),
          organizationId: organization.id,
          agent: command.agent,
          startedAt: new Date(),
        }),
      );

      // Create render mode configuration based on the agent that started the trial
      if (this.deploymentPort) {
        const renderModes = this.mapAgentToRenderModes(command.agent);
        this.logger.info(
          'Creating render mode configuration for trial organization',
          {
            organizationId: organization.id,
            agent: command.agent,
            renderModes,
          },
        );
        try {
          await this.deploymentPort.createRenderModeConfiguration({
            userId: createUserId(user.id),
            organizationId: organization.id,
            activeRenderModes: renderModes,
          });
        } catch (error) {
          this.logger.error(
            'Failed to create render mode configuration for trial',
            {
              organizationId: organization.id,
              error: error instanceof Error ? error.message : String(error),
            },
          );
        }
      }

      this.logger.info('Trial user created successfully', {
        userId: user.id,
        organizationId: organization.id,
      });

      return { user, organization, role: 'admin' };
    } catch (error) {
      this.logger.error('Failed to create trial user', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private mapAgentToRenderModes(
    agent: StartTrialCommand['agent'],
  ): RenderMode[] {
    switch (agent) {
      case 'vs-code':
        return [RenderMode.GH_COPILOT];
      case 'cursor':
        return [RenderMode.CURSOR];
      case 'claude':
        return [RenderMode.CLAUDE];
      default:
        return [];
    }
  }
}
