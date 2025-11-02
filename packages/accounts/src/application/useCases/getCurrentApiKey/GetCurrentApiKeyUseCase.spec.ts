import { PackmindLogger } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';
import { GetCurrentApiKeyUseCase } from './GetCurrentApiKeyUseCase';
import { createUserId } from '../../../domain/entities/User';
import { GetCurrentApiKeyCommand } from '@packmind/shared';

describe('GetCurrentApiKeyUseCase', () => {
  let getCurrentApiKeyUseCase: GetCurrentApiKeyUseCase;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    stubbedLogger = stubLogger();

    getCurrentApiKeyUseCase = new GetCurrentApiKeyUseCase(stubbedLogger);
  });

  describe('execute', () => {
    it('returns simplified API key status', async () => {
      const userId = createUserId('user-123');
      const command: GetCurrentApiKeyCommand = {
        userId,
      };

      const result = await getCurrentApiKeyUseCase.execute(command);

      expect(result).toEqual({
        hasApiKey: false,
      });
    });
  });
});
