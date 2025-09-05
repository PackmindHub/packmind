import {
  CreateRuleExampleRequest,
  CreateRuleExampleUsecase,
} from './createRuleExample.usecase';
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
      stubbedLogger,
    );
  });

  describe('createRuleExample', () => {
    it('creates a rule example with valid inputs', async () => {
      const ruleId = createRuleId(uuidv4());
      const rule = ruleFactory({ id: ruleId });
      const request: CreateRuleExampleRequest = {
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

      const result = await createRuleExampleUsecase.createRuleExample(request);

      expect(ruleRepository.findById).toHaveBeenCalledWith(ruleId);
      expect(ruleExampleRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleId,
          lang: ProgrammingLanguage.JAVASCRIPT,
          positive: 'const variable = value;',
          negative: 'var variable = value;',
          id: expect.any(String),
        }),
      );
      expect(result).toEqual(expectedRuleExample);
    });

    describe('when rule does not exist', () => {
      it('throws an error', async () => {
        const ruleId = createRuleId(uuidv4());
        const request: CreateRuleExampleRequest = {
          ruleId,
          lang: ProgrammingLanguage.JAVASCRIPT,
          positive: 'const variable = value;',
          negative: 'var variable = value;',
        };

        ruleRepository.findById.mockResolvedValue(null);

        await expect(
          createRuleExampleUsecase.createRuleExample(request),
        ).rejects.toThrow(`Rule with id ${ruleId} not found`);

        expect(ruleRepository.findById).toHaveBeenCalledWith(ruleId);
        expect(ruleExampleRepository.add).not.toHaveBeenCalled();
      });
    });

    it('allows empty positive example', async () => {
      const ruleId = createRuleId(uuidv4());
      const rule = ruleFactory({ id: ruleId });
      const request: CreateRuleExampleRequest = {
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

      const result = await createRuleExampleUsecase.createRuleExample(request);

      expect(ruleRepository.findById).toHaveBeenCalledWith(ruleId);
      expect(ruleExampleRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleId,
          lang: ProgrammingLanguage.JAVASCRIPT,
          positive: '',
          negative: 'var variable = value;',
        }),
      );
      expect(result).toEqual(expectedRuleExample);
    });

    it('allows empty negative example', async () => {
      const ruleId = createRuleId(uuidv4());
      const rule = ruleFactory({ id: ruleId });
      const request: CreateRuleExampleRequest = {
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

      const result = await createRuleExampleUsecase.createRuleExample(request);

      expect(ruleRepository.findById).toHaveBeenCalledWith(ruleId);
      expect(ruleExampleRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleId,
          lang: ProgrammingLanguage.JAVASCRIPT,
          positive: 'const variable = value;',
          negative: '',
        }),
      );
      expect(result).toEqual(expectedRuleExample);
    });

    it('handles repository errors gracefully', async () => {
      const ruleId = createRuleId(uuidv4());
      const rule = ruleFactory({ id: ruleId });
      const request: CreateRuleExampleRequest = {
        ruleId,
        lang: ProgrammingLanguage.JAVASCRIPT,
        positive: 'const variable = value;',
        negative: 'var variable = value;',
      };

      ruleRepository.findById.mockResolvedValue(rule);
      ruleExampleRepository.add.mockRejectedValue(new Error('Database error'));

      await expect(
        createRuleExampleUsecase.createRuleExample(request),
      ).rejects.toThrow('Database error');

      expect(ruleRepository.findById).toHaveBeenCalledWith(ruleId);
      expect(ruleExampleRepository.add).toHaveBeenCalled();
    });

    it('handles rule repository errors gracefully', async () => {
      const ruleId = createRuleId(uuidv4());
      const request: CreateRuleExampleRequest = {
        ruleId,
        lang: ProgrammingLanguage.JAVASCRIPT,
        positive: 'const variable = value;',
        negative: 'var variable = value;',
      };

      ruleRepository.findById.mockRejectedValue(new Error('Rule fetch error'));

      await expect(
        createRuleExampleUsecase.createRuleExample(request),
      ).rejects.toThrow('Rule fetch error');

      expect(ruleRepository.findById).toHaveBeenCalledWith(ruleId);
      expect(ruleExampleRepository.add).not.toHaveBeenCalled();
    });
  });
});
