import {
  AddRuleToStandardUsecase,
  AddRuleToStandardRequest,
} from './addRuleToStandard.usecase';
import { StandardService } from '../../services/StandardService';
import { StandardVersionService } from '../../services/StandardVersionService';
import { GenerateStandardSummaryDelayedJob } from '../../jobs/GenerateStandardSummaryDelayedJob';
import { IRuleRepository } from '../../../domain/repositories/IRuleRepository';
import { Standard, createStandardId } from '@packmind/types';
import { StandardVersion } from '@packmind/types';
import { Rule } from '@packmind/types';
import { standardFactory } from '../../../../test/standardFactory';
import { standardVersionFactory } from '../../../../test/standardVersionFactory';
import { ruleFactory } from '../../../../test/ruleFactory';
import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createUserId,
  OrganizationId,
  UserId,
  IEventTrackingPort,
} from '@packmind/types';
import { createStandardVersionId } from '@packmind/types';
import { IRuleExampleRepository } from '../../../domain/repositories/IRuleExampleRepository';

describe('AddRuleToStandardUsecase', () => {
  let addRuleToStandardUsecase: AddRuleToStandardUsecase;
  let standardService: jest.Mocked<StandardService>;
  let standardVersionService: jest.Mocked<StandardVersionService>;
  let generateStandardSummaryDelayedJob: jest.Mocked<GenerateStandardSummaryDelayedJob>;
  let ruleRepository: jest.Mocked<IRuleRepository>;
  let ruleExampleRepository: jest.Mocked<IRuleExampleRepository>;
  let eventTrackingPort: jest.Mocked<IEventTrackingPort> | undefined;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  let organizationId: OrganizationId;
  let userId: UserId;

  beforeEach(() => {
    organizationId = createOrganizationId(uuidv4());
    userId = createUserId(uuidv4());

    // Mock StandardService
    standardService = {
      addStandard: jest.fn(),
      getStandardById: jest.fn(),
      findStandardBySlug: jest.fn(),
      updateStandard: jest.fn(),
      deleteStandard: jest.fn(),
      listStandardsByUser: jest.fn(),
      listStandardsByOrganizationAndUser: jest.fn(),
    } as unknown as jest.Mocked<StandardService>;

    // Mock StandardVersionService
    standardVersionService = {
      addStandardVersion: jest.fn(),
      listStandardVersions: jest.fn(),
      getStandardVersion: jest.fn(),
      getLatestStandardVersion: jest.fn(),
      getStandardVersionById: jest.fn(),
      prepareForGitPublishing: jest.fn(),
    } as unknown as jest.Mocked<StandardVersionService>;

    // Mock GenerateStandardSummaryDelayedJob
    generateStandardSummaryDelayedJob = {
      addJob: jest.fn(),
    } as unknown as jest.Mocked<GenerateStandardSummaryDelayedJob>;

    // Mock RuleRepository
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

    eventTrackingPort = {
      trackEvent: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<IEventTrackingPort>;

    stubbedLogger = stubLogger();

    // Setup default mock implementations
    generateStandardSummaryDelayedJob.addJob.mockResolvedValue('job-id-123');

    addRuleToStandardUsecase = new AddRuleToStandardUsecase(
      standardService,
      standardVersionService,
      ruleRepository,
      ruleExampleRepository,
      generateStandardSummaryDelayedJob,
      undefined, // linterAdapter
      eventTrackingPort,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addRuleToStandard', () => {
    describe('when rule addition succeeds', () => {
      let inputData: AddRuleToStandardRequest;
      let existingStandard: Standard;
      let latestVersion: StandardVersion;
      let existingRules: Rule[];
      let updatedStandard: Standard;
      let newStandardVersion: StandardVersion;
      let result: StandardVersion;

      beforeEach(async () => {
        inputData = {
          standardSlug: 'frontend-testing',
          ruleContent:
            'Use descriptive test names that explain expected behavior',
          userId,
          organizationId,
        };

        existingStandard = standardFactory({
          id: createStandardId(uuidv4()),
          name: 'Frontend Testing Standard',
          slug: 'frontend-testing',
          description: 'Guidelines for React and Jest testing',
          version: 2,
          userId,
          scope: 'frontend',
        });

        latestVersion = standardVersionFactory({
          id: createStandardVersionId(uuidv4()),
          standardId: existingStandard.id,
          name: existingStandard.name,
          slug: existingStandard.slug,
          description: existingStandard.description,
          version: 2,
          scope: existingStandard.scope,
        });

        existingRules = [
          ruleFactory({
            content: 'Use assertive names for test cases',
            standardVersionId: latestVersion.id,
          }),
          ruleFactory({
            content: 'Clean mocks after each test',
            standardVersionId: latestVersion.id,
          }),
        ];

        updatedStandard = standardFactory({
          id: existingStandard.id,
          name: existingStandard.name,
          slug: existingStandard.slug,
          description: existingStandard.description,
          version: 3, // Incremented version
          userId,
          scope: existingStandard.scope,
        });

        newStandardVersion = standardVersionFactory({
          id: createStandardVersionId(uuidv4()),
          standardId: existingStandard.id,
          name: existingStandard.name,
          slug: existingStandard.slug,
          description: existingStandard.description,
          version: 3,
          scope: existingStandard.scope,
        });

        // Setup mocks
        standardService.findStandardBySlug.mockResolvedValue(existingStandard);
        standardVersionService.getLatestStandardVersion.mockResolvedValue(
          latestVersion,
        );
        ruleRepository.findByStandardVersionId.mockResolvedValue(existingRules);
        standardService.updateStandard.mockResolvedValue(updatedStandard);
        standardVersionService.addStandardVersion.mockResolvedValue(
          newStandardVersion,
        );

        result = await addRuleToStandardUsecase.addRuleToStandard(inputData);
      });

      it('finds the standard by slug and organization', () => {
        expect(standardService.findStandardBySlug).toHaveBeenCalledWith(
          inputData.standardSlug,
          inputData.organizationId,
        );
      });

      it('gets the latest version to retrieve existing rules', () => {
        expect(
          standardVersionService.getLatestStandardVersion,
        ).toHaveBeenCalledWith(existingStandard.id);
      });

      it('retrieves existing rules from the latest version', () => {
        expect(ruleRepository.findByStandardVersionId).toHaveBeenCalledWith(
          latestVersion.id,
        );
      });

      it('updates the standard with incremented version', () => {
        expect(standardService.updateStandard).toHaveBeenCalledWith(
          existingStandard.id,
          {
            name: existingStandard.name,
            description: existingStandard.description,
            slug: existingStandard.slug,
            version: 3, // Incremented from 2 to 3
            gitCommit: undefined,
            userId,
            scope: existingStandard.scope,
          },
        );
      });

      it('queues summary generation job for the new version', () => {
        expect(generateStandardSummaryDelayedJob.addJob).toHaveBeenCalledWith(
          expect.objectContaining({
            userId,
            standardVersion: expect.objectContaining({
              standardId: existingStandard.id,
              name: existingStandard.name,
              slug: existingStandard.slug,
              description: existingStandard.description,
              version: 3,
              scope: existingStandard.scope,
            }),
            rules: expect.arrayContaining([
              expect.objectContaining({
                content: 'Use assertive names for test cases',
              }),
              expect.objectContaining({
                content: 'Clean mocks after each test',
              }),
              expect.objectContaining({
                content:
                  'Use descriptive test names that explain expected behavior',
              }),
            ]),
          }),
        );
      });

      it('creates new standard version with existing rules plus new rule', () => {
        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            standardId: existingStandard.id,
            name: existingStandard.name,
            slug: existingStandard.slug,
            description: existingStandard.description,
            version: 3,
            rules: [
              { content: 'Use assertive names for test cases', examples: [] },
              { content: 'Clean mocks after each test', examples: [] },
              {
                content:
                  'Use descriptive test names that explain expected behavior',
                examples: [],
              },
            ],
            scope: existingStandard.scope,
            userId,
          }),
        );
      });

      it('returns the new standard version', () => {
        expect(result).toEqual(newStandardVersion);
      });
    });

    describe('organization scoping', () => {
      it('allows access for standard belonging to user organization', async () => {
        const inputData: AddRuleToStandardRequest = {
          standardSlug: 'test-standard',
          ruleContent: 'Test rule content',
          userId,
          organizationId,
        };

        const existingStandard = standardFactory({
          // Same organization
          slug: 'test-standard',
        });

        const latestVersion = standardVersionFactory({
          standardId: existingStandard.id,
        });

        const existingRules = [ruleFactory()];
        const updatedStandard = standardFactory({ version: 2 });
        const newVersion = standardVersionFactory({ version: 2 });

        standardService.findStandardBySlug.mockResolvedValue(existingStandard);
        standardVersionService.getLatestStandardVersion.mockResolvedValue(
          latestVersion,
        );
        ruleRepository.findByStandardVersionId.mockResolvedValue(existingRules);
        standardService.updateStandard.mockResolvedValue(updatedStandard);
        standardVersionService.addStandardVersion.mockResolvedValue(newVersion);

        const result =
          await addRuleToStandardUsecase.addRuleToStandard(inputData);

        expect(result).toEqual(newVersion);
      });

      it('throws error for standard belonging to different organization', async () => {
        const inputData: AddRuleToStandardRequest = {
          standardSlug: 'test-standard',
          ruleContent: 'Test rule content',
          userId,
          organizationId,
        };

        // When searching for a standard by slug with the wrong organizationId,
        // the repository will return null because it filters by organizationId
        standardService.findStandardBySlug.mockResolvedValue(null);

        await expect(
          addRuleToStandardUsecase.addRuleToStandard(inputData),
        ).rejects.toThrow(
          'Standard slug not found, please check current standards first',
        );

        // Should not proceed to get latest version
        expect(
          standardVersionService.getLatestStandardVersion,
        ).not.toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      describe('when standard does not exist', () => {
        it('throws error with appropriate message', async () => {
          const inputData: AddRuleToStandardRequest = {
            standardSlug: 'non-existent-standard',
            ruleContent: 'Test rule content',
            userId,
            organizationId,
          };

          standardService.findStandardBySlug.mockResolvedValue(null);

          await expect(
            addRuleToStandardUsecase.addRuleToStandard(inputData),
          ).rejects.toThrow(
            'Standard slug not found, please check current standards first',
          );

          expect(
            standardVersionService.getLatestStandardVersion,
          ).not.toHaveBeenCalled();
        });
      });

      describe('when no versions exist for the standard', () => {
        it('throws error', async () => {
          const inputData: AddRuleToStandardRequest = {
            standardSlug: 'test-standard',
            ruleContent: 'Test rule content',
            userId,
            organizationId,
          };

          const existingStandard = standardFactory({
            slug: 'test-standard',
          });

          standardService.findStandardBySlug.mockResolvedValue(
            existingStandard,
          );
          standardVersionService.getLatestStandardVersion.mockResolvedValue(
            null,
          );

          await expect(
            addRuleToStandardUsecase.addRuleToStandard(inputData),
          ).rejects.toThrow(
            `No versions found for standard ${existingStandard.id}`,
          );
        });
      });

      it('propagates service errors', async () => {
        const inputData: AddRuleToStandardRequest = {
          standardSlug: 'test-standard',
          ruleContent: 'Test rule content',
          userId,
          organizationId,
        };

        const existingStandard = standardFactory({
          slug: 'test-standard',
          version: 1,
        });

        const latestVersion = standardVersionFactory({
          standardId: existingStandard.id,
          version: 1,
        });

        const existingRules = [ruleFactory()];

        standardService.findStandardBySlug.mockResolvedValue(existingStandard);
        standardVersionService.getLatestStandardVersion.mockResolvedValue(
          latestVersion,
        );
        ruleRepository.findByStandardVersionId.mockResolvedValue(existingRules);

        const error = new Error('Database connection failed');
        standardService.updateStandard.mockRejectedValue(error);

        await expect(
          addRuleToStandardUsecase.addRuleToStandard(inputData),
        ).rejects.toThrow('Database connection failed');
      });
    });

    describe('version increment logic', () => {
      it('correctly increments version from any starting version', async () => {
        const inputData: AddRuleToStandardRequest = {
          standardSlug: 'test-standard',
          ruleContent: 'New rule content',
          userId,
          organizationId,
        };

        const existingStandard = standardFactory({
          slug: 'test-standard',
          version: 5, // Start from version 5
        });

        const latestVersion = standardVersionFactory({
          standardId: existingStandard.id,
          version: 5,
        });

        const existingRules = [ruleFactory()];
        const updatedStandard = standardFactory({
          id: existingStandard.id,
          version: 6, // Should increment to 6
        });
        const newVersion = standardVersionFactory({
          standardId: existingStandard.id,
          version: 6,
        });

        standardService.findStandardBySlug.mockResolvedValue(existingStandard);
        standardVersionService.getLatestStandardVersion.mockResolvedValue(
          latestVersion,
        );
        ruleRepository.findByStandardVersionId.mockResolvedValue(existingRules);
        standardService.updateStandard.mockResolvedValue(updatedStandard);
        standardVersionService.addStandardVersion.mockResolvedValue(newVersion);

        await addRuleToStandardUsecase.addRuleToStandard(inputData);

        expect(standardService.updateStandard).toHaveBeenCalledWith(
          existingStandard.id,
          expect.objectContaining({
            version: 6, // Should be incremented to 6
          }),
        );

        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            version: 6, // Should be incremented to 6
          }),
        );
      });
    });

    describe('rule combination logic', () => {
      it('preserves existing rules and adds new rule', async () => {
        const inputData: AddRuleToStandardRequest = {
          standardSlug: 'test-standard',
          ruleContent: 'New coding rule',
          userId,
          organizationId,
        };

        const existingStandard = standardFactory({
          slug: 'test-standard',
        });

        const latestVersion = standardVersionFactory({
          standardId: existingStandard.id,
        });

        const existingRules = [
          ruleFactory({ content: 'Existing rule 1' }),
          ruleFactory({ content: 'Existing rule 2' }),
          ruleFactory({ content: 'Existing rule 3' }),
        ];

        const updatedStandard = standardFactory({ version: 2 });
        const newVersion = standardVersionFactory({ version: 2 });

        standardService.findStandardBySlug.mockResolvedValue(existingStandard);
        standardVersionService.getLatestStandardVersion.mockResolvedValue(
          latestVersion,
        );
        ruleRepository.findByStandardVersionId.mockResolvedValue(existingRules);
        standardService.updateStandard.mockResolvedValue(updatedStandard);
        standardVersionService.addStandardVersion.mockResolvedValue(newVersion);

        await addRuleToStandardUsecase.addRuleToStandard(inputData);

        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            rules: [
              { content: 'Existing rule 1', examples: [] },
              { content: 'Existing rule 2', examples: [] },
              { content: 'Existing rule 3', examples: [] },
              { content: 'New coding rule', examples: [] }, // New rule appended
            ],
          }),
        );
      });

      it('handles empty existing rules list', async () => {
        const inputData: AddRuleToStandardRequest = {
          standardSlug: 'test-standard',
          ruleContent: 'First rule for this standard',
          userId,
          organizationId,
        };

        const existingStandard = standardFactory({
          slug: 'test-standard',
        });

        const latestVersion = standardVersionFactory({
          standardId: existingStandard.id,
        });

        const existingRules: Rule[] = []; // No existing rules

        const updatedStandard = standardFactory({ version: 2 });
        const newVersion = standardVersionFactory({ version: 2 });

        standardService.findStandardBySlug.mockResolvedValue(existingStandard);
        standardVersionService.getLatestStandardVersion.mockResolvedValue(
          latestVersion,
        );
        ruleRepository.findByStandardVersionId.mockResolvedValue(existingRules);
        standardService.updateStandard.mockResolvedValue(updatedStandard);
        standardVersionService.addStandardVersion.mockResolvedValue(newVersion);

        await addRuleToStandardUsecase.addRuleToStandard(inputData);

        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            rules: [
              { content: 'First rule for this standard', examples: [] }, // Only the new rule
            ],
          }),
        );
      });
    });
  });
});
