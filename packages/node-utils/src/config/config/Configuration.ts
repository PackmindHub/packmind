import { InfisicalConfig } from '../infra/Infisical/InfisicalConfig';
import { PackmindLogger, LogLevel } from '@packmind/logger';

const origin = 'Configuration';

export class Configuration {
  private static instance: Configuration;
  private static logger: PackmindLogger = new PackmindLogger(
    origin,
    LogLevel.INFO,
  );
  private infisicalConfig?: InfisicalConfig;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  static getInstance(logger?: PackmindLogger): Configuration {
    if (logger) {
      Configuration.logger = logger;
    }
    Configuration.logger.debug('Getting Configuration instance');
    if (!Configuration.instance) {
      Configuration.logger.info('Creating new Configuration instance');
      Configuration.instance = new Configuration();
    }
    return Configuration.instance;
  }

  private async initialize(env: Record<string, string | undefined>) {
    // If already initialized, return immediately
    if (this.initialized) {
      Configuration.logger.debug('Configuration already initialized, skipping');
      return;
    }

    // If initialization is in progress, wait for it to complete
    if (this.initializationPromise) {
      Configuration.logger.debug(
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
    Configuration.logger.info('Initializing Configuration');

    const configurationMode = env['CONFIGURATION']?.toLowerCase();
    Configuration.logger.debug('Configuration mode detected', {
      mode: configurationMode,
    });

    if (configurationMode === 'infisical') {
      Configuration.logger.info('Initializing Infisical configuration');

      // Initialize InfisicalConfig with required parameters
      const clientId = env['INFISICAL_CLIENT_ID'];
      const clientSecret = env['INFISICAL_CLIENT_SECRET'];
      const infisicalEnv = env['INFISICAL_ENV'];
      const projectId = env['INFISICAL_PROJECT_ID'];

      if (!clientId || !clientSecret || !infisicalEnv || !projectId) {
        Configuration.logger.error(
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

          Configuration.logger.debug('Initializing Infisical client');
          await this.infisicalConfig.initClient();
          Configuration.logger.info(
            'Infisical configuration initialized successfully',
          );
        } catch (error) {
          Configuration.logger.error(
            'Failed to initialize Infisical, falling back to environment variables only',
            {
              error: error instanceof Error ? error.message : String(error),
            },
          );
          this.infisicalConfig = undefined;
        }
      }
    } else {
      Configuration.logger.info(
        'Using environment variables only (no Infisical)',
      );
    }

    this.initialized = true;
    Configuration.logger.info('Configuration initialization completed');
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
    if (logger) {
      Configuration.logger = logger;
    }
    Configuration.logger.info('Getting configuration value', { key });

    try {
      const instance = Configuration.getInstance();
      await instance.initialize(env);

      // First check process.env
      const envValue = env[key];
      if (envValue) {
        Configuration.logger.debug(
          'Configuration value found in environment variables',
          { key },
        );
        return envValue;
      }

      // Then check infisical if available
      if (instance.infisicalConfig) {
        Configuration.logger.debug(
          'Checking Infisical for configuration value',
          { key },
        );
        try {
          const infisicalValue = await instance.infisicalConfig.getValue(key);
          if (infisicalValue) {
            Configuration.logger.debug(
              'Configuration value found in Infisical',
              {
                key,
              },
            );
            return infisicalValue;
          }
        } catch (error) {
          Configuration.logger.error(
            'Failed to retrieve value from Infisical, value not available',
            {
              key,
              error: error instanceof Error ? error.message : String(error),
            },
          );
          // Fall through to return null
        }
      }

      Configuration.logger.warn('Configuration value not found', { key });
      return null;
    } catch (error) {
      Configuration.logger.warn('Failed to get configuration value', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}
