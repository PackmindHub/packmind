import { Module } from '@nestjs/common';
import { OrganizationsSpacesStandardsController } from './standards.controller';
import { StandardsModule } from '../../../standards/standards.module';
import { OrganizationAccessGuard } from '../../guards/organization-access.guard';
import { SpaceAccessGuard } from '../guards/space-access.guard';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { OrganizationsSpacesStandardsRulesModule } from './rules/rules.module';

/**
 * Module for space-scoped standard routes within organizations
 *
 * This module is registered as a child of OrganizationsSpacesModule via RouterModule,
 * automatically inheriting the /organizations/:orgId/spaces/:spaceId path prefix.
 *
 * The StandardsModule is imported to provide access to StandardsService.
 * The OrganizationsSpacesStandardsRulesModule is imported to enable nested rules routes.
 * Both OrganizationAccessGuard and SpaceAccessGuard are provided to ensure proper access validation.
 */
@Module({
  imports: [StandardsModule, OrganizationsSpacesStandardsRulesModule],
  controllers: [OrganizationsSpacesStandardsController],
  providers: [
    OrganizationAccessGuard,
    SpaceAccessGuard,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger('OrganizationsSpacesStandardsModule', LogLevel.INFO),
    },
  ],
})
export class OrganizationsSpacesStandardsModule {}
