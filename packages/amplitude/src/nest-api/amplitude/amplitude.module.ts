import { Module } from '@nestjs/common';
import { AmplitudeController } from './amplitude.controller';
import { AmplitudeService } from './amplitude.service';
import { LogLevel, PackmindLogger } from '@packmind/logger';

@Module({
  controllers: [AmplitudeController],
  providers: [
    AmplitudeService,
    {
      provide: PackmindLogger,
      useFactory: () => new PackmindLogger('AmplitudeModule', LogLevel.INFO),
    },
  ],
})
export class AmplitudeModule {}
