import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { commandsSchemas } from '@packmind/commands';
import { OrganizationsSpacesCommandsController } from './commands.controller';
import { CommandsService } from './commands.service';
import { OrganizationAccessGuard } from '../../guards/organization-access.guard';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { OrganizationsSpacesCommandsChangeProposalsModule } from '@packmind/playbook-change-management';

/**
 * Module for space-scoped recipe routes within organizations
 *
 * This module is registered as a child of OrganizationsSpacesModule via RouterModule,
 * automatically inheriting the /organizations/:orgId/spaces/:spaceId path prefix.
 *
 * OrganizationAccessGuard is provided to ensure proper access validation.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature(commandsSchemas),
    OrganizationsSpacesCommandsChangeProposalsModule,
  ],
  controllers: [OrganizationsSpacesCommandsController],
  providers: [
    CommandsService,
    OrganizationAccessGuard,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger('OrganizationsSpacesRecipesModule', LogLevel.INFO),
    },
  ],
  exports: [CommandsService],
})
export class CommandsModule {}
