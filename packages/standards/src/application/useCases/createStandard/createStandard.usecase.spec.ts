import { CreateStandardUsecase } from './createStandard.usecase';
import { CreateStandardCommand } from '@packmind/shared';
import { StandardService } from '../../services/StandardService';
import { StandardVersionService } from '../../services/StandardVersionService';
import { GenerateStandardSummaryDelayedJob } from '../../jobs/GenerateStandardSummaryDelayedJob';
import { Standard, createStandardId } from '../../../domain/entities/Standard';
import { StandardVersion } from '../../../domain/entities/StandardVersion';
import { standardFactory } from '../../../../test/standardFactory';
import { standardVersionFactory } from '../../../../test/standardVersionFactory';
import { v4 as uuidv4 } from 'uuid';
import slug from 'slug';
import { PackmindLogger } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';
import { createOrganizationId, createUserId } from '@packmind/accounts';
import { createSpaceId } from '@packmind/spaces';
import { createStandardVersionId } from '../../../domain/entities/StandardVersion';

// Mock external dependencies
jest.mock('slug');

const mockSlug = slug as jest.MockedFunction<typeof slug>;

describe('CreateStandardUsecase', () => {
  let createStandardUsecase: CreateStandardUsecase;
  let standardService: jest.Mocked<StandardService>;
  let standardVersionService: jest.Mocked<StandardVersionService>;
  let generateStandardSummaryDelayedJob: jest.Mocked<GenerateStandardSummaryDelayedJob>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    // Mock StandardService
    standardService = {
      addStandard: jest.fn(),
      getStandardById: jest.fn(),
      findStandardBySlug: jest.fn(),
      updateStandard: jest.fn(),
      deleteStandard: jest.fn(),
      listStandardsBySpace: jest.fn(),
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

    // Setup default mock implementations
    mockSlug.mockImplementation((input: string) =>
      input.toLowerCase().replace(/\s+/g, '-'),
    );

    stubbedLogger = stubLogger();
    generateStandardSummaryDelayedJob.addJob.mockResolvedValue('job-id-123');

    standardService.listStandardsBySpace.mockResolvedValue([]);

    createStandardUsecase = new CreateStandardUsecase(
      standardService,
      standardVersionService,
      generateStandardSummaryDelayedJob,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createStandard', () => {
    describe('when standard creation succeeds', () => {
      let inputData: CreateStandardCommand;
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
          organizationId: createOrganizationId(uuidv4()).toString(),
          userId: createUserId(uuidv4()).toString(),
          spaceId: createSpaceId(uuidv4()).toString(),
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

        result = await createStandardUsecase.execute(inputData);
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
          userId: createUserId(inputData.userId),
          spaceId: createSpaceId(inputData.spaceId),
          scope: null,
        });
      });

      it('calls StandardVersionService.addStandardVersion with correct parameters', () => {
        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            standardId: createdStandard.id,
            name: inputData.name,
            slug: 'test-standard',
            description: inputData.description,
            version: 1,
            scope: null,
            userId: inputData.userId,
            rules: expect.arrayContaining([
              expect.objectContaining({
                content: 'Rule 1: Use proper naming conventions',
              }),
              expect.objectContaining({
                content: 'Rule 2: Write comprehensive tests',
              }),
            ]),
          }),
        );
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

      it('queues standard summary generation job with correct parameters', () => {
        expect(generateStandardSummaryDelayedJob.addJob).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: inputData.userId,
            organizationId: inputData.organizationId,
            standardVersion: expect.objectContaining({
              standardId: createdStandard.id,
              name: inputData.name,
              slug: 'test-standard',
              description: inputData.description,
              version: 1,
              summary: null,
              scope: null,
            }),
            rules: expect.arrayContaining([
              expect.objectContaining({
                content: 'Rule 1: Use proper naming conventions',
              }),
              expect.objectContaining({
                content: 'Rule 2: Write comprehensive tests',
              }),
            ]),
          }),
        );
      });
    });

    describe('with different standard names and slug generation', () => {
      it('generates correct slug for standard with spaces', async () => {
        const inputData: CreateStandardCommand = {
          name: 'My Complex Standard Name',
          description: 'Test description',
          rules: [{ content: 'Test rule' }],
          organizationId: createOrganizationId(uuidv4()).toString(),
          userId: createUserId(uuidv4()).toString(),
          spaceId: createSpaceId(uuidv4()).toString(),
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

        await createStandardUsecase.execute(inputData);

        expect(mockSlug).toHaveBeenCalledWith('My Complex Standard Name');
        expect(standardService.addStandard).toHaveBeenCalledWith({
          name: inputData.name,
          description: inputData.description,
          slug: 'my-complex-standard-name',
          version: 1,
          gitCommit: undefined,
          userId: createUserId(inputData.userId),
          spaceId: createSpaceId(inputData.spaceId),
          scope: null,
        });
      });

      it('generates correct slug for standard with special characters', async () => {
        const inputData: CreateStandardCommand = {
          name: 'Standard with "Special" Characters!',
          description: 'Test description',
          rules: [{ content: 'Test rule' }],
          organizationId: createOrganizationId(uuidv4()).toString(),
          userId: createUserId(uuidv4()).toString(),
          spaceId: createSpaceId(uuidv4()).toString(),
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

        await createStandardUsecase.execute(inputData);

        expect(mockSlug).toHaveBeenCalledWith(
          'Standard with "Special" Characters!',
        );
        expect(standardService.addStandard).toHaveBeenCalledWith({
          name: inputData.name,
          description: inputData.description,
          slug: 'standard-with-special-characters',
          version: 1,
          gitCommit: undefined,
          userId: createUserId(inputData.userId),
          spaceId: createSpaceId(inputData.spaceId),
          scope: null,
        });
      });
    });

    describe('with different rule configurations', () => {
      it('handles empty rules array', async () => {
        const inputData: CreateStandardCommand = {
          name: 'Standard Without Rules',
          description: 'A standard with no rules',
          rules: [],
          organizationId: createOrganizationId(uuidv4()).toString(),
          userId: createUserId(uuidv4()).toString(),
          spaceId: createSpaceId(uuidv4()).toString(),
          scope: null,
        };

        const createdStandard = standardFactory();
        const createdStandardVersion = standardVersionFactory();

        standardService.addStandard.mockResolvedValue(createdStandard);
        standardVersionService.addStandardVersion.mockResolvedValue(
          createdStandardVersion,
        );

        await createStandardUsecase.execute(inputData);

        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
          expect.objectContaining({ rules: [] }),
        );
      });

      it('handles multiple rules', async () => {
        const inputData: CreateStandardCommand = {
          name: 'Multi-Rule Standard',
          description: 'A standard with multiple rules',
          rules: [
            { content: 'Rule 1: Follow naming conventions' },
            { content: 'Rule 2: Write unit tests' },
            { content: 'Rule 3: Use TypeScript' },
            { content: 'Rule 4: Document your code' },
          ],
          organizationId: createOrganizationId(uuidv4()).toString(),
          userId: createUserId(uuidv4()).toString(),
          spaceId: createSpaceId(uuidv4()).toString(),
          scope: null,
        };

        const createdStandard = standardFactory();
        const createdStandardVersion = standardVersionFactory();

        standardService.addStandard.mockResolvedValue(createdStandard);
        standardVersionService.addStandardVersion.mockResolvedValue(
          createdStandardVersion,
        );

        await createStandardUsecase.execute(inputData);

        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            rules: [
              { content: 'Rule 1: Follow naming conventions', examples: [] },
              { content: 'Rule 2: Write unit tests', examples: [] },
              { content: 'Rule 3: Use TypeScript', examples: [] },
              { content: 'Rule 4: Document your code', examples: [] },
            ],
          }),
        );
      });
    });

    describe('with scope configuration', () => {
      describe('when scope is provided', () => {
        it('passes scope to StandardVersionService', async () => {
          const inputData: CreateStandardCommand = {
            name: 'Scoped Standard',
            description: 'A standard with specific scope',
            rules: [{ content: 'Test rule for TypeScript files' }],
            organizationId: createOrganizationId(uuidv4()).toString(),
            userId: createUserId(uuidv4()).toString(),
            spaceId: createSpaceId(uuidv4()).toString(),
            scope: '**/*.ts',
          };

          const createdStandard = standardFactory();
          const createdStandardVersion = standardVersionFactory();

          standardService.addStandard.mockResolvedValue(createdStandard);
          standardVersionService.addStandardVersion.mockResolvedValue(
            createdStandardVersion,
          );

          await createStandardUsecase.execute(inputData);

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
          const inputData: CreateStandardCommand = {
            name: 'Unscoped Standard',
            description: 'A standard without specific scope',
            rules: [{ content: 'Test rule for all files' }],
            organizationId: createOrganizationId(uuidv4()).toString(),
            userId: createUserId(uuidv4()).toString(),
            spaceId: createSpaceId(uuidv4()).toString(),
            scope: null,
          };

          const createdStandard = standardFactory();
          const createdStandardVersion = standardVersionFactory();

          standardService.addStandard.mockResolvedValue(createdStandard);
          standardVersionService.addStandardVersion.mockResolvedValue(
            createdStandardVersion,
          );

          await createStandardUsecase.execute(inputData);

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
        const inputData: CreateStandardCommand = {
          name: 'Test Standard',
          description: 'Test description',
          rules: [{ content: 'Test rule' }],
          organizationId: createOrganizationId(uuidv4()).toString(),
          userId: createUserId(uuidv4()).toString(),
          spaceId: createSpaceId(uuidv4()).toString(),
          scope: null,
        };

        const error = new Error('Database connection failed');
        standardService.addStandard.mockRejectedValue(error);

        await expect(createStandardUsecase.execute(inputData)).rejects.toThrow(
          'Database connection failed',
        );

        expect(standardService.addStandard).toHaveBeenCalledWith({
          name: inputData.name,
          description: inputData.description,
          slug: 'test-standard',
          version: 1,
          gitCommit: undefined,
          userId: createUserId(inputData.userId),
          spaceId: createSpaceId(inputData.spaceId),
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
        const inputData: CreateStandardCommand = {
          name: 'Test Standard',
          description: 'Test description',
          rules: [{ content: 'Test rule' }],
          organizationId: createOrganizationId(uuidv4()).toString(),
          userId: createUserId(uuidv4()).toString(),
          spaceId: createSpaceId(uuidv4()).toString(),
          scope: null,
        };

        const createdStandard = standardFactory();
        standardService.addStandard.mockResolvedValue(createdStandard);

        const error = new Error('Rule creation failed');
        standardVersionService.addStandardVersion.mockRejectedValue(error);

        await expect(createStandardUsecase.execute(inputData)).rejects.toThrow(
          'Rule creation failed',
        );

        expect(standardService.addStandard).toHaveBeenCalledTimes(1);
        expect(standardVersionService.addStandardVersion).toHaveBeenCalledTimes(
          1,
        );
      });
    });

    describe('when summary generation fails', () => {
      it('proceeds with standard creation using null summary', async () => {
        const inputData: CreateStandardCommand = {
          name: 'Test Standard',
          description: 'Test description',
          rules: [{ content: 'Test rule' }],
          organizationId: createOrganizationId(uuidv4()).toString(),
          userId: createUserId(uuidv4()).toString(),
          spaceId: createSpaceId(uuidv4()).toString(),
          scope: null,
        };

        const createdStandard = standardFactory();
        const createdStandardVersion = standardVersionFactory();

        standardService.addStandard.mockResolvedValue(createdStandard);
        standardVersionService.addStandardVersion.mockResolvedValue(
          createdStandardVersion,
        );

        const result = await createStandardUsecase.execute(inputData);

        expect(result).toEqual(createdStandard);
        expect(generateStandardSummaryDelayedJob.addJob).toHaveBeenCalledTimes(
          1,
        );
      });
    });

    describe('with scope parameter', () => {
      describe('when scope is provided', () => {
        it('passes scope to summary generation job', async () => {
          const inputData: CreateStandardCommand = {
            name: 'Scoped Standard',
            description: 'A standard with scope',
            rules: [{ content: 'Test rule for TypeScript files' }],
            organizationId: createOrganizationId(uuidv4()).toString(),
            userId: createUserId(uuidv4()).toString(),
            spaceId: createSpaceId(uuidv4()).toString(),
            scope: 'src/**/*.ts',
          };

          const createdStandard = standardFactory({ scope: 'src/**/*.ts' });
          const createdStandardVersion = standardVersionFactory({
            standardId: createdStandard.id,
            scope: 'src/**/*.ts',
          });

          standardService.addStandard.mockResolvedValue(createdStandard);
          standardVersionService.addStandardVersion.mockResolvedValue(
            createdStandardVersion,
          );

          await createStandardUsecase.execute(inputData);

          expect(generateStandardSummaryDelayedJob.addJob).toHaveBeenCalledWith(
            expect.objectContaining({
              standardVersion: expect.objectContaining({
                scope: 'src/**/*.ts',
              }),
            }),
          );
        });
      });
    });

    describe('slug uniqueness', () => {
      let createStandardUsecase: CreateStandardUsecase;
      let standardService: jest.Mocked<StandardService>;
      let standardVersionService: jest.Mocked<StandardVersionService>;
      let generateStandardSummaryDelayedJob: jest.Mocked<GenerateStandardSummaryDelayedJob>;
      let stubbedLogger: jest.Mocked<PackmindLogger>;

      beforeEach(() => {
        standardService = {
          addStandard: jest.fn(),
          getStandardById: jest.fn(),
          findStandardBySlug: jest.fn(),
          updateStandard: jest.fn(),
          deleteStandard: jest.fn(),
          listStandardsBySpace: jest.fn(),
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

        stubbedLogger = stubLogger();

        generateStandardSummaryDelayedJob.addJob.mockResolvedValue(
          'job-id-123',
        );

        // Default slug mock: lowercased with hyphens
        (slug as jest.MockedFunction<typeof slug>).mockImplementation(
          (input: string) => input.toLowerCase().replace(/\s+/g, '-'),
        );

        createStandardUsecase = new CreateStandardUsecase(
          standardService,
          standardVersionService,
          generateStandardSummaryDelayedJob,
          stubbedLogger,
        );
      });

      afterEach(() => {
        jest.clearAllMocks();
      });

      it('uses base slug if no existing standards conflict', async () => {
        const inputData: CreateStandardCommand = {
          name: 'Unique Name',
          description: 'Desc',
          rules: [{ content: 'R1' }],
          organizationId: createOrganizationId(uuidv4()).toString(),
          userId: createUserId(uuidv4()).toString(),
          spaceId: createSpaceId(uuidv4()).toString(),
          scope: null,
        };

        // No existing standards in the organization
        standardService.listStandardsBySpace.mockResolvedValue([]);

        const createdStandard = standardFactory({
          slug: 'unique-name',
          name: inputData.name,
          description: inputData.description,
          version: 1,
        });
        const createdVersion = standardVersionFactory({
          standardId: createdStandard.id,
          slug: 'unique-name',
          name: inputData.name,
          description: inputData.description,
          version: 1,
        });

        standardService.addStandard.mockResolvedValue(createdStandard);
        standardVersionService.addStandardVersion.mockResolvedValue(
          createdVersion,
        );

        await createStandardUsecase.execute(inputData);

        expect(standardService.listStandardsBySpace).toHaveBeenCalledWith(
          inputData.spaceId,
        );
        expect(standardService.addStandard).toHaveBeenCalledWith(
          expect.objectContaining({ slug: 'unique-name' }),
        );
        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
          expect.objectContaining({ slug: 'unique-name' }),
        );
      });

      it('increments slug with -1 if base slug exists in organization', async () => {
        const inputData: CreateStandardCommand = {
          name: 'Test Standard', // base slug: test-standard
          description: 'Desc',
          rules: [{ content: 'R1' }],
          organizationId: createOrganizationId(uuidv4()).toString(),
          userId: createUserId(uuidv4()).toString(),
          spaceId: createSpaceId(uuidv4()).toString(),
          scope: null,
        };

        // Existing standard uses the base slug already
        const existingA = standardFactory({ slug: 'test-standard' });
        standardService.listStandardsBySpace.mockResolvedValue([existingA]);

        const createdStandard = standardFactory({ slug: 'test-standard-1' });
        const createdVersion = standardVersionFactory({
          slug: 'test-standard-1',
        });

        standardService.addStandard.mockResolvedValue(createdStandard);
        standardVersionService.addStandardVersion.mockResolvedValue(
          createdVersion,
        );

        await createStandardUsecase.execute(inputData);

        expect(standardService.addStandard).toHaveBeenCalledWith(
          expect.objectContaining({ slug: 'test-standard-1' }),
        );
        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
          expect.objectContaining({ slug: 'test-standard-1' }),
        );
      });

      it('increments slug with next available suffix if -1 is also taken', async () => {
        const inputData: CreateStandardCommand = {
          name: 'Test Standard', // base slug: test-standard
          description: 'Desc',
          rules: [{ content: 'R1' }],
          organizationId: createOrganizationId(uuidv4()).toString(),
          userId: createUserId(uuidv4()).toString(),
          spaceId: createSpaceId(uuidv4()).toString(),
          scope: null,
        };

        // Existing standards occupy base and -1
        const existingBase = standardFactory({ slug: 'test-standard' });
        const existingOne = standardFactory({ slug: 'test-standard-1' });
        standardService.listStandardsBySpace.mockResolvedValue([
          existingBase,
          existingOne,
        ]);

        const createdStandard = standardFactory();
        const createdVersion = standardVersionFactory();

        standardService.addStandard.mockResolvedValue(createdStandard);
        standardVersionService.addStandardVersion.mockResolvedValue(
          createdVersion,
        );

        await createStandardUsecase.execute(inputData);

        expect(standardService.addStandard).toHaveBeenCalledWith(
          expect.objectContaining({ slug: 'test-standard-2' }),
        );
        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
          expect.objectContaining({ slug: 'test-standard-2' }),
        );
      });
    });
  });
});
