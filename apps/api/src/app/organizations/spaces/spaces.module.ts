import { Module } from '@nestjs/common';
import { OrganizationsSpacesController } from './spaces.controller';
import { SpaceAccessGuard } from './guards/space-access.guard';
import { OrganizationsSpacesRecipesModule } from './recipes/recipes.module';
import { OrganizationsSpacesStandardsModule } from './standards/standards.module';
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
 *
 * All routes are protected by OrganizationAccessGuard and optionally SpaceAccessGuard
 * which validate that the user has access to the organization and space.
 */
@Module({
  imports: [
    OrganizationsSpacesRecipesModule,
    OrganizationsSpacesStandardsModule,
  ],
  controllers: [OrganizationsSpacesController],
  providers: [
    SpacesService,
    SpaceAccessGuard,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger('OrganizationsSpacesModule', LogLevel.INFO),
    },
  ],
  exports: [SpaceAccessGuard],
})
export class OrganizationsSpacesModule {}
