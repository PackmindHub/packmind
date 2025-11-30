import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RulesService } from './rules.service';
import { standardsSchemas } from '@packmind/standards';
import { PackmindLogger, LogLevel } from '@packmind/logger';

/**
 * Module that provides RulesService for use by organization-scoped controllers.
 * The legacy RulesController has been removed - use OrganizationsSpacesStandardsRulesController instead.
 */
@Module({
  imports: [TypeOrmModule.forFeature(standardsSchemas)],
  providers: [
    RulesService,
    {
      provide: PackmindLogger,
      useFactory: () => new PackmindLogger('RulesModule', LogLevel.INFO),
    },
  ],
  exports: [RulesService],
})
export class RulesModule {}
