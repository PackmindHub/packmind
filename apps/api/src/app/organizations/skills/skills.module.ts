import { Module } from '@nestjs/common';
import { OrganizationSkillsController } from './skills.controller';
import { OrganizationSkillsService } from './skills.service';
import { LogLevel, PackmindLogger } from '@packmind/logger';

/**
 * Module for organization-scoped skill routes
 *
 * This module is registered as a child of OrganizationsModule via RouterModule,
 * automatically inheriting the /organizations/:orgId path prefix.
 *
 * Handles organization-level skill operations like deploying default skills.
 */
@Module({
  controllers: [OrganizationSkillsController],
  providers: [
    OrganizationSkillsService,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger('OrganizationSkillsModule', LogLevel.INFO),
    },
  ],
  exports: [OrganizationSkillsService],
})
export class OrganizationSkillsModule {}
