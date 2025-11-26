import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { recipesSchemas } from '@packmind/recipes';
import { OrganizationsSpacesRecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';
import { OrganizationAccessGuard } from '../../guards/organization-access.guard';
import { SpaceAccessGuard } from '../guards/space-access.guard';
import { PackmindLogger, LogLevel } from '@packmind/logger';

/**
 * Module for space-scoped recipe routes within organizations
 *
 * This module is registered as a child of OrganizationsSpacesModule via RouterModule,
 * automatically inheriting the /organizations/:orgId/spaces/:spaceId path prefix.
 *
 * Both OrganizationAccessGuard and SpaceAccessGuard are provided to ensure proper access validation.
 */
@Module({
  imports: [TypeOrmModule.forFeature(recipesSchemas)],
  controllers: [OrganizationsSpacesRecipesController],
  providers: [
    RecipesService,
    OrganizationAccessGuard,
    SpaceAccessGuard,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger('OrganizationsSpacesRecipesModule', LogLevel.INFO),
    },
  ],
  exports: [RecipesService],
})
export class RecipesModule {}
