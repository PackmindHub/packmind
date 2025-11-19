import { createOrganizationId } from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { GetAiServiceForOrganizationUseCase } from './getAiServiceForOrganization.usecase';
import { OpenAIService } from '../../../infra/services/OpenAIService';

describe('GetAiServiceForOrganizationUseCase', () => {
  let useCase: GetAiServiceForOrganizationUseCase;

  beforeEach(() => {
    useCase = new GetAiServiceForOrganizationUseCase();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when called with valid organization ID', () => {
      it('returns an AIService instance', async () => {
        const organizationId = createOrganizationId(uuidv4());

        const result = await useCase.execute({ organizationId });

        expect(result).toBeDefined();
        expect(result.aiService).toBeDefined();
      });

      it('returns an OpenAIService instance', async () => {
        const organizationId = createOrganizationId(uuidv4());

        const result = await useCase.execute({ organizationId });

        expect(result.aiService).toBeInstanceOf(OpenAIService);
      });

      it('returns a new instance on each call', async () => {
        const organizationId = createOrganizationId(uuidv4());

        const result1 = await useCase.execute({ organizationId });
        const result2 = await useCase.execute({ organizationId });

        expect(result1.aiService).not.toBe(result2.aiService);
      });
    });
  });
});
