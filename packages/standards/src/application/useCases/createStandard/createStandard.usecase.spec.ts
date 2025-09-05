import {
  CreateStandardUsecase,
  CreateStandardRequest,
} from './createStandard.usecase';
import { StandardService } from '../../services/StandardService';
import { StandardVersionService } from '../../services/StandardVersionService';
import { StandardSummaryService } from '../../services/StandardSummaryService';
import { Standard, createStandardId } from '../../../domain/entities/Standard';
import { StandardVersion } from '../../../domain/entities/StandardVersion';
import { standardFactory } from '../../../../test/standardFactory';
import { standardVersionFactory } from '../../../../test/standardVersionFactory';
import { v4 as uuidv4 } from 'uuid';
import slug from 'slug';
import { PackmindLogger, AiNotConfigured } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';
import { createOrganizationId, createUserId } from '@packmind/accounts';
import { createStandardVersionId } from '../../../domain/entities/StandardVersion';

// Mock external dependencies
jest.mock('slug');

const mockSlug = slug as jest.MockedFunction<typeof slug>;

describe('CreateStandardUsecase', () => {
  let createStandardUsecase: CreateStandardUsecase;
  let standardService: jest.Mocked<StandardService>;
  let standardVersionService: jest.Mocked<StandardVersionService>;
  let standardSummaryService: jest.Mocked<StandardSummaryService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
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

    // Setup default mock implementations
    mockSlug.mockImplementation((input: string) =>
      input.toLowerCase().replace(/\s+/g, '-'),
    );

    stubbedLogger = stubLogger();
    standardSummaryService.createStandardSummary.mockResolvedValue(
      'Generated summary for the standard',
    );

    createStandardUsecase = new CreateStandardUsecase(
      standardService,
      standardVersionService,
      standardSummaryService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createStandard', () => {
    describe('when standard creation succeeds', () => {
      let inputData: CreateStandardRequest;
      let createdStandard: Standard;
      let createdStandardVersion: StandardVersion;
      let result: Standard;

      beforeEach(async () => {
        inputData = {
          name: 'Test Standard',
          description: 'Test standard description',
          rules: [
            { content: 'Rule 1: Use proper naming conventions' },
            { content: 'Rule 2: Write comprehensive tests' },
          ],
          organizationId: createOrganizationId(uuidv4()),
          userId: createUserId(uuidv4()),
          scope: null,
        };

        createdStandard = standardFactory({
          id: createStandardId(uuidv4()),
          name: inputData.name,
          slug: 'test-standard',
          description: inputData.description,
          version: 1,
        });

        createdStandardVersion = standardVersionFactory({
          id: createStandardVersionId(uuidv4()),
          standardId: createdStandard.id,
          name: inputData.name,
          slug: 'test-standard',
          description: inputData.description,
          version: 1,
        });

        standardService.addStandard.mockResolvedValue(createdStandard);
        standardVersionService.addStandardVersion.mockResolvedValue(
          createdStandardVersion,
        );

        result = await createStandardUsecase.createStandard(inputData);
      });

      it('generates the correct slug from the standard name', () => {
        expect(mockSlug).toHaveBeenCalledWith(inputData.name);
      });

      it('calls StandardService.addStandard with correct parameters', () => {
        expect(standardService.addStandard).toHaveBeenCalledWith({
          name: inputData.name,
          slug: 'test-standard',
          description: inputData.description,
          version: 1,
          gitCommit: undefined,
          organizationId: inputData.organizationId,
          userId: inputData.userId,
          scope: null,
        });
      });

      it('calls StandardVersionService.addStandardVersion with correct parameters including summary', () => {
        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith({
          standardId: createdStandard.id,
          name: inputData.name,
          slug: 'test-standard',
          description: inputData.description,
          rules: inputData.rules,
          version: 1,
          scope: null,
          summary: 'Generated summary for the standard',
          userId: inputData.userId,
        });
      });

      it('calls both services exactly once', () => {
        expect(standardService.addStandard).toHaveBeenCalledTimes(1);
        expect(standardVersionService.addStandardVersion).toHaveBeenCalledTimes(
          1,
        );
      });

      it('creates standard before standard version', () => {
        const standardCall =
          standardService.addStandard.mock.invocationCallOrder[0];
        const versionCall =
          standardVersionService.addStandardVersion.mock.invocationCallOrder[0];
        expect(standardCall).toBeLessThan(versionCall);
      });

      it('returns the created standard', () => {
        expect(result).toEqual(createdStandard);
      });

      it('creates initial version as version 1', () => {
        expect(standardService.addStandard).toHaveBeenCalledWith(
          expect.objectContaining({ version: 1 }),
        );
        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
          expect.objectContaining({ version: 1 }),
        );
      });

      it('calls StandardSummaryService.createStandardSummary with correct parameters', () => {
        expect(
          standardSummaryService.createStandardSummary,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            standardId: createdStandard.id,
            name: inputData.name,
            slug: 'test-standard',
            description: inputData.description,
            version: 1,
            summary: null,
            scope: null,
          }),
          expect.arrayContaining([
            expect.objectContaining({
              content: 'Rule 1: Use proper naming conventions',
            }),
            expect.objectContaining({
              content: 'Rule 2: Write comprehensive tests',
            }),
          ]),
        );
      });

      it('calls StandardSummaryService.createStandardSummary before creating standard version', () => {
        const summaryCallOrder =
          standardSummaryService.createStandardSummary.mock
            .invocationCallOrder[0];
        const versionCallOrder =
          standardVersionService.addStandardVersion.mock.invocationCallOrder[0];
        expect(summaryCallOrder).toBeLessThan(versionCallOrder);
      });
    });

    describe('with different standard names and slug generation', () => {
      it('generates correct slug for standard with spaces', async () => {
        const inputData: CreateStandardRequest = {
          name: 'My Complex Standard Name',
          description: 'Test description',
          rules: [{ content: 'Test rule' }],
          organizationId: createOrganizationId(uuidv4()),
          userId: createUserId(uuidv4()),
          scope: null,
        };

        const createdStandard = standardFactory({
          name: inputData.name,
          slug: 'my-complex-standard-name',
          description: inputData.description,
        });

        const createdStandardVersion = standardVersionFactory({
          standardId: createdStandard.id,
          version: 1,
        });

        standardService.addStandard.mockResolvedValue(createdStandard);
        standardVersionService.addStandardVersion.mockResolvedValue(
          createdStandardVersion,
        );

        await createStandardUsecase.createStandard(inputData);

        expect(mockSlug).toHaveBeenCalledWith('My Complex Standard Name');
        expect(standardService.addStandard).toHaveBeenCalledWith({
          name: inputData.name,
          description: inputData.description,
          slug: 'my-complex-standard-name',
          version: 1,
          gitCommit: undefined,
          organizationId: inputData.organizationId,
          userId: inputData.userId,
          scope: null,
        });
      });

      it('generates correct slug for standard with special characters', async () => {
        const inputData: CreateStandardRequest = {
          name: 'Standard with "Special" Characters!',
          description: 'Test description',
          rules: [{ content: 'Test rule' }],
          organizationId: createOrganizationId(uuidv4()),
          userId: createUserId(uuidv4()),
          scope: null,
        };

        mockSlug.mockReturnValue('standard-with-special-characters');

        const createdStandard = standardFactory({
          name: inputData.name,
          slug: 'standard-with-special-characters',
          description: inputData.description,
        });

        const createdStandardVersion = standardVersionFactory({
          standardId: createdStandard.id,
          version: 1,
        });

        standardService.addStandard.mockResolvedValue(createdStandard);
        standardVersionService.addStandardVersion.mockResolvedValue(
          createdStandardVersion,
        );

        await createStandardUsecase.createStandard(inputData);

        expect(mockSlug).toHaveBeenCalledWith(
          'Standard with "Special" Characters!',
        );
        expect(standardService.addStandard).toHaveBeenCalledWith({
          name: inputData.name,
          description: inputData.description,
          slug: 'standard-with-special-characters',
          version: 1,
          gitCommit: undefined,
          organizationId: inputData.organizationId,
          userId: inputData.userId,
          scope: null,
        });
      });
    });

    describe('with different rule configurations', () => {
      it('handles empty rules array', async () => {
        const inputData: CreateStandardRequest = {
          name: 'Standard Without Rules',
          description: 'A standard with no rules',
          rules: [],
          organizationId: createOrganizationId(uuidv4()),
          userId: createUserId(uuidv4()),
          scope: null,
        };

        const createdStandard = standardFactory();
        const createdStandardVersion = standardVersionFactory();

        standardService.addStandard.mockResolvedValue(createdStandard);
        standardVersionService.addStandardVersion.mockResolvedValue(
          createdStandardVersion,
        );

        await createStandardUsecase.createStandard(inputData);

        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
          expect.objectContaining({ rules: [] }),
        );
      });

      it('handles multiple rules', async () => {
        const inputData: CreateStandardRequest = {
          name: 'Multi-Rule Standard',
          description: 'A standard with multiple rules',
          rules: [
            { content: 'Rule 1: Follow naming conventions' },
            { content: 'Rule 2: Write unit tests' },
            { content: 'Rule 3: Use TypeScript' },
            { content: 'Rule 4: Document your code' },
          ],
          organizationId: createOrganizationId(uuidv4()),
          userId: createUserId(uuidv4()),
          scope: null,
        };

        const createdStandard = standardFactory();
        const createdStandardVersion = standardVersionFactory();

        standardService.addStandard.mockResolvedValue(createdStandard);
        standardVersionService.addStandardVersion.mockResolvedValue(
          createdStandardVersion,
        );

        await createStandardUsecase.createStandard(inputData);

        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            rules: [
              { content: 'Rule 1: Follow naming conventions' },
              { content: 'Rule 2: Write unit tests' },
              { content: 'Rule 3: Use TypeScript' },
              { content: 'Rule 4: Document your code' },
            ],
          }),
        );
      });
    });

    describe('with scope configuration', () => {
      describe('when scope is provided', () => {
        it('passes scope to StandardVersionService', async () => {
          const inputData: CreateStandardRequest = {
            name: 'Scoped Standard',
            description: 'A standard with specific scope',
            rules: [{ content: 'Test rule for TypeScript files' }],
            organizationId: createOrganizationId(uuidv4()),
            userId: createUserId(uuidv4()),
            scope: '**/*.ts',
          };

          const createdStandard = standardFactory();
          const createdStandardVersion = standardVersionFactory();

          standardService.addStandard.mockResolvedValue(createdStandard);
          standardVersionService.addStandardVersion.mockResolvedValue(
            createdStandardVersion,
          );

          await createStandardUsecase.createStandard(inputData);

          expect(
            standardVersionService.addStandardVersion,
          ).toHaveBeenCalledWith(
            expect.objectContaining({
              scope: '**/*.ts',
            }),
          );
        });
      });

      describe('when scope is not provided', () => {
        it('passes null scope to StandardVersionService', async () => {
          const inputData: CreateStandardRequest = {
            name: 'Unscoped Standard',
            description: 'A standard without specific scope',
            rules: [{ content: 'Test rule for all files' }],
            organizationId: createOrganizationId(uuidv4()),
            userId: createUserId(uuidv4()),
            scope: null,
          };

          const createdStandard = standardFactory();
          const createdStandardVersion = standardVersionFactory();

          standardService.addStandard.mockResolvedValue(createdStandard);
          standardVersionService.addStandardVersion.mockResolvedValue(
            createdStandardVersion,
          );

          await createStandardUsecase.createStandard(inputData);

          expect(
            standardVersionService.addStandardVersion,
          ).toHaveBeenCalledWith(
            expect.objectContaining({
              scope: null,
            }),
          );
        });
      });
    });

    describe('when standard creation fails', () => {
      it('throws an error and logs the failure', async () => {
        const inputData: CreateStandardRequest = {
          name: 'Test Standard',
          description: 'Test description',
          rules: [{ content: 'Test rule' }],
          organizationId: createOrganizationId(uuidv4()),
          userId: createUserId(uuidv4()),
          scope: null,
        };

        const error = new Error('Database connection failed');
        standardService.addStandard.mockRejectedValue(error);

        await expect(
          createStandardUsecase.createStandard(inputData),
        ).rejects.toThrow('Database connection failed');

        expect(standardService.addStandard).toHaveBeenCalledWith({
          name: inputData.name,
          description: inputData.description,
          slug: 'test-standard',
          version: 1,
          gitCommit: undefined,
          organizationId: inputData.organizationId,
          userId: inputData.userId,
          scope: null,
        });

        // Version service should not be called if standard creation fails
        expect(
          standardVersionService.addStandardVersion,
        ).not.toHaveBeenCalled();
      });
    });

    describe('when standard version creation fails', () => {
      it('throws an error after standard creation', async () => {
        const inputData: CreateStandardRequest = {
          name: 'Test Standard',
          description: 'Test description',
          rules: [{ content: 'Test rule' }],
          organizationId: createOrganizationId(uuidv4()),
          userId: createUserId(uuidv4()),
          scope: null,
        };

        const createdStandard = standardFactory();
        standardService.addStandard.mockResolvedValue(createdStandard);

        const error = new Error('Rule creation failed');
        standardVersionService.addStandardVersion.mockRejectedValue(error);

        await expect(
          createStandardUsecase.createStandard(inputData),
        ).rejects.toThrow('Rule creation failed');

        expect(standardService.addStandard).toHaveBeenCalledTimes(1);
        expect(standardVersionService.addStandardVersion).toHaveBeenCalledTimes(
          1,
        );
      });
    });

    describe('when summary generation fails', () => {
      it('proceeds with standard creation using null summary', async () => {
        const inputData: CreateStandardRequest = {
          name: 'Test Standard',
          description: 'Test description',
          rules: [{ content: 'Test rule' }],
          organizationId: createOrganizationId(uuidv4()),
          userId: createUserId(uuidv4()),
          scope: null,
        };

        const createdStandard = standardFactory();
        const createdStandardVersion = standardVersionFactory();

        standardService.addStandard.mockResolvedValue(createdStandard);
        standardVersionService.addStandardVersion.mockResolvedValue(
          createdStandardVersion,
        );

        // Mock summary generation to fail
        standardSummaryService.createStandardSummary.mockRejectedValue(
          new Error('AI service unavailable'),
        );

        const result = await createStandardUsecase.createStandard(inputData);

        expect(result).toEqual(createdStandard);
        expect(
          standardSummaryService.createStandardSummary,
        ).toHaveBeenCalledTimes(1);
        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            summary: null, // Should be null when generation fails
          }),
        );
      });
    });

    describe('when OpenAI API key is not configured', () => {
      it('logs warning instead of error and proceeds without summary', async () => {
        const inputData: CreateStandardRequest = {
          name: 'Test Standard',
          description: 'Test description',
          rules: [{ content: 'Test rule' }],
          organizationId: createOrganizationId(uuidv4()),
          userId: createUserId(uuidv4()),
          scope: null,
        };

        const createdStandard = standardFactory();
        const createdStandardVersion = standardVersionFactory();

        standardService.addStandard.mockResolvedValue(createdStandard);
        standardVersionService.addStandardVersion.mockResolvedValue(
          createdStandardVersion,
        );

        // Mock summary generation to fail with missing API key
        standardSummaryService.createStandardSummary.mockRejectedValue(
          new AiNotConfigured(
            'AI service not configured for standard summary generation',
          ),
        );

        const result = await createStandardUsecase.createStandard(inputData);

        expect(result).toEqual(createdStandard);
        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            summary: null, // Should be null when API key is missing
          }),
        );
      });
    });

    describe('with scope parameter', () => {
      describe('when scope is provided', () => {
        it('passes scope to summary generation service', async () => {
          const inputData: CreateStandardRequest = {
            name: 'Scoped Standard',
            description: 'A standard with scope',
            rules: [{ content: 'Test rule for TypeScript files' }],
            organizationId: createOrganizationId(uuidv4()),
            userId: createUserId(uuidv4()),
            scope: 'src/**/*.ts',
          };

          const createdStandard = standardFactory();
          const createdStandardVersion = standardVersionFactory();

          standardService.addStandard.mockResolvedValue(createdStandard);
          standardVersionService.addStandardVersion.mockResolvedValue(
            createdStandardVersion,
          );

          await createStandardUsecase.createStandard(inputData);

          expect(
            standardSummaryService.createStandardSummary,
          ).toHaveBeenCalledWith(
            expect.objectContaining({
              scope: 'src/**/*.ts',
            }),
            expect.any(Array),
          );
        });
      });
    });
  });
});
