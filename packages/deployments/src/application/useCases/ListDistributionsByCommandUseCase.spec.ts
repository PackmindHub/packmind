import { mockInterface, stubLogger } from '@packmind/test-utils';
import {
  createCommandId,
  createOrganizationId,
  createUserId,
  ListDistributionsByCommandCommand,
  ListDistributionsByCommandResponse,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import { ListDistributionsByCommandUseCase } from './ListDistributionsByCommandUseCase';
import { distributionFactory } from '../../../test';

describe('ListDistributionsByCommandUseCase', () => {
  let useCase: ListDistributionsByCommandUseCase;
  let repository: jest.Mocked<IDistributionRepository>;

  const organizationId = createOrganizationId(uuidv4());

  const command: ListDistributionsByCommandCommand = {
    userId: createUserId(uuidv4()),
    organizationId,
    recipeId: createCommandId(uuidv4()),
  };

  beforeEach(() => {
    repository = mockInterface<IDistributionRepository>();
    useCase = new ListDistributionsByCommandUseCase(repository, stubLogger());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when the command has been distributed', () => {
    const history: ListDistributionsByCommandResponse = [
      distributionFactory({ organizationId }),
    ];
    let result: ListDistributionsByCommandResponse;

    beforeEach(async () => {
      repository.listByCommandId.mockResolvedValue(history);
      result = await useCase.execute(command);
    });

    it('returns the history the repository read', () => {
      expect(result).toEqual(history);
    });

    it('reads that command in that organization', () => {
      expect(repository.listByCommandId).toHaveBeenCalledWith(
        command.recipeId,
        command.organizationId,
      );
    });
  });

  describe('when the command was never distributed', () => {
    it('returns an empty history', async () => {
      repository.listByCommandId.mockResolvedValue([]);

      await expect(useCase.execute(command)).resolves.toEqual([]);
    });
  });

  describe('when the repository fails', () => {
    it('rethrows', async () => {
      repository.listByCommandId.mockRejectedValue(
        new Error('Repository error'),
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        'Repository error',
      );
    });
  });
});
