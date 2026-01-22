import { Module } from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { PublicSkillsController } from './skills.controller';
import { PublicSkillsService } from './skills.service';

/**
 * Module for public skill routes (no authentication required)
 *
 * Provides endpoints to download default skills for specific coding agents
 * without requiring user authentication.
 */
@Module({
  controllers: [PublicSkillsController],
  providers: [
    PublicSkillsService,
    {
      provide: PackmindLogger,
      useFactory: () => new PackmindLogger('PublicSkillsModule', LogLevel.INFO),
    },
  ],
  exports: [PublicSkillsService],
})
export class PublicSkillsModule {}
