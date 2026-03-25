import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsSpacesStandardsController } from './standards.controller';
import { StandardsService } from './standards.service';
import { OrganizationAccessGuard } from '../../guards/organization-access.guard';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { OrganizationsSpacesStandardsRulesModule } from './rules/rules.module';
import { OrganizationsSpacesStandardsChangeProposalsModule } from '@packmind/playbook-change-management';
import { standardsSchemas } from '@packmind/standards';

/**
 * Module for space-scoped standard routes within organizations
 *
 * This module is registered as a child of OrganizationsSpacesModule via RouterModule,
 * automatically inheriting the /organizations/:orgId/spaces/:spaceId path prefix.
 *
 * The OrganizationsSpacesStandardsRulesModule is imported to enable nested rules routes.
 * OrganizationAccessGuard is provided to ensure proper access validation.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature(standardsSchemas),
    OrganizationsSpacesStandardsRulesModule,
    OrganizationsSpacesStandardsChangeProposalsModule,
  ],
  controllers: [OrganizationsSpacesStandardsController],
  providers: [
    StandardsService,
    OrganizationAccessGuard,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger('OrganizationsSpacesStandardsModule', LogLevel.INFO),
    },
  ],
  exports: [StandardsService],
})
export class OrganizationsSpacesStandardsModule {}
