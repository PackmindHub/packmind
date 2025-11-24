import { Module } from '@nestjs/common';
import { OrganizationGitProvidersModule } from './providers/git-providers.module';
import { OrganizationGitRepositoriesModule } from './repositories/git-repositories.module';

@Module({
  imports: [OrganizationGitProvidersModule, OrganizationGitRepositoriesModule],
})
export class OrganizationGitModule {}
