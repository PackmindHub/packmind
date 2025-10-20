import { Module } from '@nestjs/common';
import { LinterController } from './linter.controller';
import { LinterService } from './linter.service';

@Module({
  imports: [],
  controllers: [LinterController],
  providers: [LinterService],
})
export class LinterModule {}
