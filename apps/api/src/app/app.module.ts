import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { RecipesModule } from './recipes/recipes.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HooksModule } from './hooks/hooks.module';
import { Configuration } from '@packmind/shared';
import { LogLevel, PackmindLogger } from '@packmind/shared';
import { recipesSchemas, RecipesHexa } from '@packmind/recipes';
import { accountsSchemas, AccountsHexa } from '@packmind/accounts';
import { gitSchemas, GitHexa } from '@packmind/git';
import { standardsSchemas, StandardsHexa } from '@packmind/standards';
import { CodingAgentHexa } from '@packmind/coding-agent';
import { deploymentsSchemas, DeploymentsHexa } from '@packmind/deployments';

import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './auth/auth.guard';
import { GitModule } from './git/git.module';
import { UsersModule } from './accounts/users/users.module';
import { OrganizationsModule } from './accounts/organizations/organizations.module';
import { StandardsModule } from './standards/standards.module';
import { McpModule } from './mcp/mcp.module';
import { HexaRegistryModule } from './shared/HexaRegistryModule';
import { DeploymentsController } from './deployments/deployments.controller';
import { DeploymentsModule } from './deployments/deployments.module';
import { SSEModule } from './sse/sse.module';
import { JobsHexa } from '@packmind/jobs';
import { LinterHexa } from '@packmind/linter';
import {
  RecipesUsageHexa,
  recipesUsageSchemas,
  AnalyticsModule,
} from '@packmind/analytics';

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
        ...standardsSchemas,
        ...deploymentsSchemas,
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
        AccountsHexa,
        GitHexa,
        RecipesHexa,
        RecipesUsageHexa,
        StandardsHexa,
        CodingAgentHexa,
        DeploymentsHexa,
        JobsHexa,
        LinterHexa,
      ],
    }),
    RecipesModule,
    StandardsModule,
    HooksModule,
    AuthModule,
    GitModule,
    UsersModule,
    OrganizationsModule,
    McpModule,
    AnalyticsModule,
    DeploymentsModule,
    SSEModule,
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
