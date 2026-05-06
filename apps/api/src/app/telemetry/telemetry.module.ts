import { Module } from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';

@Module({
  controllers: [TelemetryController],
  providers: [
    TelemetryService,
    {
      provide: PackmindLogger,
      useFactory: () => new PackmindLogger('TelemetryModule', LogLevel.INFO),
    },
  ],
  exports: [TelemetryService],
})
export class TelemetryModule {}
