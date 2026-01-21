import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createUserId,
  IAccountsPort,
  Organization,
  ProgrammingLanguage,
  RuleExampleId,
  RuleUpdatedEvent,
  UpdateRuleExampleCommand,
  User,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import {
  ruleExampleFactory,
  ruleFactory,
  standardVersionFactory,
} from '../../../../test';
import { IRuleExampleRepository } from '../../../domain/repositories/IRuleExampleRepository';
import { IRuleRepository } from '../../../domain/repositories/IRuleRepository';
import { IStandardVersionRepository } from '../../../domain/repositories/IStandardVersionRepository';
import { IStandardsRepositories } from '../../../domain/repositories/IStandardsRepositories';
import { UpdateRuleExampleUsecase } from './updateRuleExample.usecase';

describe('UpdateRuleExampleUsecase', () => {
  let usecase: UpdateRuleExampleUsecase;
  let accountsAdapter: jest.Mocked<IAccountsPort>;
  let repositories: jest.Mocked<IStandardsRepositories>;
  let ruleExampleRepository: jest.Mocked<IRuleExampleRepository>;
  let ruleRepository: jest.Mocked<IRuleRepository>;
  let standardVersionRepository: jest.Mocked<IStandardVersionRepository>;
  let eventEmitterService: jest.Mocked<PackmindEventEmitterService>;
  let logger: PackmindLogger;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());

  const user: User = {
    id: userId,
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    memberships: [{ organizationId, role: 'member', userId }],
    active: true,
  };
  const organization: Organization = {
    id: organizationId,
    name: 'Test Org',
    slug: 'test-org',
  };

  const createCommand = (props: {
    ruleExampleId: RuleExampleId;
    lang?: ProgrammingLanguage;
    positive?: string;
    negative?: string;
  }): UpdateRuleExampleCommand => ({
    ...props,
    userId,
    organizationId,
  });

  beforeEach(() => {
    accountsAdapter = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    ruleExampleRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      updateById: jest.fn(),
      findByRuleId: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
    };

    ruleRepository = {
      findById: jest.fn(),
      add: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      findByStandardVersionId: jest.fn(),
    } as unknown as jest.Mocked<IRuleRepository>;

    standardVersionRepository = {
      findById: jest.fn(),
      list: jest.fn(),
      findByStandardId: jest.fn(),
      findLatestByStandardId: jest.fn(),
      findByStandardIdAndVersion: jest.fn(),
      updateSummary: jest.fn(),
      add: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
    } as unknown as jest.Mocked<IStandardVersionRepository>;

    repositories = {
      getRuleExampleRepository: jest
        .fn()
        .mockReturnValue(ruleExampleRepository),
      getStandardRepository: jest.fn(),
      getStandardVersionRepository: jest
        .fn()
        .mockReturnValue(standardVersionRepository),
      getRuleRepository: jest.fn().mockReturnValue(ruleRepository),
      getDetectionProgramRepository: jest.fn(),
      getActiveDetectionProgramRepository: jest.fn(),
    } as jest.Mocked<IStandardsRepositories>;

    eventEmitterService = {
      emit: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    logger = stubLogger();

    accountsAdapter.getUserById.mockResolvedValue(user);
    accountsAdapter.getOrganizationById.mockResolvedValue(organization);

    usecase = new UpdateRuleExampleUsecase(
      accountsAdapter,
      repositories,
      eventEmitterService,
      undefined,
      logger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when updating a rule example successfully', () => {
    let existingExample: ReturnType<typeof ruleExampleFactory>;
    let updatedExample: ReturnType<typeof ruleExampleFactory>;
    let result: ReturnType<typeof ruleExampleFactory>;

    beforeEach(async () => {
      const standardVersion = standardVersionFactory();
      const rule = ruleFactory({ standardVersionId: standardVersion.id });
      existingExample = ruleExampleFactory({ ruleId: rule.id });
      updatedExample = {
        ...existingExample,
        lang: ProgrammingLanguage.JAVASCRIPT,
        positive: 'updated positive',
        negative: 'updated negative',
      };

      ruleExampleRepository.findById.mockResolvedValue(existingExample);
      ruleExampleRepository.updateById.mockResolvedValue(updatedExample);
      ruleRepository.findById.mockResolvedValue(rule);
      standardVersionRepository.findById.mockResolvedValue(standardVersion);

      const command = createCommand({
        ruleExampleId: existingExample.id,
        lang: ProgrammingLanguage.JAVASCRIPT,
        positive: 'updated positive',
        negative: 'updated negative',
      });

      result = await usecase.execute(command);
    });

    it('finds the existing example by id', () => {
      expect(ruleExampleRepository.findById).toHaveBeenCalledWith(
        existingExample.id,
      );
    });

    it('updates the example with provided fields', () => {
      expect(ruleExampleRepository.updateById).toHaveBeenCalledWith(
        existingExample.id,
        {
          lang: ProgrammingLanguage.JAVASCRIPT,
          positive: 'updated positive',
          negative: 'updated negative',
        },
      );
    });

    it('returns the updated example', () => {
      expect(result).toEqual(updatedExample);
    });
  });

  it('emits RuleUpdatedEvent after updating', async () => {
    const standardVersion = standardVersionFactory();
    const rule = ruleFactory({ standardVersionId: standardVersion.id });
    const existingExample = ruleExampleFactory({ ruleId: rule.id });
    const updatedExample = {
      ...existingExample,
      lang: ProgrammingLanguage.JAVASCRIPT,
    };

    ruleExampleRepository.findById.mockResolvedValue(existingExample);
    ruleExampleRepository.updateById.mockResolvedValue(updatedExample);
    ruleRepository.findById.mockResolvedValue(rule);
    standardVersionRepository.findById.mockResolvedValue(standardVersion);

    const command = createCommand({
      ruleExampleId: existingExample.id,
      lang: ProgrammingLanguage.JAVASCRIPT,
    });

    await usecase.execute(command);

    expect(eventEmitterService.emit).toHaveBeenCalledWith(
      expect.any(RuleUpdatedEvent),
    );
  });

  describe('when updating only the lang field', () => {
    let existingExample: ReturnType<typeof ruleExampleFactory>;
    let updatedExample: ReturnType<typeof ruleExampleFactory>;
    let result: ReturnType<typeof ruleExampleFactory>;

    beforeEach(async () => {
      const standardVersion = standardVersionFactory();
      const rule = ruleFactory({ standardVersionId: standardVersion.id });
      existingExample = ruleExampleFactory({ ruleId: rule.id });
      updatedExample = {
        ...existingExample,
        lang: ProgrammingLanguage.PYTHON,
      };

      ruleExampleRepository.findById.mockResolvedValue(existingExample);
      ruleExampleRepository.updateById.mockResolvedValue(updatedExample);
      ruleRepository.findById.mockResolvedValue(rule);
      standardVersionRepository.findById.mockResolvedValue(standardVersion);

      const command = createCommand({
        ruleExampleId: existingExample.id,
        lang: ProgrammingLanguage.PYTHON,
      });

      result = await usecase.execute(command);
    });

    it('updates only the specified field', () => {
      expect(ruleExampleRepository.updateById).toHaveBeenCalledWith(
        existingExample.id,
        {
          lang: ProgrammingLanguage.PYTHON,
        },
      );
    });

    it('returns the updated example', () => {
      expect(result).toEqual(updatedExample);
    });
  });

  describe('when providing empty positive and negative values', () => {
    let existingExample: ReturnType<typeof ruleExampleFactory>;
    let updatedExample: ReturnType<typeof ruleExampleFactory>;
    let result: ReturnType<typeof ruleExampleFactory>;

    beforeEach(async () => {
      const standardVersion = standardVersionFactory();
      const rule = ruleFactory({ standardVersionId: standardVersion.id });
      existingExample = ruleExampleFactory({ ruleId: rule.id });
      updatedExample = {
        ...existingExample,
        lang: ProgrammingLanguage.JAVASCRIPT,
        positive: '',
        negative: '',
      };

      ruleExampleRepository.findById.mockResolvedValue(existingExample);
      ruleExampleRepository.updateById.mockResolvedValue(updatedExample);
      ruleRepository.findById.mockResolvedValue(rule);
      standardVersionRepository.findById.mockResolvedValue(standardVersion);

      const command = createCommand({
        ruleExampleId: existingExample.id,
        lang: ProgrammingLanguage.JAVASCRIPT,
        positive: '',
        negative: '',
      });

      result = await usecase.execute(command);
    });

    it('accepts empty strings for positive and negative fields', () => {
      expect(ruleExampleRepository.updateById).toHaveBeenCalledWith(
        existingExample.id,
        {
          lang: ProgrammingLanguage.JAVASCRIPT,
          positive: '',
          negative: '',
        },
      );
    });

    it('returns the updated example', () => {
      expect(result).toEqual(updatedExample);
    });
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
