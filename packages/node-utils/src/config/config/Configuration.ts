import { InfisicalConfig } from '../infra/Infisical/InfisicalConfig';
import { PackmindLogger, LogLevel } from '@packmind/logger';

const origin = 'Configuration';

/**
 * How long a resolved Infisical value is served without question. Past this the
 * value is still served, but a refresh is kicked off behind the request.
 *
 * This is also the window in which two pods can disagree after a secret is
 * rotated. It is deliberately short: because refreshes never sit on a request,
 * shortening it costs no user-visible latency — only the blocking first read
 * per key pays Infisical's ~350ms.
 */
export const CONFIG_SOFT_TTL_MS = 60_000;

/**
 * The point at which a value is too old to serve without trying again, so the
 * reader waits for the refresh. Only reached when refreshes have been failing
 * for a quarter of an hour — under normal operation the soft TTL always fires
 * first and nothing ever blocks here.
 */
export const CONFIG_HARD_TTL_MS = 900_000;

type CachedValue = {
  value: string | null;
  refreshAt: number;
  expiresAt: number;
};

export class Configuration {
  private static instance: Configuration;
  private infisicalConfig?: InfisicalConfig;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Resolved Infisical values, stale-while-revalidate.
   *
   * Only the Infisical branch is cached. The `process.env` path stays uncached
   * — reading it is free, and caching it would pin values that tests and
   * `docker-compose` expect to be live.
   */
  private readonly valueCache = new Map<string, CachedValue>();

  /**
   * Refreshes currently in flight, keyed by config key, so that concurrent
   * readers of a cold key issue one Infisical call between them rather than
   * one each. Same idea as `initializationPromise`, one level down.
   */
  private readonly refreshes = new Map<string, Promise<string | null>>();

  static getInstance(logger?: PackmindLogger): Configuration {
    if (!Configuration.instance) {
      Configuration.instance = new Configuration(logger);
      Configuration.instance.logger.info('Creating new Configuration instance');
    } else if (logger) {
      Configuration.instance.logger = logger;
    }
    return Configuration.instance;
  }

  private constructor(
    private logger: PackmindLogger = new PackmindLogger(origin, LogLevel.INFO),
  ) {}

  /**
   * Drop every cached value, so the next read of each key goes back to
   * Infisical. Exposed for tests, and as the hook an invalidation broadcast
   * would call if rotations ever need to propagate faster than the soft TTL.
   */
  static resetCache(): void {
    Configuration.instance?.valueCache.clear();
    Configuration.instance?.refreshes.clear();
  }

  private async initialize(env: Record<string, string | undefined>) {
    // If already initialized, return immediately
    if (this.initialized) {
      this.logger.debug('Configuration already initialized, skipping');
      return;
    }

    // If initialization is in progress, wait for it to complete
    if (this.initializationPromise) {
      this.logger.debug(
        'Configuration initialization already in progress, waiting for completion',
      );
      await this.initializationPromise;
      return;
    }

    // Start initialization and store the promise
    this.initializationPromise = this.performInitialization(env);

    try {
      await this.initializationPromise;
    } finally {
      // Clear the promise once initialization is complete (success or failure)
      this.initializationPromise = null;
    }
  }

  private async performInitialization(
    env: Record<string, string | undefined>,
  ): Promise<void> {
    this.logger.info('Initializing Configuration');

    const configurationMode = env['CONFIGURATION']?.toLowerCase();
    this.logger.debug('Configuration mode detected', {
      mode: configurationMode,
    });

    if (configurationMode === 'infisical') {
      this.logger.info('Initializing Infisical configuration');

      // Initialize InfisicalConfig with required parameters
      const clientId = env['INFISICAL_CLIENT_ID'];
      const clientSecret = env['INFISICAL_CLIENT_SECRET'];
      const infisicalEnv = env['INFISICAL_ENV'];
      const projectId = env['INFISICAL_PROJECT_ID'];

      if (!clientId || !clientSecret || !infisicalEnv || !projectId) {
        this.logger.error(
          'Infisical configuration is incomplete, falling back to environment variables only',
          {
            hasClientId: !!clientId,
            hasClientSecret: !!clientSecret,
            hasInfisicalEnv: !!infisicalEnv,
            hasProjectId: !!projectId,
          },
        );
        this.infisicalConfig = undefined;
      } else {
        try {
          this.infisicalConfig = new InfisicalConfig(
            clientId,
            clientSecret,
            infisicalEnv,
            projectId,
          );

          this.logger.debug('Initializing Infisical client');
          await this.infisicalConfig.initClient();
          this.logger.info('Infisical configuration initialized successfully');
        } catch (error) {
          this.logger.error(
            'Failed to initialize Infisical, falling back to environment variables only',
            {
              error: error instanceof Error ? error.message : String(error),
            },
          );
          this.infisicalConfig = undefined;
        }
      }
    } else {
      this.logger.info('Using environment variables only (no Infisical)');
    }

    this.initialized = true;
    this.logger.info('Configuration initialization completed');
  }

