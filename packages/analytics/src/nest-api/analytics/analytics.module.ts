import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { PackmindLogger } from '@packmind/logger';

@Module({
  imports: [],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    {
      provide: PackmindLogger,
      useFactory: () => new PackmindLogger('AnalyticsModule'),
    },
  ],
})
export class AnalyticsModule {}
