import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { HexaRegistry } from '@packmind/shared';
import { AccountsHexa } from '@packmind/accounts';
import { ApiKeyServiceProvider } from '../shared/ApiKeyServiceProvider';
import { HEXA_REGISTRY_TOKEN } from '../shared/HexaRegistryModule';

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [
    AuthService,
    ApiKeyServiceProvider,
    {
      provide: 'EnhancedAccountsHexa',
      useFactory: (
        registry: HexaRegistry,
        jwtService: JwtService,
        apiKeyServiceProvider: ApiKeyServiceProvider,
      ) => {
        const logger = new PackmindLogger('AccountsHexa', LogLevel.INFO);
        const apiKeyService = apiKeyServiceProvider.createApiKeyService(
          jwtService,
          logger,
        );
        return new AccountsHexa(registry, { logger, apiKeyService });
      },
      inject: [HEXA_REGISTRY_TOKEN, JwtService, ApiKeyServiceProvider],
    },
    {
      provide: PackmindLogger,
      useFactory: () => new PackmindLogger('AuthService', LogLevel.INFO),
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
