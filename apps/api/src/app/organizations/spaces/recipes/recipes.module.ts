import { Module } from '@nestjs/common';
import { OrganizationsSpacesRecipesController } from './recipes.controller';
import { RecipesModule } from '../../../recipes/recipes.module';
import { OrganizationAccessGuard } from '../../guards/organization-access.guard';
import { SpaceAccessGuard } from '../guards/space-access.guard';
import { PackmindLogger, LogLevel } from '@packmind/shared';

/**
 * Module for space-scoped recipe routes within organizations
 *
 * This module is registered as a child of OrganizationsSpacesModule via RouterModule,
 * automatically inheriting the /organizations/:orgId/spaces/:spaceId path prefix.
 *
 * The RecipesModule is imported to provide access to RecipesService.
 * Both OrganizationAccessGuard and SpaceAccessGuard are provided to ensure proper access validation.
 */
@Module({
  imports: [RecipesModule],
  controllers: [OrganizationsSpacesRecipesController],
  providers: [
    OrganizationAccessGuard,
    SpaceAccessGuard,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger('OrganizationsSpacesRecipesModule', LogLevel.INFO),
    },
  ],
})
export class OrganizationsSpacesRecipesModule {}
