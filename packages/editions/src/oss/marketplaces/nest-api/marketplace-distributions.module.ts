import { Controller, Module } from '@nestjs/common';

@Controller()
export class MarketplaceDistributionsController {}

@Module({
  imports: [],
  controllers: [MarketplaceDistributionsController],
  providers: [],
})
export class OrganizationMarketplaceDistributionsModule {}
