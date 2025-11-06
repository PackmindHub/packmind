import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StandardsController } from './standards.controller';
import { StandardsService } from './standards.service';
import { standardsSchemas } from '@packmind/standards';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { AuthModule } from '../auth/auth.module';
import { RulesModule } from './rules/rules.module';

@Module({
  imports: [
    TypeOrmModule.forFeature(standardsSchemas),
    AuthModule,
    RulesModule,
  ],
  controllers: [StandardsController],
  providers: [
    StandardsService,
    {
      provide: PackmindLogger,
      useFactory: () => new PackmindLogger('StandardsModule', LogLevel.INFO),
    },
  ],
  exports: [StandardsService], // Export StandardsService so it can be used by other modules
})
export class StandardsModule {}
