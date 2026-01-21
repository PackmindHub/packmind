import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  CreateStandardCommand,
  CreateStandardResponse,
  IAccountsPort,
  Organization,
  OrganizationId,
  RuleAddedEvent,
  StandardCreatedEvent,
  User,
  UserId,
  createOrganizationId,
  createSpaceId,
  createUserId,
} from '@packmind/types';
import slug from 'slug';
import { v4 as uuidv4 } from 'uuid';
import { standardFactory } from '../../../../test/standardFactory';
import { standardVersionFactory } from '../../../../test/standardVersionFactory';
import { ruleFactory } from '../../../../test/ruleFactory';
import { Standard, createStandardId } from '@packmind/types';
import { StandardVersion, createStandardVersionId } from '@packmind/types';
import { Rule } from '@packmind/types';
import { IRuleRepository } from '../../../domain/repositories/IRuleRepository';
import { GenerateStandardSummaryDelayedJob } from '../../jobs/GenerateStandardSummaryDelayedJob';
import { StandardService } from '../../services/StandardService';
import { StandardVersionService } from '../../services/StandardVersionService';
import { CreateStandardUsecase } from './createStandard.usecase';

// Mock external dependencies
jest.mock('slug');

const mockSlug = slug as jest.MockedFunction<typeof slug>;

