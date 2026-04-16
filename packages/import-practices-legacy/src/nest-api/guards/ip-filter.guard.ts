import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import { Configuration } from '@packmind/node-utils';
import { Request } from 'express';

const origin = 'IpFilterGuard';

/**
 * Guard that filters requests based on IP address.
 * If PACKMIND_IMPORT_LEGACY_IP_ALLOWED env var is set, only requests from that IP are allowed.
 * If not set, all requests are allowed (no IP filtering).
 */
@Injectable()
export class IpFilterGuard implements CanActivate {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowedIp = await Configuration.getConfig(
      'PACKMIND_IMPORT_LEGACY_IP_ALLOWED',
    );

    // If no IP restriction is configured, allow all requests
    if (!allowedIp) {
      this.logger.info('No IP restriction configured, allowing request');
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // Extract client IP from request
    // Check x-forwarded-for header first (for proxied requests), then fall back to request.ip
    const forwardedFor = request.headers['x-forwarded-for'];
    const clientIp =
      (typeof forwardedFor === 'string'
        ? forwardedFor.split(',')[0]?.trim()
        : undefined) || request.ip;

    this.logger.info('Checking IP address', {
      clientIp,
      allowedIp,
    });

    if (clientIp !== allowedIp) {
      this.logger.error('IP address not allowed', {
        clientIp,
        allowedIp,
      });
      throw new ForbiddenException('IP address not allowed');
    }

    this.logger.info('IP address allowed', { clientIp });
    return true;
  }
}
