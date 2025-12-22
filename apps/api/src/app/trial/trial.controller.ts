import {
  Controller,
  Get,
  Query,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Public } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import {
  IAccountsPort,
  StartTrialCommand,
  StartTrialResult,
} from '@packmind/types';
import { InjectAccountsAdapter } from '../shared/HexaInjection';
import { McpService } from '../organizations/mcp/mcp.service';

const origin = 'TrialController';

@Controller()
export class TrialController {
  constructor(
    @InjectAccountsAdapter() private readonly accountsAdapter: IAccountsPort,
    private readonly mcpService: McpService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('TrialController initialized');
  }

  @Public()
  @Get()
  async startTrial(@Query('agent') agent: string): Promise<StartTrialResult> {
    this.logger.info('GET /start-trial - Starting trial', { agent });

    if (agent !== 'vs-code' && agent !== 'cursor' && agent !== 'claude') {
      throw new BadRequestException(
        'Invalid agent parameter. Supported values: vs-code, cursor, claude',
      );
    }

    try {
      const command: StartTrialCommand = { agent };
      const { user, organization, role } =
        await this.accountsAdapter.startTrial(command);

      const tokenResponse = this.mcpService.generateTokenForUser(
        user,
        organization,
        role,
      );

      this.logger.info('Trial started successfully', { agent });

      return {
        user,
        organization,
        role,
        mcpToken: tokenResponse.access_token,
      };
    } catch (error) {
      this.logger.error('Failed to start trial', {
        agent,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new InternalServerErrorException('Failed to start trial');
    }
  }
}
