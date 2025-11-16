import { Module } from '@nestjs/common';
import { OrganizationsSpacesLearningsController } from './learnings.controller';
import { LearningsModule } from '@packmind/learnings';
import { OrganizationAccessGuard } from '../../guards/organization-access.guard';
import { SpaceAccessGuard } from '../guards/space-access.guard';
import { PackmindLogger, LogLevel } from '@packmind/logger';

/**
 * Module for space-scoped learnings routes within organizations
 *
 * This module is registered as a child of OrganizationsSpacesModule via RouterModule,
 * automatically inheriting the /organizations/:orgId/spaces/:spaceId path prefix.
 *
 * The LearningsModule is imported to provide access to LearningsHexa.
 * Both OrganizationAccessGuard and SpaceAccessGuard are provided to ensure proper access validation.
 */
@Module({
  imports: [LearningsModule],
  controllers: [OrganizationsSpacesLearningsController],
  providers: [
    OrganizationAccessGuard,
    SpaceAccessGuard,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger('OrganizationsSpacesLearningsModule', LogLevel.INFO),
    },
  ],
})
export class OrganizationsSpacesLearningsModule {}
