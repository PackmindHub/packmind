import {
  Controller,
  Get,
  Logger,
  HttpCode,
  HttpStatus,
  Req,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { TokenResponse } from '../auth/auth.service';
import { McpService } from './mcp.service';
import { AuthenticatedRequest } from '@packmind/shared-nest';
import { Configuration } from '@packmind/shared';

@Controller('mcp')
export class McpController {
  private readonly logger = new Logger(McpController.name);

  constructor(private readonly mcpService: McpService) {
    this.logger.log('McpController initialized');
  }

  /**
   * OAuth2 token endpoint for MCP server authentication
   *
   * This endpoint generates a JWT token for the currently authenticated user
   * without requiring username/password credentials.
   */
  @Get('token')
  @HttpCode(HttpStatus.OK)
  async getToken(@Req() request: AuthenticatedRequest): Promise<TokenResponse> {
    this.logger.log(
      'GET /mcp/token - Generating OAuth2 token for authenticated user',
      {
        userId: request.user.userId,
      },
    );

    try {
      const response = await this.mcpService.generateTokenForAuthenticatedUser({
        userId: request.user.userId,
      });

      this.logger.log(
        'GET /mcp/token - Token generated successfully for authenticated user',
        {
          userId: request.user.userId,
        },
      );

      return response;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        // Pass through these exceptions as they already have the correct format
        throw error;
      }

      this.logger.error(
        'GET /mcp/token - Error generating token for authenticated user',
        {
          userId: request.user.userId,
          error: error.message,
        },
      );

      throw new InternalServerErrorException({
        error: 'server_error',
        error_description: 'An error occurred while processing the request',
      });
    }
  }

  /**
   * MCP URL endpoint
   */
  @Get('url')
  @HttpCode(HttpStatus.OK)
  async getUrl(): Promise<{ url: string }> {
    const url =
      (await Configuration.getConfig('PACKMIND_MCP_BASE_URL')) ||
      'http://localhost:8081/mcp';
    return { url };
  }
}
