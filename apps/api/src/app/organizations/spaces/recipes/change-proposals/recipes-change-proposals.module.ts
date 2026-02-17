import { Module } from '@nestjs/common';
import { OrganizationsSpacesRecipesChangeProposalsController } from './recipes-change-proposals.controller';
import { RecipesChangeProposalsService } from './recipes-change-proposals.service';
import { OrganizationAccessGuard } from '../../../guards/organization-access.guard';
import { SpaceAccessGuard } from '../../guards/space-access.guard';
import { PackmindLogger, LogLevel } from '@packmind/logger';

/**
 * Module for recipe-scoped change proposal routes
 *
 * This module is registered as a child of OrganizationsSpacesRecipesModule via RouterModule,
 * automatically inheriting the /organizations/:orgId/spaces/:spaceId/recipes/:recipeId path prefix.
 */
@Module({
  controllers: [OrganizationsSpacesRecipesChangeProposalsController],
  providers: [
    RecipesChangeProposalsService,
    OrganizationAccessGuard,
    SpaceAccessGuard,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger(
          'OrganizationsSpacesRecipesChangeProposalsModule',
          LogLevel.INFO,
        ),
    },
  ],
})
export class OrganizationsSpacesRecipesChangeProposalsModule {}
