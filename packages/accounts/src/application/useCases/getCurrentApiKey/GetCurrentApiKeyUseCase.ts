import { PackmindLogger } from '@packmind/logger';
import {
  IGetCurrentApiKeyUseCase,
  GetCurrentApiKeyCommand,
  GetCurrentApiKeyResponse,
} from '@packmind/types';

export class GetCurrentApiKeyUseCase implements IGetCurrentApiKeyUseCase {
  constructor(private readonly logger: PackmindLogger) {}

  async execute(
    command: GetCurrentApiKeyCommand,
  ): Promise<GetCurrentApiKeyResponse> {
    this.logger.info('Executing GetCurrentApiKeyUseCase', {
      userId: command.userId,
    });

    // For now, this is a simplified implementation since we don't store API keys
    // In a full implementation, you might want to track issued keys and their expiration
    // This could involve storing API key metadata in the database

    return {
      hasApiKey: false, // We don't track existing keys in this simplified version
    };
  }
}
