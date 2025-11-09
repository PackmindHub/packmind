import { Module } from '@nestjs/common';
import { APP_GUARD, Reflector, RouterModule } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsHexa, accountsSchemas } from '@packmind/accounts';
import { CodingAgentHexa } from '@packmind/coding-agent';
import { DeploymentsHexa, deploymentsSchemas } from '@packmind/deployments';
import { GitHexa, gitSchemas } from '@packmind/git';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { Configuration } from '@packmind/node-utils';
import { RecipesHexa, recipesSchemas } from '@packmind/recipes';
import { SpacesHexa, spacesSchemas } from '@packmind/spaces';
import { StandardsHexa, standardsSchemas } from '@packmind/standards';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HooksModule } from './hooks/hooks.module';
import { RecipesModule } from './recipes/recipes.module';

import { AmplitudeModule } from '@packmind/amplitude';
import {
  AnalyticsHexa,
  AnalyticsModule,
  recipesUsageSchemas,
} from '@packmind/analytics';
import { JobsHexa } from '@packmind/jobs';
import { LinterHexa, LinterModule, linterSchemas } from '@packmind/linter';
import { OrganizationsModule as AccountsOrganizationsModule } from './accounts/organizations/organizations.module';
import { UsersModule } from './accounts/users/users.module';
import { AuthGuard } from './auth/auth.guard';
import { AuthModule } from './auth/auth.module';
import { DeploymentsController } from './deployments/deployments.controller';
import { DeploymentsModule } from './deployments/deployments.module';
import { GitModule } from './git/git.module';
import { McpModule } from './mcp/mcp.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { OrganizationsSpacesRecipesModule } from './organizations/spaces/recipes/recipes.module';
import { OrganizationsSpacesModule } from './organizations/spaces/spaces.module';
import { OrganizationsSpacesStandardsModule } from './organizations/spaces/standards/standards.module';
import { HexaRegistryModule } from './shared/HexaRegistryModule';
import { SSEModule } from './sse/sse.module';
import { StandardsModule } from './standards/standards.module';
import { TargetsModule } from './targets/targets.module';

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
    // AppRegistry integration - All domain apps (order matters for dependencies)
    HexaRegistryModule.register({
      hexas: [
        SpacesHexa, // Must come before AccountsHexa (AccountsHexa depends on SpacesHexa)
        AccountsHexa,
        JobsHexa,
        GitHexa,
        RecipesHexa,
        AnalyticsHexa,
        LinterHexa, // Must come before StandardsHexa (StandardsHexa depends on LinterHexa)
        StandardsHexa,
        CodingAgentHexa,
        DeploymentsHexa,
      ],
    }),
    RecipesModule,
    StandardsModule,
    HooksModule,
    AuthModule,
    GitModule,
    UsersModule,
    AccountsOrganizationsModule,
    OrganizationsModule,
    McpModule,
    AnalyticsModule,
    DeploymentsModule,
    TargetsModule,
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
            path: 'spaces',
            module: OrganizationsSpacesModule,
            children: [
              {
                path: ':spaceId/recipes',
                module: OrganizationsSpacesRecipesModule,
              },
              {
                path: ':spaceId/standards',
                module: OrganizationsSpacesStandardsModule,
              },
            ],
          },
        ],
      },
    ]),
  ],
  controllers: [AppController, DeploymentsController],
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
