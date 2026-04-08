import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  IAccountsPort,
  ISpacesPort,
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
import { RuleExampleNotFoundInSpaceError } from '../../../domain/errors/RuleExampleNotFoundInSpaceError';
import { IRuleExampleRepository } from '../../../domain/repositories/IRuleExampleRepository';
import { IRuleRepository } from '../../../domain/repositories/IRuleRepository';
import { IStandardVersionRepository } from '../../../domain/repositories/IStandardVersionRepository';
import { IStandardsRepositories } from '../../../domain/repositories/IStandardsRepositories';
import { UpdateRuleExampleUsecase } from './updateRuleExample.usecase';

describe('UpdateRuleExampleUsecase', () => {
  let usecase: UpdateRuleExampleUsecase;
  let accountsAdapter: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let repositories: jest.Mocked<IStandardsRepositories>;
  let ruleExampleRepository: jest.Mocked<IRuleExampleRepository>;
  let ruleRepository: jest.Mocked<IRuleRepository>;
  let standardVersionRepository: jest.Mocked<IStandardVersionRepository>;
  let eventEmitterService: jest.Mocked<PackmindEventEmitterService>;
  let logger: PackmindLogger;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const spaceId = createSpaceId(uuidv4());

  const user: User = {
    id: userId,
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    memberships: [{ organizationId, role: 'member', userId }],
    active: true,
    trial: false,
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
    spaceId,
  });

  beforeEach(() => {
    accountsAdapter = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    spacesPort = {
      findMembership: jest.fn().mockResolvedValue({ userId, spaceId }),
    } as unknown as jest.Mocked<ISpacesPort>;

    ruleExampleRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      findByIdInSpace: jest.fn(),
      updateById: jest.fn(),
      findByRuleId: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      hardDeleteById: jest.fn(),
    };

    ruleRepository = {
      findById: jest.fn(),
      findByIdInSpace: jest.fn(),
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
      getStandardVersionRepository: jest
        .fn()
        .mockReturnValue(standardVersionRepository),
      getRuleRepository: jest.fn().mockReturnValue(ruleRepository),
      getDetectionProgramRepository: jest.fn(),
      getActiveDetectionProgramRepository: jest.fn(),
      getStandardRepository: jest.fn(),
    } as jest.Mocked<IStandardsRepositories>;

    eventEmitterService = {
      emit: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    logger = stubLogger();

    accountsAdapter.getUserById.mockResolvedValue(user);
    accountsAdapter.getOrganizationById.mockResolvedValue(organization);

    usecase = new UpdateRuleExampleUsecase(
      spacesPort,
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

      ruleExampleRepository.findByIdInSpace.mockResolvedValue(existingExample);
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

    it('finds the existing example by id in space', () => {
      expect(ruleExampleRepository.findByIdInSpace).toHaveBeenCalledWith(
        existingExample.id,
        spaceId,
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

    ruleExampleRepository.findByIdInSpace.mockResolvedValue(existingExample);
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

      ruleExampleRepository.findByIdInSpace.mockResolvedValue(existingExample);
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

      ruleExampleRepository.findByIdInSpace.mockResolvedValue(existingExample);
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

  describe('when rule example is not found in space', () => {
    it('throws RuleExampleNotFoundInSpaceError', async () => {
      ruleExampleRepository.findByIdInSpace.mockResolvedValue(null);

      const command = createCommand({
        ruleExampleId: 'non-existent-id' as RuleExampleId,
        lang: ProgrammingLanguage.JAVASCRIPT,
      });

      await expect(usecase.execute(command)).rejects.toThrow(
        RuleExampleNotFoundInSpaceError,
      );
    });
  });
});
