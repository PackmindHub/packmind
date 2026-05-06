import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { TelemetryService } from './telemetry.service';

const origin = 'TelemetryController';

const PII_MASK_LENGTH = 6;

function maskUserId(userId: string): string {
  return `${userId.slice(0, PII_MASK_LENGTH)}*`;
}

/**
 * OTLP/HTTP-compatible telemetry ingestion.
 *
 * Mounted at root path `telemetry` (sibling of `TrialModule`,
 * `PublicSkillsModule`) — Claude Code's OTel exporter cannot put `:orgId`
 * in the URL, so the org is derived from the API key instead. Routes go
 * through the global `AuthGuard`; an `Authorization: Bearer <api-key>`
 * header is required.
 */
@Controller()
export class TelemetryController {
  constructor(
    private readonly telemetryService: TelemetryService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {}

  /**
   * OTLP/HTTP logs endpoint. Configure Claude Code with:
   *   OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=https://<host>/api/v0/telemetry/v1/logs
   *   OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer <api-key>"
   *
   * Returns the OTLP-spec `{ partialSuccess: {} }` envelope on success.
   */
  @Post('v1/logs')
  @HttpCode(HttpStatus.OK)
  async ingestLogs(
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<{ partialSuccess: Record<string, never> }> {
    const userId = request.user.userId;
    const organizationId = request.organization.id;

    try {
      const result = await this.telemetryService.ingest({
        userId,
        organizationId,
        rawPayload: body,
      });

      this.logger.info('Ingested telemetry batch', {
        organizationId,
        userId: maskUserId(userId),
        eventId: result.eventId,
        acceptedRecords: result.acceptedRecords,
      });

      return { partialSuccess: {} };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn('Rejected telemetry batch', {
        organizationId,
        userId: maskUserId(userId),
        error: message,
      });
      throw new BadRequestException(message);
    }
  }

  /**
   * Read recent telemetry batches stored for the calling org. Useful for
   * verifying ingestion or building a future UI.
   */
  @Get('events')
  async listRecent(
    @Req() request: AuthenticatedRequest,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    const userId = request.user.userId;
    const organizationId = request.organization.id;

    this.logger.info('Listing recent telemetry events', {
      organizationId,
      userId: maskUserId(userId),
      limit,
    });

    return this.telemetryService.listRecent({
      userId,
      organizationId,
      limit,
    });
  }
}
