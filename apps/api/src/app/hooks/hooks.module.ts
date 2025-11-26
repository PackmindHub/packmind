import { Module } from '@nestjs/common';
import { HooksController } from './hooks.controller';
import { RecipesModule } from '../organizations/spaces/recipes/recipes.module';
import { PackmindLogger, LogLevel } from '@packmind/logger';

@Module({
  imports: [RecipesModule],
  controllers: [HooksController],
  providers: [
    {
      provide: PackmindLogger,
      useFactory: () => new PackmindLogger('HooksModule', LogLevel.INFO),
    },
  ],
})
export class HooksModule {}
