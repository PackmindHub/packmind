import {
  AddRuleToStandardUsecase,
  AddRuleToStandardRequest,
} from './addRuleToStandard.usecase';
import { StandardService } from '../../services/StandardService';
import { StandardVersionService } from '../../services/StandardVersionService';
import { StandardSummaryService } from '../../services/StandardSummaryService';
import { IRuleRepository } from '../../../domain/repositories/IRuleRepository';
import { Standard, createStandardId } from '../../../domain/entities/Standard';
import { StandardVersion } from '../../../domain/entities/StandardVersion';
import { Rule } from '../../../domain/entities/Rule';
import { standardFactory } from '../../../../test/standardFactory';
import { standardVersionFactory } from '../../../../test/standardVersionFactory';
import { ruleFactory } from '../../../../test/ruleFactory';
import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';
import {
  createOrganizationId,
  createUserId,
  OrganizationId,
  UserId,
} from '@packmind/accounts';
import { createStandardVersionId } from '../../../domain/entities/StandardVersion';

describe('AddRuleToStandardUsecase', () => {
  let addRuleToStandardUsecase: AddRuleToStandardUsecase;
  let standardService: jest.Mocked<StandardService>;
  let standardVersionService: jest.Mocked<StandardVersionService>;
  let standardSummaryService: jest.Mocked<StandardSummaryService>;
  let ruleRepository: jest.Mocked<IRuleRepository>;
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
      listStandardsByOrganization: jest.fn(),
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

    // Mock StandardSummaryService
    standardSummaryService = {
      createStandardSummary: jest.fn(),
    } as unknown as jest.Mocked<StandardSummaryService>;

    // Mock RuleRepository
    ruleRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      findByStandardVersionId: jest.fn(),
      deleteById: jest.fn(),
      deleteByStandardVersionId: jest.fn(),
    } as unknown as jest.Mocked<IRuleRepository>;

    stubbedLogger = stubLogger();

    // Setup default mock implementations
    standardSummaryService.createStandardSummary.mockResolvedValue(
      'Generated summary for the standard with the new rule',
    );

    addRuleToStandardUsecase = new AddRuleToStandardUsecase(
      standardService,
      standardVersionService,
      ruleRepository,
      standardSummaryService,
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
          organizationId,
          userId,
        };

        existingStandard = standardFactory({
          id: createStandardId(uuidv4()),
          name: 'Frontend Testing Standard',
          slug: 'frontend-testing',
          description: 'Guidelines for React and Jest testing',
          version: 2,
          organizationId,
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
          organizationId,
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

      it('finds the standard by slug', () => {
        expect(standardService.findStandardBySlug).toHaveBeenCalledWith(
          inputData.standardSlug,
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
            organizationId,
            userId,
            scope: existingStandard.scope,
          },
        );
      });

      it('generates summary for the new version', () => {
        expect(
          standardSummaryService.createStandardSummary,
        ).toHaveBeenCalledWith(
          {
            standardId: existingStandard.id,
            name: existingStandard.name,
            slug: existingStandard.slug,
            description: existingStandard.description,
            version: 3,
            summary: null,
            scope: existingStandard.scope,
          },
          expect.arrayContaining([
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
        );
      });

      it('creates new standard version with existing rules plus new rule', () => {
        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith({
          standardId: existingStandard.id,
          name: existingStandard.name,
          slug: existingStandard.slug,
          description: existingStandard.description,
          version: 3,
          rules: [
            { content: 'Use assertive names for test cases' },
            { content: 'Clean mocks after each test' },
            {
              content:
                'Use descriptive test names that explain expected behavior',
            },
          ],
          scope: existingStandard.scope,
          summary: 'Generated summary for the standard with the new rule',
          userId,
        });
      });

      it('returns the new standard version', () => {
        expect(result).toEqual(newStandardVersion);
      });
    });

    describe('when summary generation fails', () => {
      it('continues without summary and logs the error', async () => {
        const inputData: AddRuleToStandardRequest = {
          standardSlug: 'test-standard',
          ruleContent: 'Test rule content',
          organizationId,
          userId,
        };

        const existingStandard = standardFactory({
          organizationId,
          slug: 'test-standard',
          version: 1,
        });

        const latestVersion = standardVersionFactory({
          standardId: existingStandard.id,
          version: 1,
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

        // Mock summary service to throw error
        standardSummaryService.createStandardSummary.mockRejectedValue(
          new Error('AI service unavailable'),
        );

        standardVersionService.addStandardVersion.mockResolvedValue(newVersion);

        const result =
          await addRuleToStandardUsecase.addRuleToStandard(inputData);

        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            summary: null, // Should be null when summary generation fails
          }),
        );

        expect(result).toEqual(newVersion);
      });
    });

    describe('organization scoping', () => {
      it('allows access for standard belonging to user organization', async () => {
        const inputData: AddRuleToStandardRequest = {
          standardSlug: 'test-standard',
          ruleContent: 'Test rule content',
          organizationId,
          userId,
        };

        const existingStandard = standardFactory({
          organizationId, // Same organization
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
        const differentOrganizationId = createOrganizationId(uuidv4());

        const inputData: AddRuleToStandardRequest = {
          standardSlug: 'test-standard',
          ruleContent: 'Test rule content',
          organizationId,
          userId,
        };

        const existingStandard = standardFactory({
          organizationId: differentOrganizationId, // Different organization
          slug: 'test-standard',
        });

        standardService.findStandardBySlug.mockResolvedValue(existingStandard);

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
            organizationId,
            userId,
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
            organizationId,
            userId,
          };

          const existingStandard = standardFactory({
            organizationId,
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
          organizationId,
          userId,
        };

        const existingStandard = standardFactory({
          organizationId,
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
          organizationId,
          userId,
        };

        const existingStandard = standardFactory({
          organizationId,
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
          organizationId,
          userId,
        };

        const existingStandard = standardFactory({
          organizationId,
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
              { content: 'Existing rule 1' },
              { content: 'Existing rule 2' },
              { content: 'Existing rule 3' },
              { content: 'New coding rule' }, // New rule appended
            ],
          }),
        );
      });

      it('handles empty existing rules list', async () => {
        const inputData: AddRuleToStandardRequest = {
          standardSlug: 'test-standard',
          ruleContent: 'First rule for this standard',
          organizationId,
          userId,
        };

        const existingStandard = standardFactory({
          organizationId,
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
              { content: 'First rule for this standard' }, // Only the new rule
            ],
          }),
        );
      });
    });
  });
});
