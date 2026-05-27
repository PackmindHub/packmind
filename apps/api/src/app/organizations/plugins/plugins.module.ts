import { Module } from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { PluginsController } from './plugins.controller';
import { PluginsService } from './plugins.service';

@Module({
  controllers: [PluginsController],
  providers: [
    PluginsService,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger('OrganizationPluginsModule', LogLevel.INFO),
    },
  ],
  exports: [PluginsService],
})
export class OrganizationPluginsModule {}
