import { Module } from '@nestjs/common';
import { OrganizationsSpacesStandardsRulesController } from './rules.controller';
import { RulesModule } from '../../../../standards/rules/rules.module';
import { StandardsModule } from '../../../../standards/standards.module';
import { OrganizationAccessGuard } from '../../../guards/organization-access.guard';
import { SpaceAccessGuard } from '../../guards/space-access.guard';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { AuthModule } from '../../../../auth/auth.module';

/**
 * Module for rules routes within space-scoped standards in organizations
 *
 * This module is registered as a child of OrganizationsSpacesStandardsModule via RouterModule,
 * automatically inheriting the /organizations/:orgId/spaces/:spaceId/standards/:standardId path prefix.
 *
 * The RulesModule is imported to provide access to RulesService.
 * The StandardsModule is imported to provide access to StandardsService for validation.
 * Both OrganizationAccessGuard and SpaceAccessGuard are provided to ensure proper access validation.
 */
@Module({
  imports: [RulesModule, StandardsModule, AuthModule],
  controllers: [OrganizationsSpacesStandardsRulesController],
  providers: [
    OrganizationAccessGuard,
    SpaceAccessGuard,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger(
          'OrganizationsSpacesStandardsRulesModule',
          LogLevel.INFO,
        ),
    },
  ],
})
export class OrganizationsSpacesStandardsRulesModule {}
