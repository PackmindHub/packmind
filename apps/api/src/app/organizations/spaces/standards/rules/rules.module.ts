import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsSpacesStandardsRulesController } from './rules.controller';
import { RulesService } from './rules.service';
import { OrganizationAccessGuard } from '../../../guards/organization-access.guard';
import { SpaceAccessGuard } from '../../guards/space-access.guard';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { standardsSchemas } from '@packmind/standards';

/**
 * Module for rules routes within space-scoped standards in organizations
 *
 * This module is registered as a child of OrganizationsSpacesStandardsModule via RouterModule,
 * automatically inheriting the /organizations/:orgId/spaces/:spaceId/standards/:standardId path prefix.
 *
 * Both OrganizationAccessGuard and SpaceAccessGuard are provided to ensure proper access validation.
 */
@Module({
  imports: [TypeOrmModule.forFeature(standardsSchemas)],
  controllers: [OrganizationsSpacesStandardsRulesController],
  providers: [
    RulesService,
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
