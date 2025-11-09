import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GenerateUserTokenCommand } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { IAccountsPort } from '@packmind/types';
import { InjectAccountsAdapter } from '../shared/HexaInjection';
import { TokenResponse } from '../auth/auth.service';

@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);

  constructor(
    @InjectAccountsAdapter() private readonly accountsAdapter: IAccountsPort,
    private readonly jwtService: JwtService,
    private readonly packmindLogger: PackmindLogger,
  ) {
    this.logger.log('McpService initialized');
  }

  /**
   * Generate an OAuth2 token for the currently authenticated user
   *
   * This method generates a JWT token for the currently authenticated user
   * without requiring email/password credentials.
   * Uses the MCP-specific JWT service with MCP_JWT_SECRET_KEY.
   */
  async generateTokenForAuthenticatedUser(
    command: GenerateUserTokenCommand,
  ): Promise<TokenResponse> {
    this.logger.log(
      `Generating MCP token for authenticated user: ${command.userId}`,
    );

    try {
      // Use the GenerateUserToken use case
      const { user, organization, role } =
        await this.accountsAdapter.generateUserToken(command);

      // Create JWT payload with sub claim for compatibility with MCP server
      const payload = {
        sub: user.id, // Required by MCP server
        email: user.email,
        organizationId: organization.id,
        user: {
          name: user.email,
          userId: user.id,
        },
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          role,
        },
      };

      // Generate access token using MCP-specific JwtService configuration
      // This uses the local JWT service configured with MCP_JWT_SECRET_KEY
      const accessToken = this.jwtService.sign(payload);

      // Create OAuth2 token response (30 days = 2,592,000 seconds)
      const response: TokenResponse = {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 30 * 24 * 60 * 60, // 30 days in seconds
      };

      this.logger.log(
        'MCP token generated successfully for authenticated user',
        {
          userId: user.id,
        },
      );

      return response;
    } catch (error) {
      this.logger.error('Error generating MCP token for authenticated user', {
        userId: command.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
