import { Module } from '@nestjs/common';
import { OrganizationsSpacesController } from './spaces.controller';
import { RecipesModule } from './recipes/recipes.module';
import { OrganizationsSpacesStandardsModule } from './standards/standards.module';
import { OrganizationsSpacesPackagesModule } from './packages/packages.module';
import { OrganizationsSpacesSkillsModule } from './skills/skills.module';
import { OrganizationsSpacesChangeProposalsModule } from '@packmind/playbook-change-management';
import { OrganizationsSpacesMembersModule } from './members/members.module';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { SpacesService } from '../../spaces/spaces.service';

/**
 * Module for organization-scoped space routes
 *
 * This module provides space-scoped routing within organizations
 * using NestJS RouterModule for hierarchical path structure.
 *
 * The RouterModule configuration is done in AppModule to avoid circular
 * dependencies. This module defines the space controller and imports
 * child modules (recipes, standards, etc.).
 *
 * Route hierarchy (configured via RouterModule in AppModule):
 * - GET /organizations/:orgId/spaces (OrganizationsSpacesController - list all spaces)
 * - GET /organizations/:orgId/spaces/:slug (OrganizationsSpacesController - get space by slug)
 * - /organizations/:orgId/spaces/:spaceId/recipes (OrganizationsSpacesRecipesModule)
 * - /organizations/:orgId/spaces/:spaceId/standards (OrganizationsSpacesStandardsModule)
 * - /organizations/:orgId/spaces/:spaceId/packages (OrganizationsSpacesPackagesModule)
 * - /organizations/:orgId/spaces/:spaceId/skills (OrganizationsSpacesSkillsModule)
 *
 * All routes are protected by OrganizationAccessGuard
 * which validates that the user has access to the organization.
 */
@Module({
  imports: [
    RecipesModule,
    OrganizationsSpacesStandardsModule,
    OrganizationsSpacesPackagesModule,
    OrganizationsSpacesSkillsModule,
    OrganizationsSpacesChangeProposalsModule,
    OrganizationsSpacesMembersModule,
  ],
  controllers: [OrganizationsSpacesController],
  providers: [
    SpacesService,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger('OrganizationsSpacesModule', LogLevel.INFO),
    },
  ],
})
export class OrganizationsSpacesModule {}
