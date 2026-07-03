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
import { TrialTokenService } from './trial-token.service';

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
  trialToken: string;
}

export interface GetActivationTokenResponse {
  activationUrl: string;
}

@Controller()
export class TrialController {
  constructor(
    @InjectAccountsAdapter() private readonly accountsAdapter: IAccountsPort,
    private readonly trialTokenService: TrialTokenService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('TrialController initialized');
  }

  @Public()
  @Get()
  async startTrial(@Query('agent') agent: string): Promise<StartTrialResult> {
    this.logger.info('GET /quick-start - Starting trial', { agent });

    if (!isValidAgent(agent)) {
      throw new BadRequestException(
        `Invalid agent parameter. Supported values: ${validAgents.join(', ')}`,
      );
    }

    try {
      const command: StartTrialCommand = { agent };
      const { user, organization, role } =
        await this.accountsAdapter.startTrial(command);

      const tokenResponse = this.trialTokenService.generateTokenForUser(
        user,
        organization,
        role,
      );

      const { code: cliLoginCode } =
        await this.accountsAdapter.createCliLoginCode({
          userId: user.id,
          organizationId: organization.id,
        });

      this.logger.info('Trial started successfully', { agent });

      return {
        user,
        organization,
        role,
        trialToken: tokenResponse.access_token,
        cliLoginCode,
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
      'POST /quick-start/get-activation-token - Getting activation token',
    );

    if (!body.trialToken) {
      throw new BadRequestException('Trial token is required');
    }

    try {
      // Decode the trial token to extract user information.
      // Using trialTokenService.verifyToken() ensures we use the same JWT
      // secret that was used to sign the token.
      const decoded = this.trialTokenService.verifyToken(body.trialToken);

      if (!decoded.sub || !decoded.organizationId) {
        throw new UnauthorizedException(
          'Invalid trial token: missing required claims',
        );
      }

      const userId = createUserId(decoded.sub);
      const organizationId = createOrganizationId(decoded.organizationId);

      // Generate the trial account activation token
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
