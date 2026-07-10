import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { commandsSchemas } from '@packmind/commands';
import { CommandsAliasController } from './commands.alias.controller';
import { CommandsService } from './commands.service';
import { OrganizationAccessGuard } from '../../guards/organization-access.guard';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { OrganizationsSpacesCommandsChangeProposalsModule } from '@packmind/playbook-change-management';

/**
 * Alias module mounting the space-scoped commands controller under the new
 * `/commands` path. Mirrors {@link CommandsModule} (same imports/providers) but
 * declares {@link CommandsAliasController} so RouterModule can register a second
 * distinct module — dual-mounting the same module constructor would silently
 * overwrite the legacy `/recipes` mapping.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature(commandsSchemas),
    OrganizationsSpacesCommandsChangeProposalsModule,
  ],
  controllers: [CommandsAliasController],
  providers: [
    CommandsService,
    OrganizationAccessGuard,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger('OrganizationsSpacesCommandsModule', LogLevel.INFO),
    },
  ],
  exports: [CommandsService],
})
export class CommandsAliasModule {}
