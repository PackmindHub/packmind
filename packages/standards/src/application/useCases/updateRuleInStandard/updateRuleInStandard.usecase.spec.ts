import {
  UpdateRuleInStandardUsecase,
  UpdateRuleInStandardRequest,
} from './updateRuleInStandard.usecase';
import { StandardService } from '../../services/StandardService';
import { StandardVersionService } from '../../services/StandardVersionService';
import { GenerateStandardSummaryDelayedJob } from '../../jobs/GenerateStandardSummaryDelayedJob';
import { IRuleRepository } from '../../../domain/repositories/IRuleRepository';
import { createStandardId, createRuleId } from '@packmind/types';
import { standardFactory } from '../../../../test/standardFactory';
import { standardVersionFactory } from '../../../../test/standardVersionFactory';
import { ruleFactory } from '../../../../test/ruleFactory';
import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { createOrganizationId, createUserId } from '@packmind/types';
import { IRuleExampleRepository } from '../../../domain/repositories/IRuleExampleRepository';

describe('UpdateRuleInStandardUsecase', () => {
  let updateRuleInStandardUsecase: UpdateRuleInStandardUsecase;
  let standardService: jest.Mocked<StandardService>;
  let standardVersionService: jest.Mocked<StandardVersionService>;
  let generateStandardSummaryDelayedJob: jest.Mocked<GenerateStandardSummaryDelayedJob>;
  let ruleRepository: jest.Mocked<IRuleRepository>;
  let ruleExampleRepository: jest.Mocked<IRuleExampleRepository>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    standardService = {
      addStandard: jest.fn(),
      getStandardById: jest.fn(),
      findStandardBySlug: jest.fn(),
      updateStandard: jest.fn(),
      deleteStandard: jest.fn(),
      listStandardsByUser: jest.fn(),
      listStandardsByOrganizationAndUser: jest.fn(),
    } as unknown as jest.Mocked<StandardService>;

    standardVersionService = {
      addStandardVersion: jest.fn(),
      listStandardVersions: jest.fn(),
      getStandardVersion: jest.fn(),
      getLatestStandardVersion: jest.fn(),
      getStandardVersionById: jest.fn(),
      prepareForGitPublishing: jest.fn(),
    } as unknown as jest.Mocked<StandardVersionService>;

    generateStandardSummaryDelayedJob = {
      addJob: jest.fn(),
    } as unknown as jest.Mocked<GenerateStandardSummaryDelayedJob>;

    ruleRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      findByStandardVersionId: jest.fn(),
      deleteById: jest.fn(),
      deleteByStandardVersionId: jest.fn(),
    } as unknown as jest.Mocked<IRuleRepository>;

    ruleExampleRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      findByRuleId: jest.fn(),
      updateById: jest.fn(),
      deleteById: jest.fn(),
      findAll: jest.fn(),
    } as unknown as jest.Mocked<IRuleExampleRepository>;

    stubbedLogger = stubLogger();

    generateStandardSummaryDelayedJob.addJob.mockResolvedValue('job-id-123');

    updateRuleInStandardUsecase = new UpdateRuleInStandardUsecase(
      standardService,
      standardVersionService,
      ruleRepository,
      ruleExampleRepository,
      generateStandardSummaryDelayedJob,
      undefined,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateRuleInStandard', () => {
    it('creates new standard version with updated rule', async () => {
      const standardId = createStandardId(uuidv4());
      const ruleId = createRuleId(uuidv4());
      const organizationId = createOrganizationId(uuidv4());
      const userId = createUserId(uuidv4());

      const existingStandard = standardFactory({
        id: standardId,
        version: 1,
        name: 'Test Standard',
        slug: 'test-standard',
      });

      const existingVersion = standardVersionFactory({
        standardId,
        version: 1,
      });

      const existingRules = [
        ruleFactory({
          id: ruleId,
          content: 'Old rule content',
          standardVersionId: existingVersion.id,
        }),
        ruleFactory({
          content: 'Another rule',
          standardVersionId: existingVersion.id,
        }),
      ];

      const newVersion = standardVersionFactory({
        standardId,
        version: 2,
      });

      standardService.getStandardById.mockResolvedValue(existingStandard);
      standardVersionService.getLatestStandardVersion.mockResolvedValue(
        existingVersion,
      );
      ruleRepository.findByStandardVersionId.mockResolvedValue(existingRules);
      ruleExampleRepository.findByRuleId.mockResolvedValue([]);
      standardVersionService.addStandardVersion.mockResolvedValue(newVersion);

      const request: UpdateRuleInStandardRequest = {
        standardId,
        ruleId,
        newRuleContent: 'Updated rule content',
        organizationId,
        userId,
      };

      const result =
        await updateRuleInStandardUsecase.updateRuleInStandard(request);

      expect(result).toEqual(newVersion);
      expect(standardService.updateStandard).toHaveBeenCalledWith(
        standardId,
        expect.objectContaining({
          version: 2,
          userId,
        }),
      );
      expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
        expect.objectContaining({
          standardId,
          version: 2,
          rules: expect.arrayContaining([
            expect.objectContaining({
              content: 'Updated rule content',
            }),
            expect.objectContaining({
              content: 'Another rule',
            }),
          ]),
        }),
      );
    });

    it('throws error when standard not found', async () => {
      const standardId = createStandardId(uuidv4());
      const ruleId = createRuleId(uuidv4());

      standardService.getStandardById.mockResolvedValue(null);

      const request: UpdateRuleInStandardRequest = {
        standardId,
        ruleId,
        newRuleContent: 'New content',
        organizationId: createOrganizationId(uuidv4()),
        userId: createUserId(uuidv4()),
      };

      await expect(
        updateRuleInStandardUsecase.updateRuleInStandard(request),
      ).rejects.toThrow(`Standard with id ${standardId} not found`);
    });

    it('throws error when rule not found in standard', async () => {
      const standardId = createStandardId(uuidv4());
      const ruleId = createRuleId(uuidv4());

      const existingStandard = standardFactory({ id: standardId });
      const existingVersion = standardVersionFactory({ standardId });
      const existingRules = [
        ruleFactory({
          id: createRuleId(uuidv4()),
          standardVersionId: existingVersion.id,
        }),
      ];

      standardService.getStandardById.mockResolvedValue(existingStandard);
      standardVersionService.getLatestStandardVersion.mockResolvedValue(
        existingVersion,
      );
      ruleRepository.findByStandardVersionId.mockResolvedValue(existingRules);

      const request: UpdateRuleInStandardRequest = {
        standardId,
        ruleId,
        newRuleContent: 'New content',
        organizationId: createOrganizationId(uuidv4()),
        userId: createUserId(uuidv4()),
      };

      await expect(
        updateRuleInStandardUsecase.updateRuleInStandard(request),
      ).rejects.toThrow(`Rule ${ruleId} not found in standard ${standardId}`);
    });

    it('preserves rule examples when updating rule', async () => {
      const standardId = createStandardId(uuidv4());
      const ruleId = createRuleId(uuidv4());

      const existingStandard = standardFactory({ id: standardId });
      const existingVersion = standardVersionFactory({ standardId });
      const existingRules = [
        ruleFactory({
          id: ruleId,
          content: 'Old content',
          standardVersionId: existingVersion.id,
        }),
      ];

      const ruleExamples = [
        { id: 'ex1', content: 'Example 1', lang: 'typescript' },
        { id: 'ex2', content: 'Example 2', lang: 'javascript' },
      ];

      standardService.getStandardById.mockResolvedValue(existingStandard);
      standardVersionService.getLatestStandardVersion.mockResolvedValue(
        existingVersion,
      );
      ruleRepository.findByStandardVersionId.mockResolvedValue(existingRules);
      ruleExampleRepository.findByRuleId.mockResolvedValue(
        ruleExamples as unknown as Awaited<
          ReturnType<typeof ruleExampleRepository.findByRuleId>
        >,
      );
      standardVersionService.addStandardVersion.mockResolvedValue(
        existingVersion,
      );

      const request: UpdateRuleInStandardRequest = {
        standardId,
        ruleId,
        newRuleContent: 'Updated content',
        organizationId: createOrganizationId(uuidv4()),
        userId: createUserId(uuidv4()),
      };

      await updateRuleInStandardUsecase.updateRuleInStandard(request);

      expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
        expect.objectContaining({
          rules: [
            expect.objectContaining({
              content: 'Updated content',
              examples: ruleExamples,
              oldRuleId: ruleId,
            }),
          ],
        }),
      );
    });
  });
});
