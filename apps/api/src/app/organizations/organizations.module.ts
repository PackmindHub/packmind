import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationAccessGuard } from './guards/organization-access.guard';
import { OrganizationsSpacesModule } from './spaces/spaces.module';
import { PackmindLogger, LogLevel } from '@packmind/shared';

/**
 * Root module for organization-scoped routes
 *
 * This module provides the foundation for organization-scoped API routing
 * using NestJS RouterModule for hierarchical path structure.
 *
 * The RouterModule configuration is done in AppModule to avoid circular
 * dependencies. This module defines the base controller and imports
 * child modules (spaces, etc.).
 *
 * Route hierarchy (configured via RouterModule in AppModule):
 * - /organizations/:orgId (OrganizationsController)
 *   - /spaces/:spaceId (OrganizationsSpacesModule)
 *     - /recipes (OrganizationsSpacesRecipesModule)
 *     - /standards (future)
 *
 * All routes are protected by OrganizationAccessGuard which validates
 * that the authenticated user has access to the requested organization.
 */
@Module({
  imports: [OrganizationsSpacesModule],
  controllers: [OrganizationsController],
  providers: [
    OrganizationAccessGuard,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger('OrganizationsModule', LogLevel.INFO),
    },
  ],
  exports: [OrganizationAccessGuard],
})
export class OrganizationsModule {}
