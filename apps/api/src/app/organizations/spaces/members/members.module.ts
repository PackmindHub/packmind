import { Module } from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { SpaceMembersController } from './members.controller';
import { SpaceMembersService } from './members.service';

@Module({
  controllers: [SpaceMembersController],
  providers: [
    SpaceMembersService,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger('OrganizationsSpacesMembersModule', LogLevel.INFO),
    },
  ],
})
export class OrganizationsSpacesMembersModule {}
