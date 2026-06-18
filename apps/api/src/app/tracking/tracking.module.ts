import { Module } from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { TrackingController } from './tracking.controller';
import { TrackingRateLimitGuard } from './tracking-rate-limit.guard';

/**
 * NestJS module exposing the public plugin-install tracking endpoint.
 *
 * Route: `POST /tracking/plugin-installs`
 *
 * Registered at top level (not under `organizations/:orgId`) via
 * `RouterModule.register` in `AppModule` at path `'tracking'`.
 *
 * No domain services are registered here — `IDeploymentPort` is resolved
 * via the shared `HexaRegistry`. The global `JwtModule` (registered in
 * `AppModule`) is available to all modules and is used here to instantiate
 * `ApiKeyService` for optional verified-user attribution.
 */
@Module({
  controllers: [TrackingController],
  providers: [
    TrackingRateLimitGuard,
    {
      provide: PackmindLogger,
      useFactory: () => new PackmindLogger('TrackingModule', LogLevel.INFO),
    },
  ],
})
export class TrackingModule {}
