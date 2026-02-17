import { Module } from '@nestjs/common';
import { OrganizationsSpacesSkillsChangeProposalsController } from './skills-change-proposals.controller';
import { SkillsChangeProposalsService } from './skills-change-proposals.service';
import { OrganizationAccessGuard } from '../../../guards/organization-access.guard';
import { SpaceAccessGuard } from '../../guards/space-access.guard';
import { PackmindLogger, LogLevel } from '@packmind/logger';

/**
 * Module for skill-scoped change proposal routes
 *
 * This module is registered as a child of OrganizationsSpacesSkillsModule via RouterModule,
 * automatically inheriting the /organizations/:orgId/spaces/:spaceId/skills/:skillId path prefix.
 */
@Module({
  controllers: [OrganizationsSpacesSkillsChangeProposalsController],
  providers: [
    SkillsChangeProposalsService,
    OrganizationAccessGuard,
    SpaceAccessGuard,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger(
          'OrganizationsSpacesSkillsChangeProposalsModule',
          LogLevel.INFO,
        ),
    },
  ],
})
export class OrganizationsSpacesSkillsChangeProposalsModule {}
