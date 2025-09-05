import { InfisicalSDK } from '@infisical/sdk';
import { PackmindLogger } from '../../../logger/PackmindLogger';

const origin = 'InfisicalConfig';

export class InfisicalConfig {
  private readonly client: InfisicalSDK;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly env: string,
    private readonly projectId: string,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('Initializing InfisicalConfig', { env, projectId });

    try {
      this.client = new InfisicalSDK({
        siteUrl: 'https://eu.infisical.com', // Optional, defaults to https://app.infisical.com
      });
      this.logger.info('InfisicalSDK client created successfully', {
        siteUrl: 'https://eu.infisical.com',
      });
    } catch (error) {
      this.logger.error('Failed to create InfisicalSDK client', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async initClient() {
    this.logger.info('Initializing Infisical client authentication');

    try {
      this.logger.debug('Authenticating with Infisical using universal auth');
      await this.client.auth().universalAuth.login({
        clientId: this.clientId,
        clientSecret: this.clientSecret,
      });
      this.logger.info('Infisical client authenticated successfully');
    } catch (error) {
      this.logger.error('Failed to authenticate Infisical client', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getValue(secretName: string): Promise<string | null> {
    this.logger.info('Retrieving secret from Infisical', {
      secretName,
      env: this.env,
      projectId: this.projectId,
    });

    try {
      this.logger.debug('Fetching secret from Infisical API', { secretName });
      const nameSecret = await this.client.secrets().getSecret({
        projectId: this.projectId,
        environment: this.env,
        secretName: secretName,
      });

      if (nameSecret?.secretValue) {
        this.logger.info('Secret retrieved from Infisical successfully', {
          secretName,
        });
        return nameSecret.secretValue;
      } else {
        this.logger.warn('Secret not found or has no value in Infisical', {
          secretName,
        });
        return null;
      }
    } catch (error) {
      this.logger.warn('Failed to retrieve secret from Infisical', {
        secretName,
        env: this.env,
        projectId: this.projectId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
