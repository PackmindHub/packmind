import { Module } from '@nestjs/common';
import { SpacesManagementController } from './spaces-management.controller';
import { SpacesManagementService } from './spaces-management.service';
import { OrganizationAccessGuard } from '../shared/organization-access.guard';
import { PackmindLogger, LogLevel } from '@packmind/logger';

@Module({
  controllers: [SpacesManagementController],
  providers: [
    SpacesManagementService,
    OrganizationAccessGuard,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger('SpacesManagementModule', LogLevel.INFO),
    },
  ],
})
export class SpacesManagementModule {}
