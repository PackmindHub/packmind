import { Module } from '@nestjs/common';
import { OrganizationsSpacesPackagesController } from './packages.controller';
import { DeploymentsModule } from '../../../deployments/deployments.module';
import { OrganizationAccessGuard } from '../../guards/organization-access.guard';
import { SpaceAccessGuard } from '../guards/space-access.guard';
import { PackmindLogger, LogLevel } from '@packmind/logger';

/**
 * Module for space-scoped package routes within organizations
 *
 * This module is registered as a child of OrganizationsSpacesModule via RouterModule,
 * automatically inheriting the /organizations/:orgId/spaces/:spaceId path prefix.
 *
 * The DeploymentsModule is imported to provide access to DeploymentsService.
 * Both OrganizationAccessGuard and SpaceAccessGuard are provided to ensure proper access validation.
 */
@Module({
  imports: [DeploymentsModule],
  controllers: [OrganizationsSpacesPackagesController],
  providers: [
    OrganizationAccessGuard,
    SpaceAccessGuard,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger('OrganizationsSpacesPackagesModule', LogLevel.INFO),
    },
  ],
})
export class OrganizationsSpacesPackagesModule {}
