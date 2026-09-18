import { PackmindLogger } from '@packmind/logger';
import {
  IGetCurrentApiKeyUseCase,
  GetCurrentApiKeyCommand,
  GetCurrentApiKeyResponse,
} from '@packmind/types';

const origin = 'GetCurrentApiKeyUseCase';

export class GetCurrentApiKeyUseCase implements IGetCurrentApiKeyUseCase {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: GetCurrentApiKeyCommand,
  ): Promise<GetCurrentApiKeyResponse> {
    this.logger.info('Executing GetCurrentApiKeyUseCase', {
      userId: command.userId,
    });

    // API keys are stateless signed tokens with no persisted record, so there
    // is nothing to look up and this is always false.
    return {
      hasApiKey: false,
    };
  }
}
