import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StandardsService } from './standards.service';
import { standardsSchemas } from '@packmind/standards';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { RulesModule } from './rules/rules.module';

/**
 * Module that provides StandardsService for use by organization-scoped controllers.
 * The legacy StandardsController has been removed - use OrganizationsSpacesStandardsController instead.
 */
@Module({
  imports: [TypeOrmModule.forFeature(standardsSchemas), RulesModule],
  providers: [
    StandardsService,
    {
      provide: PackmindLogger,
      useFactory: () => new PackmindLogger('StandardsModule', LogLevel.INFO),
    },
  ],
  exports: [StandardsService],
})
export class StandardsModule {}
