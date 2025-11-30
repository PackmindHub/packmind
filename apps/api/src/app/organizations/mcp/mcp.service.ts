import { Injectable, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GenerateUserTokenCommand } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { IAccountsPort } from '@packmind/types';
import { TokenResponse } from '../../auth/auth.service';
import { ACCOUNTS_ADAPTER_TOKEN } from '../../shared/HexaRegistryModule';

const origin = 'OrganizationMcpService';

@Injectable()
export class McpService {
  constructor(
    @Inject(ACCOUNTS_ADAPTER_TOKEN)
    private readonly accountsAdapter: IAccountsPort,
    private readonly jwtService: JwtService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('OrganizationMcpService initialized');
  }

  async generateTokenForAuthenticatedUser(
    command: GenerateUserTokenCommand,
  ): Promise<TokenResponse> {
    this.logger.info(
      `Generating MCP token for authenticated user: ${command.userId}`,
    );

    try {
      const { user, organization, role } =
        await this.accountsAdapter.generateUserToken(command);

      const payload = {
        sub: user.id,
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

      const accessToken = this.jwtService.sign(payload);

      const response: TokenResponse = {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 30 * 24 * 60 * 60,
      };

      this.logger.info(
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
