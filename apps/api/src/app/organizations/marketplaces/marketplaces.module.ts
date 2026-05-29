import { Module } from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { MarketplacesController } from './marketplaces.controller';

/**
 * NestJS module exposing organization-scoped marketplace routes.
 *
 * Routes are mounted under `/organizations/:orgId/marketplaces` by
 * `RouterModule.register` in `AppModule`. No domain services are registered
 * here — `IDeploymentPort` is resolved via the shared `HexaRegistry`.
 */
@Module({
  controllers: [MarketplacesController],
  providers: [
    {
      provide: PackmindLogger,
      useFactory: () =>
        new PackmindLogger('OrganizationMarketplacesModule', LogLevel.INFO),
    },
  ],
})
export class OrganizationMarketplacesModule {}