  /**
   * Fetch one key from Infisical and cache the result, sharing the call with
   * any concurrent reader of the same key. Rejects if Infisical does — callers
   * decide whether that is fatal or whether a stale value covers for it.
   */
  private fetchAndCache(
    infisicalConfig: InfisicalConfig,
    key: string,
  ): Promise<string | null> {
    const inFlight = this.refreshes.get(key);
    if (inFlight) {
      return inFlight;
    }

    const refresh = infisicalConfig
      .getValue(key)
      .then((value) => {
        const now = Date.now();
        this.valueCache.set(key, {
          value,
          refreshAt: now + CONFIG_SOFT_TTL_MS,
          expiresAt: now + CONFIG_HARD_TTL_MS,
        });
        return value;
      })
      .finally(() => {
        this.refreshes.delete(key);
      });

    this.refreshes.set(key, refresh);
    return refresh;
  }

  /**
   * Read a key from Infisical, stale-while-revalidate.
   *
   * A cached value is returned immediately whatever its age; once past the soft
   * TTL the refresh happens behind the response, so no request ever pays for a
   * turnover. A value is only awaited when there is nothing to serve, or when
   * refreshes have been failing long enough to reach the hard bound — and even
   * then a stale value beats the `null` that a live read returns on failure.
   */
  private async resolveFromInfisical(
    infisicalConfig: InfisicalConfig,
    key: string,
  ): Promise<string | null> {
    const cached = this.valueCache.get(key);
    const now = Date.now();

    if (cached && now < cached.refreshAt) {
      return cached.value;
    }

    if (cached && now < cached.expiresAt) {
      // Stale but serveable. Refresh out of band; a failure here must not
      // surface as an unhandled rejection, and leaves the entry in place so
      // the next reader serves the same stale value rather than nothing.
      this.fetchAndCache(infisicalConfig, key).catch((error) => {
        this.logger.warn(
          'Background refresh of configuration value failed, serving stale value',
          {
            key,
            error: error instanceof Error ? error.message : String(error),
          },
        );
      });
      return cached.value;
    }

    try {
      return await this.fetchAndCache(infisicalConfig, key);
    } catch (error) {
      if (cached) {
        this.logger.error(
          'Configuration value is past its hard TTL and could not be refreshed, serving stale value',
          {
            key,
            error: error instanceof Error ? error.message : String(error),
          },
        );
        return cached.value;
      }
      throw error;
    }
  }

  static async getConfigWithDefault(
    key: string,
    defaultValue: string,
  ): Promise<string> {
    const value = await Configuration.getConfig(key);
    return value ?? defaultValue;
  }

  static async getConfig(
    key: string,
    env: Record<string, string | undefined> = process.env,
    logger?: PackmindLogger,
  ): Promise<string | null> {
    const instance = Configuration.getInstance(logger);
    instance.logger.debug('Getting configuration value', { key });

    try {
      await instance.initialize(env);

      // First check process.env
      const envValue = env[key];
      if (envValue) {
        instance.logger.debug(
          'Configuration value found in environment variables',
          { key },
        );
        return envValue;
      }

      // Then check infisical if available
      if (instance.infisicalConfig) {
        instance.logger.debug('Checking Infisical for configuration value', {
          key,
        });
        try {
          const infisicalValue = await instance.resolveFromInfisical(
            instance.infisicalConfig,
            key,
          );
          if (infisicalValue) {
            instance.logger.debug('Configuration value found in Infisical', {
              key,
            });
            return infisicalValue;
          }
        } catch (error) {
          instance.logger.warn(
            'Failed to retrieve value from Infisical, value not available',
            {
              key,
              error: error instanceof Error ? error.message : String(error),
            },
          );
          // Fall through to return null
        }
      }

      instance.logger.warn('Configuration value not found', { key });
      return null;
    } catch (error) {
      instance.logger.warn('Failed to get configuration value', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}
