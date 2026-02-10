import { Module } from '@nestjs/common';
import { OrganizationsSpacesChangeProposalsController } from './change-proposals.controller';
import { ChangeProposalsService } from './change-proposals.service';
import { OrganizationAccessGuard } from '../../guards/organization-access.guard';
import { SpaceAccessGuard } from '../guards/space-access.guard';
import { PackmindLogger, LogLevel } from '@packmind/logger';

/**
 * Module for space-scoped change proposal routes within organizations
 *
 * This module is registered as a child of OrganizationsSpacesModule via RouterModule,
 * automatically inheriting the /organizations/:orgId/spaces/:spaceId path prefix.
 *
 * Both OrganizationAccessGuard and SpaceAccessGuard are provided to ensure proper access validation.
 */
@Module({
  controllers: [OrganizationsSpacesChangeProposalsController],
  providers: [
    ChangeProposalsService,
    OrganizationAccessGuard,
    SpaceAccessGuard,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger(
          'OrganizationsSpacesChangeProposalsModule',
          LogLevel.INFO,
        ),
    },
  ],
  exports: [ChangeProposalsService],
})
export class OrganizationsSpacesChangeProposalsModule {}
