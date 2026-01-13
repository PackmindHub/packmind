import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  CreateRuleExampleCommand,
  createOrganizationId,
  createRuleId,
  createUserId,
  IAccountsPort,
  Organization,
  ProgrammingLanguage,
  RuleUpdatedEvent,
  User,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { ruleExampleFactory } from '../../../../test/ruleExampleFactory';
import { ruleFactory } from '../../../../test/ruleFactory';
import { standardVersionFactory } from '../../../../test/standardVersionFactory';
import { IRuleExampleRepository } from '../../../domain/repositories/IRuleExampleRepository';
import { IRuleRepository } from '../../../domain/repositories/IRuleRepository';
import { IStandardVersionRepository } from '../../../domain/repositories/IStandardVersionRepository';
import { CreateRuleExampleUsecase } from './createRuleExample.usecase';

describe('CreateRuleExampleUsecase', () => {
  let createRuleExampleUsecase: CreateRuleExampleUsecase;
  let accountsAdapter: jest.Mocked<IAccountsPort>;
  let ruleExampleRepository: jest.Mocked<IRuleExampleRepository>;
  let ruleRepository: jest.Mocked<IRuleRepository>;
  let standardVersionRepository: jest.Mocked<IStandardVersionRepository>;
  let eventEmitterService: jest.Mocked<PackmindEventEmitterService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

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

  beforeEach(() => {
    accountsAdapter = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    ruleExampleRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      findByRuleId: jest.fn(),
    } as unknown as jest.Mocked<IRuleExampleRepository>;

    ruleRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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

    eventEmitterService = {
      emit: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    stubbedLogger = stubLogger();

    accountsAdapter.getUserById.mockResolvedValue(user);
    accountsAdapter.getOrganizationById.mockResolvedValue(organization);

    createRuleExampleUsecase = new CreateRuleExampleUsecase(
      accountsAdapter,
      ruleExampleRepository,
      ruleRepository,
      standardVersionRepository,
      eventEmitterService,
      undefined,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('creates a rule example with valid inputs', async () => {
      const ruleId = createRuleId(uuidv4());
      const standardVersion = standardVersionFactory();
      const rule = ruleFactory({
        id: ruleId,
        standardVersionId: standardVersion.id,
      });
      const command: CreateRuleExampleCommand = {
        userId,
        organizationId,
        ruleId,
        lang: ProgrammingLanguage.JAVASCRIPT,
        positive: 'const variable = value;',
        negative: 'var variable = value;',
      };

      const expectedRuleExample = ruleExampleFactory({
        ruleId,
        lang: ProgrammingLanguage.JAVASCRIPT,
        positive: 'const variable = value;',
        negative: 'var variable = value;',
      });

      ruleRepository.findById.mockResolvedValue(rule);
      ruleExampleRepository.add.mockResolvedValue(expectedRuleExample);
      standardVersionRepository.findById.mockResolvedValue(standardVersion);

      const result = await createRuleExampleUsecase.execute(command);

      expect(result).toEqual(expectedRuleExample);
    });

    it('emits RuleUpdatedEvent after creating a rule example', async () => {
      const ruleId = createRuleId(uuidv4());
      const standardVersion = standardVersionFactory();
      const rule = ruleFactory({
        id: ruleId,
        standardVersionId: standardVersion.id,
      });
      const command: CreateRuleExampleCommand = {
        userId,
        organizationId,
        ruleId,
        lang: ProgrammingLanguage.JAVASCRIPT,
        positive: 'const variable = value;',
        negative: 'var variable = value;',
      };

      const expectedRuleExample = ruleExampleFactory({
        ruleId,
        lang: ProgrammingLanguage.JAVASCRIPT,
        positive: 'const variable = value;',
        negative: 'var variable = value;',
      });

      ruleRepository.findById.mockResolvedValue(rule);
      ruleExampleRepository.add.mockResolvedValue(expectedRuleExample);
      standardVersionRepository.findById.mockResolvedValue(standardVersion);

      await createRuleExampleUsecase.execute(command);

      expect(eventEmitterService.emit).toHaveBeenCalledWith(
        expect.any(RuleUpdatedEvent),
      );
    });

    describe('when rule does not exist', () => {
      it('throws an error', async () => {
        const ruleId = createRuleId(uuidv4());
        const command: CreateRuleExampleCommand = {
          userId,
          organizationId,
          ruleId,
          lang: ProgrammingLanguage.JAVASCRIPT,
          positive: 'const variable = value;',
          negative: 'var variable = value;',
        };

        ruleRepository.findById.mockResolvedValue(null);

        await expect(createRuleExampleUsecase.execute(command)).rejects.toThrow(
          `Rule with id ${ruleId} not found`,
        );
      });
    });

    describe('when language is empty', () => {
      it('throws an error', async () => {
        const ruleId = createRuleId(uuidv4());
        const command: CreateRuleExampleCommand = {
          userId,
          organizationId,
          ruleId,
          lang: '' as ProgrammingLanguage,
          positive: 'const variable = value;',
          negative: 'var variable = value;',
        };

        await expect(createRuleExampleUsecase.execute(command)).rejects.toThrow(
          'Language is required and cannot be empty',
        );
      });
    });

    it('allows empty positive example', async () => {
      const ruleId = createRuleId(uuidv4());
      const standardVersion = standardVersionFactory();
      const rule = ruleFactory({
        id: ruleId,
        standardVersionId: standardVersion.id,
      });
      const command: CreateRuleExampleCommand = {
        userId,
        organizationId,
        ruleId,
        lang: ProgrammingLanguage.JAVASCRIPT,
        positive: '',
        negative: 'var variable = value;',
      };

      const expectedRuleExample = ruleExampleFactory({
        ruleId,
        lang: ProgrammingLanguage.JAVASCRIPT,
        positive: '',
        negative: 'var variable = value;',
      });

      ruleRepository.findById.mockResolvedValue(rule);
      ruleExampleRepository.add.mockResolvedValue(expectedRuleExample);
      standardVersionRepository.findById.mockResolvedValue(standardVersion);

      const result = await createRuleExampleUsecase.execute(command);

      expect(result).toEqual(expectedRuleExample);
    });

    it('allows empty negative example', async () => {
      const ruleId = createRuleId(uuidv4());
      const standardVersion = standardVersionFactory();
      const rule = ruleFactory({
        id: ruleId,
        standardVersionId: standardVersion.id,
      });
      const command: CreateRuleExampleCommand = {
        userId,
        organizationId,
        ruleId,
        lang: ProgrammingLanguage.JAVASCRIPT,
        positive: 'const variable = value;',
        negative: '',
      };

      const expectedRuleExample = ruleExampleFactory({
        ruleId,
        lang: ProgrammingLanguage.JAVASCRIPT,
        positive: 'const variable = value;',
        negative: '',
      });

      ruleRepository.findById.mockResolvedValue(rule);
      ruleExampleRepository.add.mockResolvedValue(expectedRuleExample);
      standardVersionRepository.findById.mockResolvedValue(standardVersion);

      const result = await createRuleExampleUsecase.execute(command);

      expect(result).toEqual(expectedRuleExample);
    });

    it('handles repository errors gracefully', async () => {
      const ruleId = createRuleId(uuidv4());
      const standardVersion = standardVersionFactory();
      const rule = ruleFactory({
        id: ruleId,
        standardVersionId: standardVersion.id,
      });
      const command: CreateRuleExampleCommand = {
        userId,
        organizationId,
        ruleId,
        lang: ProgrammingLanguage.JAVASCRIPT,
        positive: 'const variable = value;',
        negative: 'var variable = value;',
      };

      ruleRepository.findById.mockResolvedValue(rule);
      ruleExampleRepository.add.mockRejectedValue(new Error('Database error'));

      await expect(createRuleExampleUsecase.execute(command)).rejects.toThrow(
        'Database error',
      );
    });
  });
});
