import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { learningsSchemas } from './index';
import { PackmindLogger, LogLevel } from '@packmind/logger';

@Module({
  imports: [TypeOrmModule.forFeature(learningsSchemas)],
  providers: [
    {
      provide: PackmindLogger,
      useFactory: () => new PackmindLogger('LearningsModule', LogLevel.INFO),
    },
  ],
  exports: [],
})
export class LearningsModule {}
