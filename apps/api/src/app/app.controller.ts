import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PackmindLogger } from '@packmind/shared';
import { Public } from './auth/auth.guard';

const origin = 'AppController';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('AppController initialized');
  }

  @Public()
  @Get()
  getData() {
    this.logger.info('GET / - Fetching application data');

    try {
      return this.appService.getData();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('GET / - Failed to fetch application data', {
        error: errorMessage,
      });
      throw error;
    }
  }
}
