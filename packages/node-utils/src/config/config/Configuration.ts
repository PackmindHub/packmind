import { InfisicalConfig } from '../infra/Infisical/InfisicalConfig';
import { PackmindLogger, LogLevel } from '@packmind/logger';

const origin = 'Configuration';

export class Configuration {
  private static instance: Configuration;
  private infisicalConfig?: InfisicalConfig;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

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
    instance.logger.info('Getting configuration value', { key });

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
          const infisicalValue = await instance.infisicalConfig.getValue(key);
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
