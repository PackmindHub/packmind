import { Module } from '@nestjs/common';
import { APP_GUARD, Reflector, RouterModule } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsHexa, accountsSchemas } from '@packmind/accounts';
import { CodingAgentHexa } from '@packmind/coding-agent';
import { DeploymentsHexa, deploymentsSchemas } from '@packmind/deployments';
import { GitHexa, gitSchemas } from '@packmind/git';
import { llmSchemas } from '@packmind/llm';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { Configuration } from '@packmind/node-utils';
import { RecipesHexa, recipesSchemas } from '@packmind/recipes';
import { SpacesHexa, spacesSchemas } from '@packmind/spaces';
import { StandardsHexa, standardsSchemas } from '@packmind/standards';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HooksModule } from './hooks/hooks.module';

import { AmplitudeModule } from '@packmind/amplitude';
import {
  AnalyticsHexa,
  AnalyticsModule,
  recipesUsageSchemas,
} from '@packmind/analytics';
import { LinterHexa, LinterModule, linterSchemas } from '@packmind/linter';
import { JobsService } from '@packmind/node-utils';
import { OrganizationsModule as AccountsOrganizationsModule } from './accounts/organizations/organizations.module';
import { AuthGuard } from './auth/auth.guard';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { RecipesModule } from './organizations/spaces/recipes/recipes.module';
import { OrganizationsSpacesModule } from './organizations/spaces/spaces.module';
import { OrganizationsSpacesStandardsModule } from './organizations/spaces/standards/standards.module';
import { OrganizationsSpacesStandardsRulesModule } from './organizations/spaces/standards/rules/rules.module';
import { OrganizationsSpacesPackagesModule } from './organizations/spaces/packages/packages.module';
import { OrganizationsUsersModule } from './organizations/users/users.module';
import { OrganizationDeploymentsModule } from './organizations/deployments/deployments.module';
import { OrganizationTargetsModule } from './organizations/deployments/targets/targets.module';
import { OrganizationGitModule } from './organizations/git/git.module';
import { OrganizationGitProvidersModule } from './organizations/git/providers/git-providers.module';
import { OrganizationGitRepositoriesModule } from './organizations/git/repositories/git-repositories.module';
import { OrganizationLlmModule } from './organizations/llm/llm.module';
import { OrganizationMcpModule } from './organizations/mcp/mcp.module';
import { HexaRegistryModule } from './shared/HexaRegistryModule';
import { SSEModule } from './sse/sse.module';

const logger = new PackmindLogger('AppModule', LogLevel.INFO);

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [
        ...recipesSchemas,
        ...recipesUsageSchemas,
        ...gitSchemas,
        ...accountsSchemas,
        ...spacesSchemas,
        ...standardsSchemas,
        ...deploymentsSchemas,
        ...linterSchemas,
        ...llmSchemas,
      ],
      logging: false,
      synchronize: false,
    }),
    JwtModule.registerAsync({
      global: true, // Make JWT module global so other modules don't need to re-register it
      useFactory: async () => {
        const secret = await Configuration.getConfig(
          'API_JWT_SECRET_KEY',
          process.env,
          logger,
        );
        return {
          secret: secret || 'fallback-secret-for-development',
          signOptions: {
            expiresIn: '30d',
            issuer: 'packmind',
          },
        };
      },
    }),
    // AppRegistry integration - All domain apps and infrastructure services (order matters for dependencies)
    HexaRegistryModule.register({
      hexas: [
        SpacesHexa, // Must come before AccountsHexa (AccountsHexa depends on SpacesHexa)
        AccountsHexa,
        GitHexa,
        RecipesHexa,
        AnalyticsHexa,
        LinterHexa, // Must come before StandardsHexa (StandardsHexa depends on LinterHexa)
        StandardsHexa,
        CodingAgentHexa,
        DeploymentsHexa,
      ],
      services: [
        JobsService, // Infrastructure service for background jobs
      ],
    }),
    HooksModule,
    AuthModule,
    AccountsOrganizationsModule,
    OrganizationsModule,
    AnalyticsModule,
    SSEModule,
    AmplitudeModule,
    LinterModule,
    // RouterModule configuration for organization-scoped routes
    // This must come after OrganizationsModule and its child modules are imported
    RouterModule.register([
      {
        path: 'organizations/:orgId',
        module: OrganizationsModule,
        children: [
          {
            path: 'users',
            module: OrganizationsUsersModule,
          },
          {
            path: 'mcp',
            module: OrganizationMcpModule,
          },
          {
            path: 'deployments',
            module: OrganizationDeploymentsModule,
            children: [
              {
                path: 'targets',
                module: OrganizationTargetsModule,
              },
            ],
          },
          {
            path: 'git',
            module: OrganizationGitModule,
            children: [
              {
                path: 'providers',
                module: OrganizationGitProvidersModule,
              },
              {
                path: 'repositories',
                module: OrganizationGitRepositoriesModule,
              },
            ],
          },
          {
            path: 'llm',
            module: OrganizationLlmModule,
          },
          {
            path: 'spaces',
            module: OrganizationsSpacesModule,
            children: [
              {
                path: ':spaceId/recipes',
                module: RecipesModule,
              },
              {
                path: ':spaceId/standards',
                module: OrganizationsSpacesStandardsModule,
                children: [
                  {
                    path: ':standardId/rules',
                    module: OrganizationsSpacesStandardsRulesModule,
                  },
                ],
              },
              {
                path: ':spaceId/packages',
                module: OrganizationsSpacesPackagesModule,
              },
            ],
          },
        ],
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    Reflector,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: PackmindLogger,
      useFactory: () => new PackmindLogger('AppController', LogLevel.INFO),
    },
  ],
})
export class AppModule {}
