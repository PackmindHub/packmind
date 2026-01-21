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
      let ruleId: ReturnType<typeof createRuleId>;
      let mockRuleExamples: ReturnType<typeof ruleExampleFactory>[];
      let result: ReturnType<typeof ruleExampleFactory>[];

      beforeEach(async () => {
        ruleId = createRuleId(uuidv4());
        const rule = ruleFactory({ id: ruleId });
        const request: GetRuleExamplesRequest = { ruleId };

        mockRuleExamples = [
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

        result = await getRuleExamplesUsecase.getRuleExamples(request);
      });

      it('calls ruleRepository.findById with the ruleId', () => {
        expect(ruleRepository.findById).toHaveBeenCalledWith(ruleId);
      });

      it('calls ruleExampleRepository.findByRuleId with the ruleId', () => {
        expect(ruleExampleRepository.findByRuleId).toHaveBeenCalledWith(ruleId);
      });

      it('returns the rule examples', () => {
        expect(result).toEqual(mockRuleExamples);
      });
    });

    describe('when rule exists but has no examples', () => {
      let ruleId: ReturnType<typeof createRuleId>;
      let result: ReturnType<typeof ruleExampleFactory>[];

      beforeEach(async () => {
        ruleId = createRuleId(uuidv4());
        const rule = ruleFactory({ id: ruleId });
        const request: GetRuleExamplesRequest = { ruleId };

        ruleRepository.findById.mockResolvedValue(rule);
        ruleExampleRepository.findByRuleId.mockResolvedValue([]);

        result = await getRuleExamplesUsecase.getRuleExamples(request);
      });

      it('calls ruleRepository.findById with the ruleId', () => {
        expect(ruleRepository.findById).toHaveBeenCalledWith(ruleId);
      });

      it('calls ruleExampleRepository.findByRuleId with the ruleId', () => {
        expect(ruleExampleRepository.findByRuleId).toHaveBeenCalledWith(ruleId);
      });

      it('returns an empty array', () => {
        expect(result).toEqual([]);
      });
    });

    describe('when rule does not exist', () => {
      let ruleId: ReturnType<typeof createRuleId>;

      beforeEach(() => {
        ruleId = createRuleId(uuidv4());
        ruleRepository.findById.mockResolvedValue(null);
      });

      it('throws an error', async () => {
        const request: GetRuleExamplesRequest = { ruleId };

        await expect(
          getRuleExamplesUsecase.getRuleExamples(request),
        ).rejects.toThrow(`Rule with id ${ruleId} not found`);
      });

      it('calls ruleRepository.findById with the ruleId', async () => {
        const request: GetRuleExamplesRequest = { ruleId };

        try {
          await getRuleExamplesUsecase.getRuleExamples(request);
        } catch {
          // Expected to throw
        }

        expect(ruleRepository.findById).toHaveBeenCalledWith(ruleId);
      });

      it('does not call ruleExampleRepository.findByRuleId', async () => {
        const request: GetRuleExamplesRequest = { ruleId };

        try {
          await getRuleExamplesUsecase.getRuleExamples(request);
        } catch {
          // Expected to throw
        }

        expect(ruleExampleRepository.findByRuleId).not.toHaveBeenCalled();
      });
    });

    describe('when rule repository throws an error', () => {
      let ruleId: ReturnType<typeof createRuleId>;

      beforeEach(() => {
        ruleId = createRuleId(uuidv4());
        ruleRepository.findById.mockRejectedValue(
          new Error('Rule fetch error'),
        );
      });

      it('propagates the error', async () => {
        const request: GetRuleExamplesRequest = { ruleId };

        await expect(
          getRuleExamplesUsecase.getRuleExamples(request),
        ).rejects.toThrow('Rule fetch error');
      });

      it('calls ruleRepository.findById with the ruleId', async () => {
        const request: GetRuleExamplesRequest = { ruleId };

        try {
          await getRuleExamplesUsecase.getRuleExamples(request);
        } catch {
          // Expected to throw
        }

        expect(ruleRepository.findById).toHaveBeenCalledWith(ruleId);
      });

      it('does not call ruleExampleRepository.findByRuleId', async () => {
        const request: GetRuleExamplesRequest = { ruleId };

        try {
          await getRuleExamplesUsecase.getRuleExamples(request);
        } catch {
          // Expected to throw
        }

        expect(ruleExampleRepository.findByRuleId).not.toHaveBeenCalled();
      });
    });

    describe('when rule example repository throws an error', () => {
      let ruleId: ReturnType<typeof createRuleId>;

      beforeEach(() => {
        ruleId = createRuleId(uuidv4());
        const rule = ruleFactory({ id: ruleId });

        ruleRepository.findById.mockResolvedValue(rule);
        ruleExampleRepository.findByRuleId.mockRejectedValue(
          new Error('Database error'),
        );
      });

      it('propagates the error', async () => {
        const request: GetRuleExamplesRequest = { ruleId };

        await expect(
          getRuleExamplesUsecase.getRuleExamples(request),
        ).rejects.toThrow('Database error');
      });

      it('calls ruleRepository.findById with the ruleId', async () => {
        const request: GetRuleExamplesRequest = { ruleId };

        try {
          await getRuleExamplesUsecase.getRuleExamples(request);
        } catch {
          // Expected to throw
        }

        expect(ruleRepository.findById).toHaveBeenCalledWith(ruleId);
      });

      it('calls ruleExampleRepository.findByRuleId with the ruleId', async () => {
        const request: GetRuleExamplesRequest = { ruleId };

        try {
          await getRuleExamplesUsecase.getRuleExamples(request);
        } catch {
          // Expected to throw
        }

        expect(ruleExampleRepository.findByRuleId).toHaveBeenCalledWith(ruleId);
      });
    });
  });
});
