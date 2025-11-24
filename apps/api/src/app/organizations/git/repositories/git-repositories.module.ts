import { Module } from '@nestjs/common';
import { GitRepositoriesController } from './git-repositories.controller';
import { GitRepositoriesService } from './git-repositories.service';
import { LogLevel, PackmindLogger } from '@packmind/logger';

@Module({
  controllers: [GitRepositoriesController],
  providers: [
    GitRepositoriesService,
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger('OrganizationGitRepositoriesModule', LogLevel.INFO),
    },
  ],
  exports: [GitRepositoriesService],
})
export class OrganizationGitRepositoriesModule {}
