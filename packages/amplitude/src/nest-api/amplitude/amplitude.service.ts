import { Injectable } from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { Configuration } from '@packmind/node-utils';

const origin = 'AmplitudeService';

@Injectable()
export class AmplitudeService {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('AmplitudeService initialized');
  }

  async getConfig(): Promise<{
    amplitudeKey: string | null;
    amplitudeRegion: string | null;
  }> {
    this.logger.info('Fetching Amplitude configuration');

    const amplitudeKey = await Configuration.getConfig(
      'AMPLITUDE_API_KEY',
      process.env,
      this.logger,
    );
    const amplitudeRegion = await Configuration.getConfig(
      'AMPLITUDE_REGION',
      process.env,
      this.logger,
    );

    return {
      amplitudeKey,
      amplitudeRegion,
    };
  }
}
