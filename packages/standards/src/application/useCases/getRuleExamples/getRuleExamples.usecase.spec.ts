import {
  GetRuleExamplesRequest,
  GetRuleExamplesUsecase,
} from './getRuleExamples.usecase';
import { IRuleExampleRepository } from '../../../domain/repositories/IRuleExampleRepository';
import { IRuleRepository } from '../../../domain/repositories/IRuleRepository';
import { ruleExampleFactory } from '../../../../test/ruleExampleFactory';
import { ruleFactory } from '../../../../test/ruleFactory';
import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger } from '@packmind/logger';
import { ProgrammingLanguage } from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { createRuleId } from '@packmind/types';

describe('GetRuleExamplesUsecase', () => {
  let getRuleExamplesUsecase: GetRuleExamplesUsecase;
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

    getRuleExamplesUsecase = new GetRuleExamplesUsecase(
      ruleExampleRepository,
      ruleRepository,
      stubbedLogger,
    );
  });

  describe('getRuleExamples', () => {
    describe('when rule exists', () => {
      it('returns rule examples successfully', async () => {
        const ruleId = createRuleId(uuidv4());
        const rule = ruleFactory({ id: ruleId });
        const request: GetRuleExamplesRequest = { ruleId };

        const mockRuleExamples = [
          ruleExampleFactory({
            ruleId,
            lang: ProgrammingLanguage.JAVASCRIPT,
            positive: 'const variable = value;',
            negative: 'var variable = value;',
          }),
          ruleExampleFactory({
            ruleId,
            lang: ProgrammingLanguage.TYPESCRIPT,
            positive: 'const variable: string = value;',
            negative: 'var variable: any = value;',
          }),
        ];

        ruleRepository.findById.mockResolvedValue(rule);
        ruleExampleRepository.findByRuleId.mockResolvedValue(mockRuleExamples);

        const result = await getRuleExamplesUsecase.getRuleExamples(request);

        expect(ruleRepository.findById).toHaveBeenCalledWith(ruleId);
        expect(ruleExampleRepository.findByRuleId).toHaveBeenCalledWith(ruleId);
        expect(result).toEqual(mockRuleExamples);
      });
    });

    describe('when rule exists but has no examples', () => {
      it('returns empty array', async () => {
        const ruleId = createRuleId(uuidv4());
        const rule = ruleFactory({ id: ruleId });
        const request: GetRuleExamplesRequest = { ruleId };

        ruleRepository.findById.mockResolvedValue(rule);
        ruleExampleRepository.findByRuleId.mockResolvedValue([]);

        const result = await getRuleExamplesUsecase.getRuleExamples(request);

        expect(ruleRepository.findById).toHaveBeenCalledWith(ruleId);
        expect(ruleExampleRepository.findByRuleId).toHaveBeenCalledWith(ruleId);
        expect(result).toEqual([]);
      });
    });

    describe('when rule does not exist', () => {
      it('throws an error', async () => {
        const ruleId = createRuleId(uuidv4());
        const request: GetRuleExamplesRequest = { ruleId };

        ruleRepository.findById.mockResolvedValue(null);

        await expect(
          getRuleExamplesUsecase.getRuleExamples(request),
        ).rejects.toThrow(`Rule with id ${ruleId} not found`);

        expect(ruleRepository.findById).toHaveBeenCalledWith(ruleId);
        expect(ruleExampleRepository.findByRuleId).not.toHaveBeenCalled();
      });
    });

    it('handles rule repository errors gracefully', async () => {
      const ruleId = createRuleId(uuidv4());
      const request: GetRuleExamplesRequest = { ruleId };

      ruleRepository.findById.mockRejectedValue(new Error('Rule fetch error'));

      await expect(
        getRuleExamplesUsecase.getRuleExamples(request),
      ).rejects.toThrow('Rule fetch error');

      expect(ruleRepository.findById).toHaveBeenCalledWith(ruleId);
      expect(ruleExampleRepository.findByRuleId).not.toHaveBeenCalled();
    });

    it('handles rule example repository errors gracefully', async () => {
      const ruleId = createRuleId(uuidv4());
      const rule = ruleFactory({ id: ruleId });
      const request: GetRuleExamplesRequest = { ruleId };

      ruleRepository.findById.mockResolvedValue(rule);
      ruleExampleRepository.findByRuleId.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        getRuleExamplesUsecase.getRuleExamples(request),
      ).rejects.toThrow('Database error');

      expect(ruleRepository.findById).toHaveBeenCalledWith(ruleId);
      expect(ruleExampleRepository.findByRuleId).toHaveBeenCalledWith(ruleId);
    });
  });
});
