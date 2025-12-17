import { Injectable, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  GenerateUserTokenCommand,
  Organization,
  User,
  UserOrganizationRole,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { IAccountsPort } from '@packmind/types';
import { Configuration, removeTrailingSlash } from '@packmind/node-utils';
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

      return this.generateTokenForUser(user, organization, role);
    } catch (error) {
      this.logger.error('Error generating MCP token for authenticated user', {
        userId: command.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  generateTokenForUser(
    user: User,
    organization: Organization,
    role: UserOrganizationRole,
  ): TokenResponse {
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

    this.logger.info('MCP token generated successfully', {
      userId: user.id,
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 30 * 24 * 60 * 60,
    };
  }

  async getMcpUrl(): Promise<string> {
    const appWebUrl = await Configuration.getConfig('APP_WEB_URL');
    if (appWebUrl) {
      const normalizedUrl = removeTrailingSlash(appWebUrl);
      return `${normalizedUrl}/mcp`;
    }
    return 'http://localhost:8081/mcp';
  }

  buildVsCodeMcpUrl(token: string, mcpUrl: string): string {
    const config = {
      name: 'packmind',
      type: 'http',
      url: mcpUrl,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
    const jsonConfig = JSON.stringify(config);
    return `vscode:mcp/install?${encodeURIComponent(jsonConfig)}`;
  }
}
