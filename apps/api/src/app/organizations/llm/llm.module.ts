import { Module } from '@nestjs/common';
import { LlmController } from './llm.controller';
import { LlmService } from './llm.service';
import { OrganizationAccessGuard } from '../guards/organization-access.guard';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { AuthModule } from '../../auth/auth.module';

/**
 * Module for organization-scoped LLM routes
 *
 * This module is registered as a child of OrganizationsModule via RouterModule,
 * automatically inheriting the /organizations/:orgId path prefix.
 *
 * The module provides LLM-related endpoints for testing connections and retrieving models.
 * OrganizationAccessGuard ensures proper access validation.
 */
@Module({
  imports: [AuthModule],
  controllers: [LlmController],
  providers: [
    LlmService,
    OrganizationAccessGuard,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger('OrganizationLlmModule', LogLevel.INFO),
    },
  ],
})
export class OrganizationLlmModule {}
