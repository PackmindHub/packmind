import { Module } from '@nestjs/common';
import { TargetsController } from './targets.controller';
import { TargetsService } from './targets.service';
import { LogLevel, PackmindLogger } from '@packmind/logger';

@Module({
  controllers: [TargetsController],
  providers: [
    TargetsService,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger('OrganizationTargetsModule', LogLevel.INFO),
    },
  ],
})
export class OrganizationTargetsModule {}