describe('CreateStandardUsecase', () => {
  let createStandardUsecase: CreateStandardUsecase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let standardService: jest.Mocked<StandardService>;
  let standardVersionService: jest.Mocked<StandardVersionService>;
  let generateStandardSummaryDelayedJob: jest.Mocked<GenerateStandardSummaryDelayedJob>;
  let eventEmitterService: jest.Mocked<PackmindEventEmitterService>;
  let ruleRepository: jest.Mocked<IRuleRepository>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  let testUserId: UserId;
  let testOrganizationId: OrganizationId;

  beforeEach(() => {
    testUserId = createUserId(uuidv4());
    testOrganizationId = createOrganizationId(uuidv4());

    const user: User = {
      id: testUserId,
      email: 'test@example.com',
      passwordHash: 'hashed_password',
      memberships: [
        {
          organizationId: testOrganizationId,
          role: 'member',
          userId: testUserId,
        },
      ],
      active: true,
    };

    const organization: Organization = {
      id: testOrganizationId,
      name: 'Test Org',
      slug: 'test-org',
    };

    // Mock AccountsPort
    accountsPort = {
      getUserById: jest.fn().mockResolvedValue(user),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

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

    eventEmitterService = {
      emit: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    ruleRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      findByStandardVersionId: jest.fn(),
      updateById: jest.fn(),
      deleteById: jest.fn(),
    } as unknown as jest.Mocked<IRuleRepository>;

    stubbedLogger = stubLogger();
    generateStandardSummaryDelayedJob.addJob.mockResolvedValue('job-id-123');

    standardService.listStandardsBySpace.mockResolvedValue([]);
    ruleRepository.findByStandardVersionId.mockResolvedValue([]);

    createStandardUsecase = new CreateStandardUsecase(
      accountsPort,
      standardService,
      standardVersionService,
      generateStandardSummaryDelayedJob,
      eventEmitterService,
      ruleRepository,
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
      let result: CreateStandardResponse;

      beforeEach(async () => {
        inputData = {
          name: 'Test Standard',
          description: 'Test standard description',
          rules: [
            { content: 'Rule 1: Use proper naming conventions' },
            { content: 'Rule 2: Write comprehensive tests' },
          ],
          organizationId: testOrganizationId,
          userId: testUserId.toString(),
          spaceId: createSpaceId(uuidv4()),
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

      it('calls StandardService.addStandard exactly once', () => {
        expect(standardService.addStandard).toHaveBeenCalledTimes(1);
      });

      it('calls StandardVersionService.addStandardVersion exactly once', () => {
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

      it('returns the created standard wrapped in response object', () => {
        expect(result).toEqual({ standard: createdStandard });
      });

      it('creates standard with version 1', () => {
        expect(standardService.addStandard).toHaveBeenCalledWith(
          expect.objectContaining({ version: 1 }),
        );
      });

      it('creates standard version with version 1', () => {
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
      describe('when standard name has spaces', () => {
        let inputData: CreateStandardCommand;

        beforeEach(async () => {
          inputData = {
            name: 'My Complex Standard Name',
            description: 'Test description',
            rules: [{ content: 'Test rule' }],
            organizationId: testOrganizationId,
            userId: testUserId.toString(),
            spaceId: createSpaceId(uuidv4()),
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
        });

        it('calls slug with the original name', () => {
          expect(mockSlug).toHaveBeenCalledWith('My Complex Standard Name');
        });

        it('calls addStandard with correct slug', () => {
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
      });

      describe('when standard name has special characters', () => {
        let inputData: CreateStandardCommand;

        beforeEach(async () => {
          inputData = {
            name: 'Standard with "Special" Characters!',
            description: 'Test description',
            rules: [{ content: 'Test rule' }],
            organizationId: testOrganizationId,
            userId: testUserId.toString(),
            spaceId: createSpaceId(uuidv4()),
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
        });

        it('calls slug with the original name including special characters', () => {
          expect(mockSlug).toHaveBeenCalledWith(
            'Standard with "Special" Characters!',
          );
        });

        it('calls addStandard with sanitized slug', () => {
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
    });

    describe('with different rule configurations', () => {
      it('handles empty rules array', async () => {
        const inputData: CreateStandardCommand = {
          name: 'Standard Without Rules',
          description: 'A standard with no rules',
          rules: [],
          organizationId: testOrganizationId,
          userId: testUserId.toString(),
          spaceId: createSpaceId(uuidv4()),
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
          organizationId: testOrganizationId,
          userId: testUserId.toString(),
          spaceId: createSpaceId(uuidv4()),
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
            organizationId: testOrganizationId,
            userId: testUserId.toString(),
            spaceId: createSpaceId(uuidv4()),
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
            organizationId: testOrganizationId,
            userId: testUserId.toString(),
            spaceId: createSpaceId(uuidv4()),
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
      let inputData: CreateStandardCommand;
      let thrownError: Error | undefined;

      beforeEach(async () => {
        inputData = {
          name: 'Test Standard',
          description: 'Test description',
          rules: [{ content: 'Test rule' }],
          organizationId: testOrganizationId,
          userId: testUserId.toString(),
          spaceId: createSpaceId(uuidv4()),
          scope: null,
        };

        const error = new Error('Database connection failed');
        standardService.addStandard.mockRejectedValue(error);

        try {
          await createStandardUsecase.execute(inputData);
        } catch (e) {
          thrownError = e as Error;
        }
      });

      it('throws an error with correct message', () => {
        expect(thrownError?.message).toBe('Database connection failed');
      });

      it('calls addStandard with correct parameters', () => {
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
      });

      it('does not call addStandardVersion', () => {
        expect(
          standardVersionService.addStandardVersion,
        ).not.toHaveBeenCalled();
      });
    });

    describe('when standard version creation fails', () => {
      let thrownError: Error | undefined;

      beforeEach(async () => {
        const inputData: CreateStandardCommand = {
          name: 'Test Standard',
          description: 'Test description',
          rules: [{ content: 'Test rule' }],
          organizationId: testOrganizationId,
          userId: testUserId.toString(),
          spaceId: createSpaceId(uuidv4()),
          scope: null,
        };

        const createdStandard = standardFactory();
        standardService.addStandard.mockResolvedValue(createdStandard);

        const error = new Error('Rule creation failed');
        standardVersionService.addStandardVersion.mockRejectedValue(error);

        try {
          await createStandardUsecase.execute(inputData);
        } catch (e) {
          thrownError = e as Error;
        }
      });

      it('throws an error with correct message', () => {
        expect(thrownError?.message).toBe('Rule creation failed');
      });

      it('calls addStandard exactly once', () => {
        expect(standardService.addStandard).toHaveBeenCalledTimes(1);
      });

      it('calls addStandardVersion exactly once', () => {
        expect(standardVersionService.addStandardVersion).toHaveBeenCalledTimes(
          1,
        );
      });
    });

    describe('when summary generation fails', () => {
      let inputData: CreateStandardCommand;
      let createdStandard: Standard;
      let result: CreateStandardResponse;

      beforeEach(async () => {
        inputData = {
          name: 'Test Standard',
          description: 'Test description',
          rules: [{ content: 'Test rule' }],
          organizationId: testOrganizationId,
          userId: testUserId.toString(),
          spaceId: createSpaceId(uuidv4()),
          scope: null,
        };

        createdStandard = standardFactory();
        const createdStandardVersion = standardVersionFactory();

        standardService.addStandard.mockResolvedValue(createdStandard);
        standardVersionService.addStandardVersion.mockResolvedValue(
          createdStandardVersion,
        );

        result = await createStandardUsecase.execute(inputData);
      });

      it('returns created standard', () => {
        expect(result).toEqual({ standard: createdStandard });
      });

      it('queues summary generation job', () => {
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
            organizationId: testOrganizationId,
            userId: testUserId.toString(),
            spaceId: createSpaceId(uuidv4()),
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

    describe('event emission', () => {
      describe('when standard is created with rules', () => {
        let inputData: CreateStandardCommand;
        let createdStandard: Standard;
        let createdStandardVersion: StandardVersion;
        let createdRules: Rule[];

        beforeEach(async () => {
          inputData = {
            name: 'Test Standard',
            description: 'Test description',
            rules: [{ content: 'Rule 1' }, { content: 'Rule 2' }],
            organizationId: testOrganizationId,
            userId: testUserId.toString(),
            spaceId: createSpaceId(uuidv4()),
            scope: null,
          };

          createdStandard = standardFactory({
            id: createStandardId(uuidv4()),
            name: inputData.name,
          });

          createdStandardVersion = standardVersionFactory({
            id: createStandardVersionId(uuidv4()),
            standardId: createdStandard.id,
            version: 1,
          });

          createdRules = [
            ruleFactory({
              id: uuidv4(),
              standardVersionId: createdStandardVersion.id,
            }),
            ruleFactory({
              id: uuidv4(),
              standardVersionId: createdStandardVersion.id,
            }),
          ];

          standardService.addStandard.mockResolvedValue(createdStandard);
          standardVersionService.addStandardVersion.mockResolvedValue(
            createdStandardVersion,
          );
          ruleRepository.findByStandardVersionId.mockResolvedValue(
            createdRules,
          );

          await createStandardUsecase.execute(inputData);
        });

        it('emits correct number of events', () => {
          expect(eventEmitterService.emit).toHaveBeenCalledTimes(3);
        });

        it('emits StandardCreatedEvent as first event', () => {
          const firstCall = eventEmitterService.emit.mock.calls[0][0];
          expect(firstCall).toBeInstanceOf(StandardCreatedEvent);
        });

        it('emits RuleAddedEvent for each rule', () => {
          const secondCall = eventEmitterService.emit.mock.calls[1][0];
          expect(secondCall).toBeInstanceOf(RuleAddedEvent);
        });
      });

      describe('when querying rules repository', () => {
        let inputData: CreateStandardCommand;
        let createdStandardVersion: StandardVersion;

        beforeEach(async () => {
          inputData = {
            name: 'Test Standard',
            description: 'Test description',
            rules: [{ content: 'Rule 1' }],
            organizationId: testOrganizationId,
            userId: testUserId.toString(),
            spaceId: createSpaceId(uuidv4()),
            scope: null,
          };

          const createdStandard = standardFactory();
          createdStandardVersion = standardVersionFactory({
            id: createStandardVersionId(uuidv4()),
          });

          standardService.addStandard.mockResolvedValue(createdStandard);
          standardVersionService.addStandardVersion.mockResolvedValue(
            createdStandardVersion,
          );
          ruleRepository.findByStandardVersionId.mockResolvedValue([
            ruleFactory({ standardVersionId: createdStandardVersion.id }),
          ]);

          await createStandardUsecase.execute(inputData);
        });

        it('calls findByStandardVersionId with correct standardVersionId', () => {
          expect(ruleRepository.findByStandardVersionId).toHaveBeenCalledWith(
            createStandardVersionId(createdStandardVersion.id),
          );
        });
      });

      describe('when standard is created without rules', () => {
        let inputData: CreateStandardCommand;

        beforeEach(async () => {
          inputData = {
            name: 'Test Standard',
            description: 'Test description',
            rules: [],
            organizationId: testOrganizationId,
            userId: testUserId.toString(),
            spaceId: createSpaceId(uuidv4()),
            scope: null,
          };

          const createdStandard = standardFactory();
          const createdStandardVersion = standardVersionFactory();

          standardService.addStandard.mockResolvedValue(createdStandard);
          standardVersionService.addStandardVersion.mockResolvedValue(
            createdStandardVersion,
          );
          ruleRepository.findByStandardVersionId.mockResolvedValue([]);

          await createStandardUsecase.execute(inputData);
        });

        it('emits only one event', () => {
          expect(eventEmitterService.emit).toHaveBeenCalledTimes(1);
        });

        it('emits StandardCreatedEvent', () => {
          const firstCall = eventEmitterService.emit.mock.calls[0][0];
          expect(firstCall).toBeInstanceOf(StandardCreatedEvent);
        });
      });
    });

    describe('slug uniqueness', () => {
      let createStandardUsecase: CreateStandardUsecase;
      let standardService: jest.Mocked<StandardService>;
      let standardVersionService: jest.Mocked<StandardVersionService>;
      let generateStandardSummaryDelayedJob: jest.Mocked<GenerateStandardSummaryDelayedJob>;
      let eventEmitterService: jest.Mocked<PackmindEventEmitterService>;
      let ruleRepository: jest.Mocked<IRuleRepository>;
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

        eventEmitterService = {
          emit: jest.fn().mockReturnValue(true),
        } as unknown as jest.Mocked<PackmindEventEmitterService>;

        ruleRepository = {
          add: jest.fn(),
          findById: jest.fn(),
          findByStandardVersionId: jest.fn().mockResolvedValue([]),
          updateById: jest.fn(),
          deleteById: jest.fn(),
        } as unknown as jest.Mocked<IRuleRepository>;

        createStandardUsecase = new CreateStandardUsecase(
          accountsPort,
          standardService,
          standardVersionService,
          generateStandardSummaryDelayedJob,
          eventEmitterService,
          ruleRepository,
          stubbedLogger,
        );
      });

      afterEach(() => {
        jest.clearAllMocks();
      });

      describe('when no existing standards conflict', () => {
        let inputData: CreateStandardCommand;

        beforeEach(async () => {
          inputData = {
            name: 'Unique Name',
            description: 'Desc',
            rules: [{ content: 'R1' }],
            organizationId: testOrganizationId,
            userId: testUserId.toString(),
            spaceId: createSpaceId(uuidv4()),
            scope: null,
          };

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
        });

        it('queries standards by space', () => {
          expect(standardService.listStandardsBySpace).toHaveBeenCalledWith(
            inputData.spaceId,
          );
        });

        it('uses base slug for standard', () => {
          expect(standardService.addStandard).toHaveBeenCalledWith(
            expect.objectContaining({ slug: 'unique-name' }),
          );
        });

        it('uses base slug for standard version', () => {
          expect(
            standardVersionService.addStandardVersion,
          ).toHaveBeenCalledWith(
            expect.objectContaining({ slug: 'unique-name' }),
          );
        });
      });

      describe('when base slug exists in organization', () => {
        beforeEach(async () => {
          const inputData: CreateStandardCommand = {
            name: 'Test Standard',
            description: 'Desc',
            rules: [{ content: 'R1' }],
            organizationId: testOrganizationId,
            userId: testUserId.toString(),
            spaceId: createSpaceId(uuidv4()),
            scope: null,
          };

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
        });

        it('increments slug with -1 for standard', () => {
          expect(standardService.addStandard).toHaveBeenCalledWith(
            expect.objectContaining({ slug: 'test-standard-1' }),
          );
        });

        it('increments slug with -1 for standard version', () => {
          expect(
            standardVersionService.addStandardVersion,
          ).toHaveBeenCalledWith(
            expect.objectContaining({ slug: 'test-standard-1' }),
          );
        });
      });

      describe('when base slug and -1 are both taken', () => {
        beforeEach(async () => {
          const inputData: CreateStandardCommand = {
            name: 'Test Standard',
            description: 'Desc',
            rules: [{ content: 'R1' }],
            organizationId: testOrganizationId,
            userId: testUserId.toString(),
            spaceId: createSpaceId(uuidv4()),
            scope: null,
          };

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
        });

        it('increments slug with -2 for standard', () => {
          expect(standardService.addStandard).toHaveBeenCalledWith(
            expect.objectContaining({ slug: 'test-standard-2' }),
          );
        });

        it('increments slug with -2 for standard version', () => {
          expect(
            standardVersionService.addStandardVersion,
          ).toHaveBeenCalledWith(
            expect.objectContaining({ slug: 'test-standard-2' }),
          );
        });
      });
    });
  });
});
