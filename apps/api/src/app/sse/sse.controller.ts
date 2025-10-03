import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { SSEService } from './sse.service';
import { PackmindLogger } from '@packmind/shared';
import { SubscribeDto, UnsubscribeDto } from './dto/subscribe.dto';
import { AuthenticatedRequest } from '@packmind/shared-nest';

@Controller('sse')
export class SSEController {
  constructor(
    private readonly sseService: SSEService,
    private readonly logger: PackmindLogger,
  ) {
    this.logger.info('SSEController initialized');
  }

  @Get('stream')
  async streamEvents(
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ): Promise<void> {
    const connectionId = `${request.user.userId}`;
    const userId = request.user.userId;
    const organizationId = request.organization
      ? request.organization.id
      : null;

    this.logger.info('New SSE connection request', {
      connectionId,
      userId,
      organizationId,
    });

    // Set SSE headers with proper CORS
    const allowedOrigins = [
      'http://localhost:4200',
      'http://localhost:5173',
      'http://localhost:3000',
    ];
    const origin = request.headers.origin;
    const allowOrigin = allowedOrigins.includes(origin || '')
      ? origin
      : allowedOrigins[1]; // Default to Vite

    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers':
        'Cache-Control, Authorization, Content-Type',
    });

    // Add the connection to our service
    this.sseService.addConnection(
      connectionId,
      response,
      userId, // Required now
      organizationId,
    );

    this.logger.info('SSE connection established', {
      connectionId,
      userId,
      organizationId,
    });
  }

  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  async subscribe(
    @Req() request: AuthenticatedRequest,
    @Body() subscribeDto: SubscribeDto,
  ): Promise<{ success: boolean; message: string }> {
    const userId = request.user.userId;
    const { eventType, params = [] } = subscribeDto;

    this.logger.info('SSE subscription request', {
      userId,
      eventType,
      params,
    });

    try {
      await this.sseService.subscribeUser(userId, eventType, params);

      return {
        success: true,
        message: `Successfully subscribed to ${eventType} events`,
      };
    } catch (error) {
      this.logger.error('Failed to subscribe user to SSE events', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        eventType,
        params,
      });

      return {
        success: false,
        message: 'Failed to subscribe to events',
      };
    }
  }

  @Post('unsubscribe')
  @HttpCode(HttpStatus.OK)
  async unsubscribe(
    @Req() request: AuthenticatedRequest,
    @Body() unsubscribeDto: UnsubscribeDto,
  ): Promise<{ success: boolean; message: string }> {
    const userId = request.user.userId;
    const { eventType, params = [] } = unsubscribeDto;

    this.logger.info('SSE unsubscription request', {
      userId,
      eventType,
      params,
    });

    try {
      await this.sseService.unsubscribeUser(userId, eventType, params);

      return {
        success: true,
        message: `Successfully unsubscribed from ${eventType} events`,
      };
    } catch (error) {
      this.logger.error('Failed to unsubscribe user from SSE events', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        eventType,
        params,
      });

      return {
        success: false,
        message: 'Failed to unsubscribe from events',
      };
    }
  }
}
