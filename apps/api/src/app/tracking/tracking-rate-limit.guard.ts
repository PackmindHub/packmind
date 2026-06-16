import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { PackmindLogger, LogLevel } from '@packmind/logger';

/**
 * Sliding-window in-memory rate limiter for the public plugin-install
 * tracking endpoint.
 *
 * Keyed by `token+IP` (per spec §7.3). Window: 60 s, max 60 requests.
 * Falls back to IP-only when the token header is absent.
 *
 * NOTE: This is a single-process in-memory implementation. For a
 * multi-instance deployment, replace with a Redis-backed limiter. It is
 * sufficient for current scale and can be swapped without touching the
 * controller or module.
 */
@Injectable()
export class TrackingRateLimitGuard implements CanActivate {
  private readonly windowMs = 60_000; // 1 minute
  private readonly maxRequests = 60;
  private readonly store = new Map<string, number[]>();

  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      'TrackingRateLimitGuard',
      LogLevel.INFO,
    ),
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      ip?: string;
      socket?: { remoteAddress?: string };
    }>();

    const token =
      (request.headers['x-packmind-tracking-token'] as string | undefined) ??
      '';
    const ip = request.ip ?? request.socket?.remoteAddress ?? 'unknown';

    const key = `${token.substring(0, 8)}::${ip}`;
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let timestamps = this.store.get(key) ?? [];
    // Evict entries outside the window
    timestamps = timestamps.filter((ts) => ts > windowStart);

    if (timestamps.length >= this.maxRequests) {
      this.logger.warn('Rate limit exceeded for tracking endpoint', {
        keyPrefix: key.substring(0, 12) + '*',
      });
      throw new HttpException(
        'Rate limit exceeded. Retry after 60 seconds.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    timestamps.push(now);
    this.store.set(key, timestamps);

    return true;
  }
}
