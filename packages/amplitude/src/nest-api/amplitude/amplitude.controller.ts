import { Controller, Get } from '@nestjs/common';
import { AmplitudeService } from './amplitude.service';
import { Public } from '@packmind/node-utils';
import { LogLevel, PackmindLogger } from '@packmind/logger';

const origin = 'AmplitudeController';

@Public()
@Controller('amplitude')
export class AmplitudeController {
  constructor(
    private readonly amplitudeService: AmplitudeService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('AmplitudeController initialized');
  }

  @Get('config')
  async getConfig(): Promise<{
    amplitudeKey: string | null;
    amplitudeRegion: string | null;
  }> {
    this.logger.info(
      'GET /amplitude/config - Fetching Amplitude configuration',
    );
    return this.amplitudeService.getConfig();
  }
}
