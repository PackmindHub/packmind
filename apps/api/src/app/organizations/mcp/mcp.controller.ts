import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Req,
  UseGuards,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { TokenResponse } from '../../auth/auth.service';
import { McpService } from './mcp.service';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { getErrorMessage } from '../../shared/utils/error.utils';
import { Configuration, removeTrailingSlash } from '@packmind/node-utils';
import { OrganizationId } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { OrganizationAccessGuard } from '../guards/organization-access.guard';

const origin = 'OrganizationMcpController';

@Controller()
@UseGuards(OrganizationAccessGuard)
export class McpController {
  constructor(
    private readonly mcpService: McpService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('OrganizationMcpController initialized');
  }

  @Get('token')
  @HttpCode(HttpStatus.OK)
  async getToken(
    @Param('orgId') organizationId: OrganizationId,
    @Req() request: AuthenticatedRequest,
  ): Promise<TokenResponse> {
    this.logger.info(
      'GET /organizations/:orgId/mcp/token - Generating OAuth2 token for authenticated user',
      {
        userId: request.user.userId,
        organizationId,
      },
    );

    try {
      const response = await this.mcpService.generateTokenForAuthenticatedUser({
        userId: request.user.userId,
        organizationId,
      });

      this.logger.info(
        'GET /organizations/:orgId/mcp/token - Token generated successfully for authenticated user',
        {
          userId: request.user.userId,
          organizationId,
        },
      );

      return response;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(
        'GET /organizations/:orgId/mcp/token - Error generating token for authenticated user',
        {
          userId: request.user.userId,
          organizationId,
          error: getErrorMessage(error),
        },
      );

      throw new InternalServerErrorException({
        error: 'server_error',
        error_description: 'An error occurred while processing the request',
      });
    }
  }

  @Get('url')
  @HttpCode(HttpStatus.OK)
  async getUrl(): Promise<{ url: string }> {
    const url = await Configuration.getConfig('APP_WEB_URL');
    if (url) {
      const normalizedUrl = removeTrailingSlash(url);
      return { url: `${normalizedUrl}/mcp` };
    }
    return { url: 'http://localhost:8081/mcp' };
  }

  @Get('config')
  @HttpCode(HttpStatus.OK)
  async getConfig(
    @Param('orgId') organizationId: OrganizationId,
    @Req() request: AuthenticatedRequest,
  ): Promise<{
    token: string;
    url: string;
    configs: {
      cursor: object;
      vscode: object;
      continue: object;
      claude: object;
      generic: object;
    };
  }> {
    this.logger.info(
      'GET /organizations/:orgId/mcp/config - Generating complete MCP configuration',
      {
        userId: request.user.userId,
        organizationId,
      },
    );

    try {
      const tokenResponse =
        await this.mcpService.generateTokenForAuthenticatedUser({
          userId: request.user.userId,
          organizationId,
        });

      const configResponse = await this.mcpService.getAllConfigs(
        tokenResponse.access_token,
      );

      this.logger.info(
        'GET /organizations/:orgId/mcp/config - Configuration generated successfully',
        {
          userId: request.user.userId,
          organizationId,
        },
      );

      return configResponse;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(
        'GET /organizations/:orgId/mcp/config - Error generating configuration',
        {
          userId: request.user.userId,
          organizationId,
          error: getErrorMessage(error),
        },
      );

      throw new InternalServerErrorException({
        error: 'server_error',
        error_description: 'An error occurred while processing the request',
      });
    }
  }
}
