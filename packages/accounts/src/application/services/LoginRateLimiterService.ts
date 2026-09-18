import { Cache, Configuration } from '@packmind/node-utils';
import { PackmindLogger, maskEmail } from '@packmind/logger';
import { TooManyLoginAttemptsError } from '../../domain/errors/TooManyLoginAttemptsError';

const origin = 'LoginRateLimiterService';

export interface LoginAttempt {
  timestamp: Date;
}

export class LoginRateLimiterService {
  private static readonly DEFAULT_MAX_ATTEMPTS = 3;
  private static readonly DEFAULT_BAN_TIME_SECONDS = 30 * 60; // 30 minutes
  private readonly cache: Cache;

  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.cache = Cache.getInstance();
  }

  private getCacheKey(email: string): string {
    return `login_attempts:${email.toLowerCase()}`;
  }

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

  // Throws TooManyLoginAttemptsError when the caller is currently banned.
  async checkLoginAllowed(email: string): Promise<void> {
    const cacheKey = this.getCacheKey(email);

    try {
      const attemptsData = await this.cache.get<LoginAttempt[]>(cacheKey);

      if (!attemptsData || attemptsData.length === 0) {
        return;
      }

      const now = new Date();
      const banTimeSeconds = await this.getBanTimeSeconds();
      const maxAttempts = await this.getMaxAttempts();

      const validAttempts = attemptsData.filter((attempt) => {
        const attemptDate = new Date(attempt.timestamp);
        const timeDiffSeconds = (now.getTime() - attemptDate.getTime()) / 1000;
        return timeDiffSeconds < banTimeSeconds;
      });

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
