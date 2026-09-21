import { mockInterface, stubLogger } from '@packmind/test-utils';
import {
  createSkillId,
  createOrganizationId,
  createUserId,
  ListDistributionsBySkillCommand,
  ListDistributionsBySkillResponse,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import { ListDistributionsBySkillUseCase } from './ListDistributionsBySkillUseCase';
import { distributionFactory } from '../../../test';

describe('ListDistributionsBySkillUseCase', () => {
  let useCase: ListDistributionsBySkillUseCase;
  let repository: jest.Mocked<IDistributionRepository>;

  const organizationId = createOrganizationId(uuidv4());

  const command: ListDistributionsBySkillCommand = {
    userId: createUserId(uuidv4()),
    organizationId,
    skillId: createSkillId(uuidv4()),
  };

  beforeEach(() => {
    repository = mockInterface<IDistributionRepository>();
    useCase = new ListDistributionsBySkillUseCase(repository, stubLogger());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when the skill has been distributed', () => {
    const history: ListDistributionsBySkillResponse = [
      distributionFactory({ organizationId }),
    ];
    let result: ListDistributionsBySkillResponse;

    beforeEach(async () => {
      repository.listBySkillId.mockResolvedValue(history);
      result = await useCase.execute(command);
    });

    it('returns the history the repository read', () => {
      expect(result).toEqual(history);
    });

    it('reads that skill in that organization', () => {
      expect(repository.listBySkillId).toHaveBeenCalledWith(
        command.skillId,
        command.organizationId,
      );
    });
  });

  describe('when the skill was never distributed', () => {
    it('returns an empty history', async () => {
      repository.listBySkillId.mockResolvedValue([]);

      await expect(useCase.execute(command)).resolves.toEqual([]);
    });
  });

  describe('when the repository fails', () => {
    it('rethrows', async () => {
      repository.listBySkillId.mockRejectedValue(new Error('Repository error'));

      await expect(useCase.execute(command)).rejects.toThrow(
        'Repository error',
      );
    });
  });
});
