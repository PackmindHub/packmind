import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Configuration, Public } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import {
  IAccountsPort,
  StartTrialCommand,
  StartTrialCommandAgents,
  StartTrialResult,
  createUserId,
  createOrganizationId,
} from '@packmind/types';
import { InjectAccountsAdapter } from '../shared/HexaInjection';
import { McpService } from '../organizations/mcp/mcp.service';

const origin = 'TrialController';
const validAgents = [
  'vs-code',
  'cursor',
  'claude',
  'continue-dev',
  'jetbrains',
  'other',
];

const DEFAULT_APP_WEB_URL = 'http://localhost:4200';

interface GetActivationTokenBody {
  mcpToken: string;
}

export interface GetActivationTokenResponse {
  activationUrl: string;
}

@Controller()
export class TrialController {
  constructor(
    @InjectAccountsAdapter() private readonly accountsAdapter: IAccountsPort,
    private readonly mcpService: McpService,
    private readonly jwtService: JwtService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('TrialController initialized');
  }

  @Public()
  @Get()
  async startTrial(@Query('agent') agent: string): Promise<StartTrialResult> {
    this.logger.info('GET /start-trial - Starting trial', { agent });

    if (!isValidAgent(agent)) {
      throw new BadRequestException(
        `Invalid agent parameter. Supported values: ${validAgents.join(', ')}`,
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

  @Public()
  @Post('get-activation-token')
  async getActivationToken(
    @Body() body: GetActivationTokenBody,
  ): Promise<GetActivationTokenResponse> {
    this.logger.info(
      'POST /start-trial/get-activation-token - Getting activation token',
    );

    if (!body.mcpToken) {
      throw new BadRequestException('MCP token is required');
    }

    try {
      // Decode the MCP token to extract user information
      const decoded = this.jwtService.verify(body.mcpToken);

      if (!decoded.sub || !decoded.organizationId) {
        throw new UnauthorizedException(
          'Invalid MCP token: missing required claims',
        );
      }

      const userId = createUserId(decoded.sub);
      const organizationId = createOrganizationId(decoded.organizationId);

      // Generate the activation token using the same logic as the MCP tool
      const { activationToken } =
        await this.accountsAdapter.generateTrialActivationToken({
          userId,
          organizationId,
        });

      // Build the activation URL
      const appWebUrl =
        (await Configuration.getConfig('APP_WEB_URL')) ?? DEFAULT_APP_WEB_URL;
      const activationUrl = `${appWebUrl}/activate-account?token=${activationToken}`;

      this.logger.info('Activation token generated successfully', {
        userId: String(userId),
      });

      return { activationUrl };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error('Failed to get activation token', {
        error: error instanceof Error ? error.message : String(error),
      });

      throw new InternalServerErrorException(
        'Failed to generate activation token',
      );
    }
  }
}

function isValidAgent(tbd: string): tbd is StartTrialCommandAgents {
  return validAgents.includes(tbd);
}
