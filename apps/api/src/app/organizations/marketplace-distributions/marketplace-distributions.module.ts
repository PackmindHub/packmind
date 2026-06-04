import { Module } from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { MarketplaceDistributionsController } from './marketplace-distributions.controller';

/**
 * NestJS module exposing organization-scoped marketplace publish status
 * routes.
 *
 * Routes are mounted under `/organizations/:orgId/marketplace-distributions`
 * by `RouterModule.register` in `AppModule`. No domain services are
 * registered here — `IDeploymentPort` is resolved via the shared
 * `HexaRegistry`.
 */
@Module({
  controllers: [MarketplaceDistributionsController],
  providers: [
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger(
          'OrganizationMarketplaceDistributionsModule',
          LogLevel.INFO,
        ),
    },
  ],
})
export class OrganizationMarketplaceDistributionsModule {}
