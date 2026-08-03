import { Controller, Module } from '@nestjs/common';

@Controller()
export class TrackingController {}

@Module({
  imports: [],
  controllers: [TrackingController],
  providers: [],
})
export class TrackingModule {}
