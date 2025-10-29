import { CreateRuleExampleUsecase } from './createRuleExample.usecase';
import { CreateRuleExampleCommand } from '../../../domain/useCases/ICreateRuleExample';
import { IRuleExampleRepository } from '../../../domain/repositories/IRuleExampleRepository';
import { IRuleRepository } from '../../../domain/repositories/IRuleRepository';
import { ruleExampleFactory } from '../../../../test/ruleExampleFactory';
import { ruleFactory } from '../../../../test/ruleFactory';
import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger, ProgrammingLanguage } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';
import { createRuleId } from '../../../domain/entities/Rule';

describe('CreateRuleExampleUsecase', () => {
  let createRuleExampleUsecase: CreateRuleExampleUsecase;
  let ruleExampleRepository: jest.Mocked<IRuleExampleRepository>;
  let ruleRepository: jest.Mocked<IRuleRepository>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    // Mock RuleExampleRepository
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

    // Mock RuleRepository
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

    stubbedLogger = stubLogger();

    createRuleExampleUsecase = new CreateRuleExampleUsecase(
      ruleExampleRepository,
      ruleRepository,
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
      const rule = ruleFactory({ id: ruleId });
      const command: CreateRuleExampleCommand = {
        ruleId,
        lang: ProgrammingLanguage.JAVASCRIPT,
        positive: 'const variable = value;',
        negative: 'var variable = value;',
        organizationId: 'org-123',
        userId: 'user-123',
      };

      const expectedRuleExample = ruleExampleFactory({
        ruleId,
        lang: ProgrammingLanguage.JAVASCRIPT,
        positive: 'const variable = value;',
        negative: 'var variable = value;',
      });

      ruleRepository.findById.mockResolvedValue(rule);
      ruleExampleRepository.add.mockResolvedValue(expectedRuleExample);

      const result = await createRuleExampleUsecase.execute(command);

      expect(result).toEqual(expectedRuleExample);
    });

    describe('when rule does not exist', () => {
      it('throws an error', async () => {
        const ruleId = createRuleId(uuidv4());
        const command: CreateRuleExampleCommand = {
          ruleId,
          lang: ProgrammingLanguage.JAVASCRIPT,
          positive: 'const variable = value;',
          negative: 'var variable = value;',
          organizationId: 'org-123',
          userId: 'user-123',
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
          ruleId,
          lang: '' as ProgrammingLanguage,
          positive: 'const variable = value;',
          negative: 'var variable = value;',
          organizationId: 'org-123',
          userId: 'user-123',
        };

        await expect(createRuleExampleUsecase.execute(command)).rejects.toThrow(
          'Language is required and cannot be empty',
        );
      });
    });

    it('allows empty positive example', async () => {
      const ruleId = createRuleId(uuidv4());
      const rule = ruleFactory({ id: ruleId });
      const command: CreateRuleExampleCommand = {
        ruleId,
        lang: ProgrammingLanguage.JAVASCRIPT,
        positive: '',
        negative: 'var variable = value;',
        organizationId: 'org-123',
        userId: 'user-123',
      };

      const expectedRuleExample = ruleExampleFactory({
        ruleId,
        lang: ProgrammingLanguage.JAVASCRIPT,
        positive: '',
        negative: 'var variable = value;',
      });

      ruleRepository.findById.mockResolvedValue(rule);
      ruleExampleRepository.add.mockResolvedValue(expectedRuleExample);

      const result = await createRuleExampleUsecase.execute(command);

      expect(result).toEqual(expectedRuleExample);
    });

    it('allows empty negative example', async () => {
      const ruleId = createRuleId(uuidv4());
      const rule = ruleFactory({ id: ruleId });
      const command: CreateRuleExampleCommand = {
        ruleId,
        lang: ProgrammingLanguage.JAVASCRIPT,
        positive: 'const variable = value;',
        negative: '',
        organizationId: 'org-123',
        userId: 'user-123',
      };

      const expectedRuleExample = ruleExampleFactory({
        ruleId,
        lang: ProgrammingLanguage.JAVASCRIPT,
        positive: 'const variable = value;',
        negative: '',
      });

      ruleRepository.findById.mockResolvedValue(rule);
      ruleExampleRepository.add.mockResolvedValue(expectedRuleExample);

      const result = await createRuleExampleUsecase.execute(command);

      expect(result).toEqual(expectedRuleExample);
    });

    it('handles repository errors gracefully', async () => {
      const ruleId = createRuleId(uuidv4());
      const rule = ruleFactory({ id: ruleId });
      const command: CreateRuleExampleCommand = {
        ruleId,
        lang: ProgrammingLanguage.JAVASCRIPT,
        positive: 'const variable = value;',
        negative: 'var variable = value;',
        organizationId: 'org-123',
        userId: 'user-123',
      };

      ruleRepository.findById.mockResolvedValue(rule);
      ruleExampleRepository.add.mockRejectedValue(new Error('Database error'));

      await expect(createRuleExampleUsecase.execute(command)).rejects.toThrow(
        'Database error',
      );
    });
  });
});
