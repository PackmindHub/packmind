import {
  Cache,
  Configuration,
  PackmindLogger,
  maskEmail,
} from '@packmind/shared';
import { TooManyLoginAttemptsError } from '../../domain/errors/TooManyLoginAttemptsError';

const origin = 'LoginRateLimiterService';

export interface LoginAttempt {
  timestamp: Date;
}

export class LoginRateLimiterService {
  private static readonly DEFAULT_MAX_ATTEMPTS = 3;
  private static readonly DEFAULT_BAN_TIME_SECONDS = 30 * 60; // 30 minutes
  private readonly logger: PackmindLogger;
  private readonly cache: Cache;

  constructor() {
    this.logger = new PackmindLogger(origin);
    this.cache = Cache.getInstance();
  }

  /**
   * Get the cache key for a user's login attempts
   */
  private getCacheKey(email: string): string {
    return `login_attempts:${email.toLowerCase()}`;
  }

  /**
   * Get the maximum login attempts from configuration or use default
   */
  private async getMaxAttempts(): Promise<number> {
    try {
      const configValue = await Configuration.getConfig('MAX_LOGIN_ATTEMPTS');
      if (configValue) {
        const parsed = parseInt(configValue, 10);
        if (isNaN(parsed) || parsed <= 0) {
          this.logger.warn('Invalid MAX_LOGIN_ATTEMPTS value, using default', {
            configValue,
            default: LoginRateLimiterService.DEFAULT_MAX_ATTEMPTS,
          });
          return LoginRateLimiterService.DEFAULT_MAX_ATTEMPTS;
        }
        return parsed;
      }
      return LoginRateLimiterService.DEFAULT_MAX_ATTEMPTS;
    } catch (error) {
      this.logger.warn(
        'Failed to get MAX_LOGIN_ATTEMPTS configuration, using default',
        {
          error: error instanceof Error ? error.message : String(error),
          default: LoginRateLimiterService.DEFAULT_MAX_ATTEMPTS,
        },
      );
      return LoginRateLimiterService.DEFAULT_MAX_ATTEMPTS;
    }
  }

  /**
   * Get the ban time in seconds from configuration or use default
   */
  private async getBanTimeSeconds(): Promise<number> {
    try {
      const configValue = await Configuration.getConfig(
        'LOGIN_BAN_TIME_SECONDS',
      );
      if (configValue) {
        const parsed = parseInt(configValue, 10);
        if (isNaN(parsed) || parsed <= 0) {
          this.logger.warn(
            'Invalid LOGIN_BAN_TIME_SECONDS value, using default',
            {
              configValue,
              default: LoginRateLimiterService.DEFAULT_BAN_TIME_SECONDS,
            },
          );
          return LoginRateLimiterService.DEFAULT_BAN_TIME_SECONDS;
        }
        return parsed;
      }
      return LoginRateLimiterService.DEFAULT_BAN_TIME_SECONDS;
    } catch (error) {
      this.logger.warn(
        'Failed to get LOGIN_BAN_TIME_SECONDS configuration, using default',
        {
          error: error instanceof Error ? error.message : String(error),
          default: LoginRateLimiterService.DEFAULT_BAN_TIME_SECONDS,
        },
      );
      return LoginRateLimiterService.DEFAULT_BAN_TIME_SECONDS;
    }
  }

  /**
   * Check if a user is currently banned from login attempts
   * Throws TooManyLoginAttemptsError if user is banned
   */
  async checkLoginAllowed(email: string): Promise<void> {
    const cacheKey = this.getCacheKey(email);

    try {
      const attemptsData = await this.cache.get<LoginAttempt[]>(cacheKey);

      if (!attemptsData || attemptsData.length === 0) {
        // No previous attempts, login is allowed
        return;
      }

      const now = new Date();
      const banTimeSeconds = await this.getBanTimeSeconds();
      const maxAttempts = await this.getMaxAttempts();

      // Filter out expired attempts (older than ban time)
      const validAttempts = attemptsData.filter((attempt) => {
        const attemptDate = new Date(attempt.timestamp);
        const timeDiffSeconds = (now.getTime() - attemptDate.getTime()) / 1000;
        return timeDiffSeconds < banTimeSeconds;
      });

      // If we have max attempts or more valid attempts, user is banned
      if (validAttempts.length >= maxAttempts) {
        const oldestValidAttempt = validAttempts.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        )[0];

        const bannedUntil = new Date(
          new Date(oldestValidAttempt.timestamp).getTime() +
            banTimeSeconds * 1000,
        );

        this.logger.info('User login attempt blocked due to rate limiting', {
          email: maskEmail(email),
          attemptsCount: validAttempts.length,
          bannedUntil: bannedUntil.toISOString(),
        });

        throw new TooManyLoginAttemptsError(bannedUntil);
      }

      // Update cache with only valid attempts if some were filtered out
      if (validAttempts.length !== attemptsData.length) {
        await this.cache.set(cacheKey, validAttempts, banTimeSeconds);
      }
    } catch (error) {
      if (error instanceof TooManyLoginAttemptsError) {
        throw error;
      }

      this.logger.error('Failed to check login rate limiting', {
        email: maskEmail(email),
        error: error instanceof Error ? error.message : String(error),
      });
      // On cache errors, allow login to continue (fail open)
    }
  }

  /**
   * Record a failed login attempt
   */
  async recordFailedAttempt(email: string): Promise<void> {
    const cacheKey = this.getCacheKey(email);

    try {
      const banTimeSeconds = await this.getBanTimeSeconds();
      const existingAttempts =
        (await this.cache.get<LoginAttempt[]>(cacheKey)) || [];

      const newAttempt: LoginAttempt = {
        timestamp: new Date(),
      };

      const updatedAttempts = [...existingAttempts, newAttempt];

      // Store with expiration equal to ban time
      await this.cache.set(cacheKey, updatedAttempts, banTimeSeconds);

      this.logger.info('Recorded failed login attempt', {
        email: maskEmail(email),
        totalAttempts: updatedAttempts.length,
      });
    } catch (error) {
      this.logger.error('Failed to record failed login attempt', {
        email: maskEmail(email),
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw on cache errors to avoid breaking login flow
    }
  }

  /**
   * Clear all login attempts for a user (called on successful login)
   */
  async clearAttempts(email: string): Promise<void> {
    const cacheKey = this.getCacheKey(email);

    try {
      await this.cache.invalidate(cacheKey);

      this.logger.info('Cleared login attempts for user', {
        email: maskEmail(email),
      });
    } catch (error) {
      this.logger.error('Failed to clear login attempts', {
        email: maskEmail(email),
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw on cache errors
    }
  }
}
