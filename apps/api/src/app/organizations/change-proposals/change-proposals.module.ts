import { Module } from '@nestjs/common';
import { OrganizationChangeProposalsController } from './change-proposals.controller';
import { OrganizationChangeProposalsService } from './change-proposals.service';
import { LogLevel, PackmindLogger } from '@packmind/logger';

/**
 * Module for organization-scoped change proposal routes
 *
 * This module is registered as a child of OrganizationsModule via RouterModule,
 * automatically inheriting the /organizations/:orgId path prefix.
 *
 * Handles organization-level change proposal operations.
 */
@Module({
  controllers: [OrganizationChangeProposalsController],
  providers: [
    OrganizationChangeProposalsService,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger('OrganizationChangeProposalsModule', LogLevel.INFO),
    },
  ],
  exports: [OrganizationChangeProposalsService],
})
export class OrganizationChangeProposalsModule {}
