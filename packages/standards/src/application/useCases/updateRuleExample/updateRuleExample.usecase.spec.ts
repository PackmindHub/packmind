import {
  PackmindLogger,
  ProgrammingLanguage,
  RuleExampleId,
} from '@packmind/shared';
import { OrganizationId, UserId } from '@packmind/accounts';
import { stubLogger } from '@packmind/shared/test';
import { UpdateRuleExampleUsecase } from './updateRuleExample.usecase';
import { IStandardsRepositories } from '../../../domain/repositories/IStandardsRepositories';
import { IRuleExampleRepository } from '../../../domain/repositories/IRuleExampleRepository';
import { ruleExampleFactory } from '../../../../test';

describe('UpdateRuleExampleUsecase', () => {
  let usecase: UpdateRuleExampleUsecase;
  let repositories: jest.Mocked<IStandardsRepositories>;
  let ruleExampleRepository: jest.Mocked<IRuleExampleRepository>;
  let logger: PackmindLogger;

  const mockUserId = 'user-123' as UserId;
  const mockOrganizationId = 'org-123' as OrganizationId;

  const createCommand = (props: {
    ruleExampleId: RuleExampleId;
    lang?: ProgrammingLanguage;
    positive?: string;
    negative?: string;
  }) => ({
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

    usecase = new UpdateRuleExampleUsecase(repositories, logger);
  });

  it('updates a rule example successfully', async () => {
    const existingExample = ruleExampleFactory();
    const updatedExample = {
      ...existingExample,
      lang: ProgrammingLanguage.JAVASCRIPT,
      positive: 'updated positive',
      negative: 'updated negative',
    };

    ruleExampleRepository.findById.mockResolvedValue(existingExample);
    ruleExampleRepository.updateById.mockResolvedValue(updatedExample);

    const command = createCommand({
      ruleExampleId: existingExample.id,
      lang: ProgrammingLanguage.JAVASCRIPT,
      positive: 'updated positive',
      negative: 'updated negative',
    });

    const result = await usecase.execute(command);

    expect(ruleExampleRepository.findById).toHaveBeenCalledWith(
      existingExample.id,
    );
    expect(ruleExampleRepository.updateById).toHaveBeenCalledWith(
      existingExample.id,
      {
        lang: ProgrammingLanguage.JAVASCRIPT,
        positive: 'updated positive',
        negative: 'updated negative',
      },
    );
    expect(result).toEqual(updatedExample);
  });

  it('updates only specified fields', async () => {
    const existingExample = ruleExampleFactory();
    const updatedExample = {
      ...existingExample,
      lang: ProgrammingLanguage.PYTHON,
    };

    ruleExampleRepository.findById.mockResolvedValue(existingExample);
    ruleExampleRepository.updateById.mockResolvedValue(updatedExample);

    const command = createCommand({
      ruleExampleId: existingExample.id,
      lang: ProgrammingLanguage.PYTHON,
    });

    const result = await usecase.execute(command);

    expect(ruleExampleRepository.updateById).toHaveBeenCalledWith(
      existingExample.id,
      {
        lang: ProgrammingLanguage.PYTHON,
      },
    );
    expect(result).toEqual(updatedExample);
  });

  it('allows empty positive and negative values', async () => {
    const existingExample = ruleExampleFactory();
    const updatedExample = {
      ...existingExample,
      lang: ProgrammingLanguage.JAVASCRIPT,
      positive: '',
      negative: '',
    };

    ruleExampleRepository.findById.mockResolvedValue(existingExample);
    ruleExampleRepository.updateById.mockResolvedValue(updatedExample);

    const command = createCommand({
      ruleExampleId: existingExample.id,
      lang: ProgrammingLanguage.JAVASCRIPT,
      positive: '',
      negative: '',
    });

    const result = await usecase.execute(command);

    expect(ruleExampleRepository.updateById).toHaveBeenCalledWith(
      existingExample.id,
      {
        lang: ProgrammingLanguage.JAVASCRIPT,
        positive: '',
        negative: '',
      },
    );
    expect(result).toEqual(updatedExample);
  });

  describe('when no fields are provided for update', () => {
    it('throws an error', async () => {
      const command = createCommand({
        ruleExampleId: 'example-id' as RuleExampleId,
      });

      await expect(usecase.execute(command)).rejects.toThrow(
        'At least one field must be provided for update',
      );
    });
  });

  describe('when rule example does not exist', () => {
    it('throws an error', async () => {
      ruleExampleRepository.findById.mockResolvedValue(null);

      const command = createCommand({
        ruleExampleId: 'non-existent-id' as RuleExampleId,
        lang: ProgrammingLanguage.JAVASCRIPT,
      });

      await expect(usecase.execute(command)).rejects.toThrow(
        'Rule example with id non-existent-id not found',
      );
    });
  });
});
