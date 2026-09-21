import { mockInterface, stubLogger } from '@packmind/test-utils';
import {
  createStandardId,
  createOrganizationId,
  createUserId,
  ListDistributionsByStandardCommand,
  ListDistributionsByStandardResponse,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import { ListDistributionsByStandardUseCase } from './ListDistributionsByStandardUseCase';
import { distributionFactory } from '../../../test';

describe('ListDistributionsByStandardUseCase', () => {
  let useCase: ListDistributionsByStandardUseCase;
  let repository: jest.Mocked<IDistributionRepository>;

  const organizationId = createOrganizationId(uuidv4());

  const command: ListDistributionsByStandardCommand = {
    userId: createUserId(uuidv4()),
    organizationId,
    standardId: createStandardId(uuidv4()),
  };

  beforeEach(() => {
    repository = mockInterface<IDistributionRepository>();
    useCase = new ListDistributionsByStandardUseCase(repository, stubLogger());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when the standard has been distributed', () => {
    const history: ListDistributionsByStandardResponse = [
      distributionFactory({ organizationId }),
    ];
    let result: ListDistributionsByStandardResponse;

    beforeEach(async () => {
      repository.listByStandardId.mockResolvedValue(history);
      result = await useCase.execute(command);
    });

    it('returns the history the repository read', () => {
      expect(result).toEqual(history);
    });

    it('reads that standard in that organization', () => {
      expect(repository.listByStandardId).toHaveBeenCalledWith(
        command.standardId,
        command.organizationId,
      );
    });
  });

  describe('when the standard was never distributed', () => {
    it('returns an empty history', async () => {
      repository.listByStandardId.mockResolvedValue([]);

      await expect(useCase.execute(command)).resolves.toEqual([]);
    });
  });

  describe('when the repository fails', () => {
    it('rethrows', async () => {
      repository.listByStandardId.mockRejectedValue(
        new Error('Repository error'),
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        'Repository error',
      );
    });
  });
});
