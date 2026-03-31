import { Module } from '@nestjs/common';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { HexaRegistryModule } from '../../shared/HexaRegistryModule';
import { OrganizationAccessGuard } from '../guards/organization-access.guard';
import { PlaybookController } from './playbook.controller';
import { PlaybookService } from './playbook.service';

@Module({
  imports: [HexaRegistryModule],
  controllers: [PlaybookController],
  providers: [
    PlaybookService,
    OrganizationAccessGuard,
    {
      provide: PackmindLogger,
      useFactory: () => new PackmindLogger('PlaybookModule', LogLevel.INFO),
    },
  ],
})
export class PlaybookModule {}
