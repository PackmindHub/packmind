import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';
import { recipesSchemas } from '@packmind/recipes';
import { PackmindLogger, LogLevel } from '@packmind/shared';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature(recipesSchemas), AuthModule],
  controllers: [RecipesController],
  providers: [
    RecipesService,
    {
      provide: PackmindLogger,
      useFactory: () => new PackmindLogger('RecipesModule', LogLevel.INFO),
    },
  ],
  exports: [RecipesService], // Export RecipesService so it can be used by HooksModule
})
export class RecipesModule {}
