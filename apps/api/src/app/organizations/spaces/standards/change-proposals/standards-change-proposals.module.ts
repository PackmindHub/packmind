import { Module } from '@nestjs/common';
import { OrganizationsSpacesStandardsChangeProposalsController } from './standards-change-proposals.controller';
import { StandardsChangeProposalsService } from './standards-change-proposals.service';
import { OrganizationAccessGuard } from '../../../guards/organization-access.guard';
import { SpaceAccessGuard } from '../../guards/space-access.guard';
import { PackmindLogger, LogLevel } from '@packmind/logger';

/**
 * Module for standard-scoped change proposal routes
 *
 * This module is registered as a child of OrganizationsSpacesStandardsModule via RouterModule,
 * automatically inheriting the /organizations/:orgId/spaces/:spaceId/standards/:standardId path prefix.
 */
@Module({
  controllers: [OrganizationsSpacesStandardsChangeProposalsController],
  providers: [
    StandardsChangeProposalsService,
    OrganizationAccessGuard,
    SpaceAccessGuard,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger(
          'OrganizationsSpacesStandardsChangeProposalsModule',
          LogLevel.INFO,
        ),
    },
  ],
})
export class OrganizationsSpacesStandardsChangeProposalsModule {}
