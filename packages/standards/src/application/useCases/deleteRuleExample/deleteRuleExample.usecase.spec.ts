import { OrganizationId, UserId } from '@packmind/accounts';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { RuleExampleId } from '@packmind/types';
import { ruleExampleFactory } from '../../../../test';
import { IRuleExampleRepository } from '../../../domain/repositories/IRuleExampleRepository';
import { IStandardsRepositories } from '../../../domain/repositories/IStandardsRepositories';
import { DeleteRuleExampleUsecase } from './deleteRuleExample.usecase';

describe('DeleteRuleExampleUsecase', () => {
  let usecase: DeleteRuleExampleUsecase;
  let repositories: jest.Mocked<IStandardsRepositories>;
  let ruleExampleRepository: jest.Mocked<IRuleExampleRepository>;
  let logger: PackmindLogger;

  const mockUserId = 'user-123' as UserId;
  const mockOrganizationId = 'org-123' as OrganizationId;

  const createCommand = (props: { ruleExampleId: RuleExampleId }) => ({
    ...props,
    userId: mockUserId,
    organizationId: mockOrganizationId,
  });

  beforeEach(() => {
    ruleExampleRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      updateById: jest.fn(),
      findByRuleId: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
    };

    repositories = {
      getRuleExampleRepository: jest
        .fn()
        .mockReturnValue(ruleExampleRepository),
      getStandardRepository: jest.fn(),
      getStandardVersionRepository: jest.fn(),
      getRuleRepository: jest.fn(),
      getDetectionProgramRepository: jest.fn(),
      getActiveDetectionProgramRepository: jest.fn(),
    } as jest.Mocked<IStandardsRepositories>;

    logger = stubLogger();

    usecase = new DeleteRuleExampleUsecase(repositories, undefined, logger);
  });

  it('deletes a rule example successfully', async () => {
    const existingExample = ruleExampleFactory();

    ruleExampleRepository.findById.mockResolvedValue(existingExample);
    ruleExampleRepository.deleteById.mockResolvedValue(undefined);

    const command = createCommand({
      ruleExampleId: existingExample.id,
    });

    await usecase.execute(command);

    expect(ruleExampleRepository.findById).toHaveBeenCalledWith(
      existingExample.id,
    );
    expect(ruleExampleRepository.deleteById).toHaveBeenCalledWith(
      existingExample.id,
    );
  });

  describe('when rule example does not exist', () => {
    it('throws an error', async () => {
      ruleExampleRepository.findById.mockResolvedValue(null);

      const command = createCommand({
        ruleExampleId: 'non-existent-id' as RuleExampleId,
      });

      await expect(usecase.execute(command)).rejects.toThrow(
        'Rule example with id non-existent-id not found',
      );
      expect(ruleExampleRepository.findById).toHaveBeenCalledWith(
        'non-existent-id',
      );
      expect(ruleExampleRepository.deleteById).not.toHaveBeenCalled();
    });
  });
});
