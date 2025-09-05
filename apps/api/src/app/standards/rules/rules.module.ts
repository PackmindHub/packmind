import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RulesController } from './rules.controller';
import { RulesService } from './rules.service';
import { standardsSchemas } from '@packmind/standards';
import { PackmindLogger, LogLevel } from '@packmind/shared';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature(standardsSchemas), AuthModule],
  controllers: [RulesController],
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
