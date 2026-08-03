import { Controller, Module } from '@nestjs/common';

@Controller()
export class MarketplacesController {}

@Module({
  imports: [],
  controllers: [MarketplacesController],
  providers: [],
})
export class OrganizationMarketplacesModule {}
