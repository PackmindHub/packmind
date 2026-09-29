import { Module } from '@nestjs/common';
import { SSEController } from './sse.controller';
import { SSEService } from './sse.service';
import { SSESubscriptionAuthorizer } from '@packmind/node-utils';
import { ISpacesPort } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { SPACES_ADAPTER_TOKEN } from '../shared/HexaRegistryModule';

@Module({
  controllers: [SSEController],
  providers: [
    SSEService,
    {
      provide: SSESubscriptionAuthorizer,
      inject: [SPACES_ADAPTER_TOKEN],
      useFactory: (spacesPort: ISpacesPort) =>
        new SSESubscriptionAuthorizer(
          spacesPort,
          new PackmindLogger('SSESubscriptionAuthorizer'),
        ),
    },
    {
      provide: PackmindLogger,
      useFactory: () => new PackmindLogger('SSEModule'),
    },
  ],
  exports: [SSEService], // Export service so other modules can send events
})
export class SSEModule {}
