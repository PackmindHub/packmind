import { Module } from '@nestjs/common';
import { GitProvidersModule } from './providers/git-providers.module';
import { GitRepositoriesModule } from './repositories/git-repositories.module';

@Module({
  imports: [GitProvidersModule, GitRepositoriesModule],
  exports: [GitProvidersModule, GitRepositoriesModule],
})
export class GitModule {}
