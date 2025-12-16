import {
  Controller,
  Get,
  Query,
  Res,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Response } from 'express';
import { Public } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import { IAccountsPort, StartTrialCommand } from '@packmind/types';
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
  async startTrial(
    @Query('agent') agent: string,
    @Res() response: Response,
  ): Promise<void> {
    this.logger.info('GET /start-trial - Starting trial', { agent });

    if (agent !== 'vs-code') {
      throw new BadRequestException(
        'Invalid agent parameter. Supported values: vs-code',
      );
    }

    try {
      const command: StartTrialCommand = { agent };
      const { user, organization, role } =
        await this.accountsAdapter.startTrial(command);

      // Generate MCP token using the shared McpService
      const tokenResponse = this.mcpService.generateTokenForUser(
        user,
        organization,
        role,
      );

      // Build VS Code MCP setup URL
      const mcpUrl = await this.mcpService.getMcpUrl();
      const mcpSetupUrl = this.mcpService.buildVsCodeMcpUrl(
        tokenResponse.access_token,
        mcpUrl,
      );

      this.logger.info('Trial started successfully, redirecting to MCP setup');

      response.redirect(mcpSetupUrl);
    } catch (error) {
      this.logger.error('Failed to start trial', {
        agent,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new InternalServerErrorException('Failed to start trial');
    }
  }
}
