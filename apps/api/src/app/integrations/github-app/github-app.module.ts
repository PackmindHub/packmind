import { Module } from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { GitHubAppController } from './github-app.controller';
import { GitHubAppWebhookController } from './github-app-webhook.controller';
import { RecipesModule } from '../../organizations/spaces/recipes/recipes.module';

@Module({
  imports: [RecipesModule],
  controllers: [GitHubAppController, GitHubAppWebhookController],
  providers: [
    {
      provide: PackmindLogger,
      useFactory: () => new PackmindLogger('GitHubAppModule', LogLevel.INFO),
    },
  ],
})
export class GitHubAppModule {}
