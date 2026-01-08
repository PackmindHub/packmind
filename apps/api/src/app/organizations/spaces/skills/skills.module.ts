import { Module } from '@nestjs/common';
import { OrganizationsSpacesSkillsController } from './skills.controller';
import { SkillsService } from './skills.service';
import { OrganizationAccessGuard } from '../../guards/organization-access.guard';
import { SpaceAccessGuard } from '../guards/space-access.guard';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { HexaRegistryModule } from '../../../shared/HexaRegistryModule';

/**
 * Module for space-scoped skill routes within organizations
 *
 * This module is registered as a child of OrganizationsSpacesModule via RouterModule,
 * automatically inheriting the /organizations/:orgId/spaces/:spaceId path prefix.
 *
 * Both OrganizationAccessGuard and SpaceAccessGuard are provided to ensure proper access validation.
 */
@Module({
  imports: [HexaRegistryModule],
  controllers: [OrganizationsSpacesSkillsController],
  providers: [
    SkillsService,
    OrganizationAccessGuard,
    SpaceAccessGuard,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger('OrganizationsSpacesSkillsModule', LogLevel.INFO),
    },
  ],
  exports: [SkillsService],
})
export class OrganizationsSpacesSkillsModule {}
