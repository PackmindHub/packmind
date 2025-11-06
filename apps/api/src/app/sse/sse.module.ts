import { Module } from '@nestjs/common';
import { SSEController } from './sse.controller';
import { SSEService } from './sse.service';
import { PackmindLogger } from '@packmind/logger';

@Module({
  controllers: [SSEController],
  providers: [
    SSEService,
    {
      provide: PackmindLogger,
      useFactory: () => new PackmindLogger('SSEModule'),
    },
  ],
  exports: [SSEService], // Export service so other modules can send events
})
export class SSEModule {}
