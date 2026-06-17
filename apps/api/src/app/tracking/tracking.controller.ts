import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Headers,
  UnauthorizedException,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { Public } from '@packmind/node-utils';
import { ApiKeyService, IJwtService } from '@packmind/accounts';
import {
  IDeploymentPort,
  TrackPluginInstallHeartbeatResponse,
} from '@packmind/types';
import { InjectDeploymentAdapter } from '../shared/HexaInjection';
import { TrackPluginInstallBodyDto } from './dto/TrackPluginInstallBody.dto';
import { TrackingRateLimitGuard } from './tracking-rate-limit.guard';

const origin = 'TrackingController';

/**
 * Mask the first 6 characters of a string and replace the rest with '*',
 * per `standard-compliance-logging-personal-information.md`.
 */
function maskIdentifier(value: string): string {
  if (!value) return value;
  if (value.length <= 6) return `${value}*`;
  return `${value.slice(0, 6)}*`;
}

/**
 * Lightweight JWT service adapter for `ApiKeyService`.
 * Mirrors the one in `AuthGuard` — kept local to avoid coupling.
 */
class JwtServiceAdapter implements IJwtService {
  constructor(private readonly jwtService: JwtService) {}
  sign(payload: Record<string, unknown>, options?: JwtSignOptions): string {
    return this.jwtService.sign(payload, options);
  }
  verify(token: string): Record<string, unknown> {
    return this.jwtService.verify(token);
  }
}

/**
 * Public NestJS controller for the plugin-install tracking endpoint.
 *
 * Mounted at `/tracking` via `RouterModule` in `AppModule`. All handlers
 * are decorated with `@Public()` to bypass the global `AuthGuard`.
 *
 * Rate limiting is applied per-handler via `TrackingRateLimitGuard`.
 *
 * Auth fallback matrix (spec §7.3, §9):
 * - Valid API key, correct org → `verifiedUserId` set.
 * - Invalid/expired API key     → degrade silently to anonymous attribution.
 * - Cross-org API key           → ignore key, degrade to anonymous.
 * - No Authorization header     → anonymous attribution.
 * - Unknown/missing token       → 401.
 * - Malformed body              → 400.
 * - Rate limit exceeded         → 429.
 */
@Controller()
export class TrackingController {
  private readonly apiKeyService: ApiKeyService;

  constructor(
    @InjectDeploymentAdapter()
    private readonly deploymentAdapter: IDeploymentPort,
    private readonly jwtService: JwtService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('TrackingController initialized');
    this.apiKeyService = new ApiKeyService(
      new JwtServiceAdapter(this.jwtService),
      logger,
    );
  }

  /**
   * `POST /tracking/plugin-installs`
   *
   * Receives a SessionStart heartbeat from a Packmind-published Claude Code
   * plugin. The `X-Packmind-Tracking-Token` header identifies the marketplace;
   * the optional `Authorization` header carries a Packmind CLI API key for
   * verified-user attribution.
   */
  @Public()
  @UseGuards(TrackingRateLimitGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @Post('plugin-installs')
  @HttpCode(HttpStatus.OK)
  async trackPluginInstallHeartbeat(
    @Headers('x-packmind-tracking-token') trackingToken: string | undefined,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Body() body: TrackPluginInstallBodyDto,
  ): Promise<TrackPluginInstallHeartbeatResponse> {
    if (!trackingToken || trackingToken.trim() === '') {
      this.logger.warn(
        'POST /tracking/plugin-installs - Missing tracking token',
      );
      throw new UnauthorizedException(
        'X-Packmind-Tracking-Token header is required',
      );
    }

    this.logger.info('POST /tracking/plugin-installs - Processing heartbeat', {
      pluginSlug: body.pluginSlug,
      scope: body.scope,
      tokenPrefix: maskIdentifier(trackingToken),
    });

    // Resolve verified user from Authorization header — NEVER reject on
    // invalid/expired/cross-org key; always degrade to anonymous.
    // Both userId and orgId are forwarded so the use case can enforce the
    // cross-org guard (spec §7.3, §9).
    const verifiedUser = this.resolveVerifiedUser(authorizationHeader);

    try {
      const response = await this.deploymentAdapter.trackPluginInstallHeartbeat(
        {
          trackingToken: trackingToken.trim(),
          pluginSlug: body.pluginSlug,
          marketplaceName: body.marketplaceName,
          scope: body.scope,
          installedVersion: body.installedVersion ?? null,
          repoRemoteUrl: body.repoRemoteUrl ?? null,
          anonymousIdHash: body.anonymousIdHash ?? null,
          anonymousEmailMasked: body.anonymousEmailMasked ?? null,
          verifiedUserId: verifiedUser?.verifiedUserId ?? null,
          verifiedUserOrgId: verifiedUser?.verifiedUserOrgId ?? null,
        },
      );

      this.logger.info('POST /tracking/plugin-installs - Heartbeat processed', {
        pluginSlug: body.pluginSlug,
        created: response.created,
        marketplaceId: response.marketplaceId,
      });

      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'UnauthorizedError') {
        this.logger.warn(
          'POST /tracking/plugin-installs - Invalid tracking token',
          { tokenPrefix: maskIdentifier(trackingToken) },
        );
        throw new UnauthorizedException('Invalid tracking token');
      }
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('POST /tracking/plugin-installs - Unexpected error', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Attempts to extract verified user identity from the Authorization header.
   *
   * Rules (spec §7.3, §9):
   * - Parse `Bearer <api_key>` from header.
   * - Validate API key via `ApiKeyService.extractUserFromApiKey`.
   * - Returns both userId and organizationId so the use case can enforce the
   *   cross-org guard: a key from org A must not attribute installs to org B.
   * - Any failure (invalid, expired, malformed) → return null (degrade silently).
   */
  private resolveVerifiedUser(authorizationHeader: string | undefined): {
    verifiedUserId: string;
    verifiedUserOrgId: string;
  } | null {
    if (!authorizationHeader) {
      return null;
    }

    try {
      const parts = authorizationHeader.split(' ');
      if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        return null;
      }
      const apiKey = parts[1].trim();
      const userInfo = this.apiKeyService.extractUserFromApiKey(apiKey);
      if (!userInfo) {
        return null;
      }

      return {
        verifiedUserId: userInfo.user.userId,
        verifiedUserOrgId: userInfo.organization.id,
      };
    } catch {
      // Any error (JWT verify failure, malformed key, etc.) → degrade
      return null;
    }
  }
}
