import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  CreateStandardSamplesCommand,
  CreateStandardSamplesResponse,
  IAccountsPort,
  IStandardsPort,
  Organization,
  OrganizationId,
  SpaceId,
  StandardSampleSelectedEvent,
  User,
  UserId,
  createOrganizationId,
  createSpaceId,
  createUserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { standardFactory } from '../../../../test/standardFactory';
import * as samplesModule from '../../../../samples';
import { CreateStandardSamplesUsecase } from './createStandardSamples.usecase';

jest.mock('../../../../samples');

describe('CreateStandardSamplesUsecase', () => {
  let usecase: CreateStandardSamplesUsecase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let standardsPort: jest.Mocked<IStandardsPort>;
  let eventEmitterService: jest.Mocked<PackmindEventEmitterService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  let testUserId: UserId;
  let testOrganizationId: OrganizationId;
  let testSpaceId: SpaceId;

  beforeEach(() => {
    testUserId = createUserId(uuidv4());
    testOrganizationId = createOrganizationId(uuidv4());
    testSpaceId = createSpaceId(uuidv4());

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

    accountsPort = {
      getUserById: jest.fn().mockResolvedValue(user),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    standardsPort = {
      createStandardWithExamples: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    eventEmitterService = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    stubbedLogger = stubLogger();

    usecase = new CreateStandardSamplesUsecase(
      accountsPort,
      standardsPort,
      eventEmitterService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeForMembers', () => {
    describe('when all samples are created successfully', () => {
      let command: CreateStandardSamplesCommand;
      let result: CreateStandardSamplesResponse;

      beforeEach(async () => {
        const javaSample = {
          name: 'Java Best Practices',
          summary: 'Essential Java coding practices for robust applications',
          description: 'Java coding standards',
          scope: 'Java source files',
          rules: [
            {
              content: 'Use try-with-resources',
              examples: {
                positive: 'try (Stream s = ...) {}',
                negative: 'Stream s = ...; s.close();',
                language: 'JAVA',
              },
            },
          ],
        };

        const springSample = {
          name: 'Spring Best Practices',
          summary: 'Core Spring framework patterns for maintainable code',
          description: 'Spring framework standards',
          scope: 'Spring applications',
          rules: [
            {
              content: 'Use constructor injection',
              examples: {
                positive: '@Autowired public MyService(Dep d) {}',
                negative: '@Autowired private Dep d;',
                language: 'JAVA',
              },
            },
          ],
        };

        jest.spyOn(samplesModule, 'sampleExists').mockReturnValue(true);
        jest
          .spyOn(samplesModule, 'getStandardSample')
          .mockImplementation((id: string) => {
            if (id === 'java') return Promise.resolve(javaSample);
            if (id === 'spring') return Promise.resolve(springSample);
            return Promise.resolve(null);
          });

        const javaStandard = standardFactory({ name: 'Java Best Practices' });
        const springStandard = standardFactory({
          name: 'Spring Best Practices',
        });

        standardsPort.createStandardWithExamples
          .mockResolvedValueOnce(javaStandard)
          .mockResolvedValueOnce(springStandard);

        command = {
          userId: testUserId.toString(),
          organizationId: testOrganizationId,
          spaceId: testSpaceId,
          samples: [
            { type: 'language', id: 'java' },
            { type: 'framework', id: 'spring' },
          ],
        };

        result = await usecase.execute(command);
      });

      it('creates two standards', () => {
        expect(standardsPort.createStandardWithExamples).toHaveBeenCalledTimes(
          2,
        );
      });

      it('creates java standard with correct parameters', () => {
        expect(standardsPort.createStandardWithExamples).toHaveBeenCalledWith({
          name: 'Java Best Practices',
          description: 'Java coding standards',
          summary: 'Essential Java coding practices for robust applications',
          rules: [
            {
              content: 'Use try-with-resources',
              examples: [
                {
                  positive: 'try (Stream s = ...) {}',
                  negative: 'Stream s = ...; s.close();',
                  language: 'JAVA',
                },
              ],
            },
          ],
          organizationId: testOrganizationId,
          userId: testUserId,
          scope: 'Java source files',
          spaceId: testSpaceId,
          disableTriggerAssessment: true,
          source: 'SAMPLE_IMPORT',
        });
      });

      it('creates spring standard with correct parameters', () => {
        expect(standardsPort.createStandardWithExamples).toHaveBeenCalledWith({
          name: 'Spring Best Practices',
          description: 'Spring framework standards',
          summary: 'Core Spring framework patterns for maintainable code',
          rules: [
            {
              content: 'Use constructor injection',
              examples: [
                {
                  positive: '@Autowired public MyService(Dep d) {}',
                  negative: '@Autowired private Dep d;',
                  language: 'JAVA',
                },
              ],
            },
          ],
          organizationId: testOrganizationId,
          userId: testUserId,
          scope: 'Spring applications',
          spaceId: testSpaceId,
          disableTriggerAssessment: true,
          source: 'SAMPLE_IMPORT',
        });
      });

      it('returns two created standards', () => {
        expect(result.created).toHaveLength(2);
      });

      it('returns no errors', () => {
        expect(result.errors).toHaveLength(0);
      });

      it('emits StandardSampleSelectedEvent for each sample', () => {
        expect(eventEmitterService.emit).toHaveBeenCalledTimes(2);
      });

      it('emits event with correct payload for java sample', () => {
        expect(eventEmitterService.emit).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({
              sampleId: 'java',
              sampleType: 'language',
              spaceId: testSpaceId,
              organizationId: testOrganizationId,
              userId: testUserId,
              source: 'ui',
            }),
          }),
        );
      });

      it('emits event with correct payload for spring sample', () => {
        expect(eventEmitterService.emit).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({
              sampleId: 'spring',
              sampleType: 'framework',
              spaceId: testSpaceId,
              organizationId: testOrganizationId,
              userId: testUserId,
              source: 'ui',
            }),
          }),
        );
      });

      it('emits StandardSampleSelectedEvent instances', () => {
        expect(eventEmitterService.emit).toHaveBeenCalledWith(
          expect.any(StandardSampleSelectedEvent),
        );
      });
    });

    describe('when sample file does not exist', () => {
      let command: CreateStandardSamplesCommand;
      let result: CreateStandardSamplesResponse;

      beforeEach(async () => {
        jest.spyOn(samplesModule, 'sampleExists').mockReturnValue(false);

        command = {
          userId: testUserId.toString(),
          organizationId: testOrganizationId,
          samples: [{ type: 'language', id: 'nonexistent' }],
        };

        result = await usecase.execute(command);
      });

      it('adds error to errors array with correct details', () => {
        expect(result.errors[0]).toEqual({
          sampleId: 'nonexistent',
          type: 'language',
          error: 'Sample file not found: nonexistent',
        });
      });

      it('returns one error', () => {
        expect(result.errors).toHaveLength(1);
      });

      it('returns empty created array', () => {
        expect(result.created).toHaveLength(0);
      });

      it('does not call createStandardWithExamples', () => {
        expect(standardsPort.createStandardWithExamples).not.toHaveBeenCalled();
      });

      it('still emits event for each sample', () => {
        expect(eventEmitterService.emit).toHaveBeenCalledTimes(1);
      });
    });

    describe('when sample loading fails', () => {
      let command: CreateStandardSamplesCommand;
      let result: CreateStandardSamplesResponse;

      beforeEach(async () => {
        jest.spyOn(samplesModule, 'sampleExists').mockReturnValue(true);
        jest.spyOn(samplesModule, 'getStandardSample').mockResolvedValue(null);

        command = {
          userId: testUserId.toString(),
          organizationId: testOrganizationId,
          samples: [{ type: 'framework', id: 'broken' }],
        };

        result = await usecase.execute(command);
      });

      it('adds error to errors array with correct details', () => {
        expect(result.errors[0]).toEqual({
          sampleId: 'broken',
          type: 'framework',
          error: 'Failed to load sample content: broken',
        });
      });

      it('returns one error', () => {
        expect(result.errors).toHaveLength(1);
      });

      it('returns empty created array', () => {
        expect(result.created).toHaveLength(0);
      });

      it('does not call createStandardWithExamples', () => {
        expect(standardsPort.createStandardWithExamples).not.toHaveBeenCalled();
      });
    });

    describe('when standard creation fails', () => {
      let command: CreateStandardSamplesCommand;
      let result: CreateStandardSamplesResponse;

      beforeEach(async () => {
        const javaSample = {
          name: 'Java Best Practices',
          summary: 'Essential Java coding practices for robust applications',
          description: 'Java coding standards',
          scope: 'Java source files',
          rules: [
            {
              content: 'Use try-with-resources',
              examples: {
                positive: 'try (Stream s = ...) {}',
                negative: 'Stream s = ...; s.close();',
                language: 'JAVA',
              },
            },
          ],
        };

        jest.spyOn(samplesModule, 'sampleExists').mockReturnValue(true);
        jest
          .spyOn(samplesModule, 'getStandardSample')
          .mockResolvedValue(javaSample);

        standardsPort.createStandardWithExamples.mockRejectedValue(
          new Error('Database error'),
        );

        command = {
          userId: testUserId.toString(),
          organizationId: testOrganizationId,
          samples: [{ type: 'language', id: 'java' }],
        };

        result = await usecase.execute(command);
      });

      it('adds error to errors array with correct details', () => {
        expect(result.errors[0]).toEqual({
          sampleId: 'java',
          type: 'language',
          error: 'Database error',
        });
      });

      it('returns one error', () => {
        expect(result.errors).toHaveLength(1);
      });

      it('returns empty created array', () => {
        expect(result.created).toHaveLength(0);
      });
    });

    describe('when partial failures occur', () => {
      let command: CreateStandardSamplesCommand;
      let result: CreateStandardSamplesResponse;

      beforeEach(async () => {
        const javaSample = {
          name: 'Java Best Practices',
          summary: 'Essential Java coding practices for robust applications',
          description: 'Java coding standards',
          scope: 'Java source files',
          rules: [
            {
              content: 'Use try-with-resources',
              examples: {
                positive: 'try (Stream s = ...) {}',
                negative: 'Stream s = ...; s.close();',
                language: 'JAVA',
              },
            },
          ],
        };

        jest
          .spyOn(samplesModule, 'sampleExists')
          .mockImplementation((id: string) => id === 'java');
        jest
          .spyOn(samplesModule, 'getStandardSample')
          .mockImplementation((id: string) => {
            if (id === 'java') return Promise.resolve(javaSample);
            return Promise.resolve(null);
          });

        const javaStandard = standardFactory({ name: 'Java Best Practices' });
        standardsPort.createStandardWithExamples.mockResolvedValue(
          javaStandard,
        );

        command = {
          userId: testUserId.toString(),
          organizationId: testOrganizationId,
          samples: [
            { type: 'language', id: 'java' },
            { type: 'framework', id: 'nonexistent' },
          ],
        };

        result = await usecase.execute(command);
      });

      it('returns one created standard', () => {
        expect(result.created).toHaveLength(1);
      });

      it('returns one error', () => {
        expect(result.errors).toHaveLength(1);
      });

      it('error is for nonexistent sample', () => {
        expect(result.errors[0].sampleId).toBe('nonexistent');
      });
    });

    describe('when samples array is empty', () => {
      let command: CreateStandardSamplesCommand;
      let result: CreateStandardSamplesResponse;

      beforeEach(async () => {
        command = {
          userId: testUserId.toString(),
          organizationId: testOrganizationId,
          samples: [],
        };

        result = await usecase.execute(command);
      });

      it('returns empty created array', () => {
        expect(result.created).toHaveLength(0);
      });

      it('returns empty errors array', () => {
        expect(result.errors).toHaveLength(0);
      });

      it('does not call createStandardWithExamples', () => {
        expect(standardsPort.createStandardWithExamples).not.toHaveBeenCalled();
      });

      it('does not emit any events', () => {
        expect(eventEmitterService.emit).not.toHaveBeenCalled();
      });
    });

    describe('when rule has no examples', () => {
      let command: CreateStandardSamplesCommand;
      let result: CreateStandardSamplesResponse;

      beforeEach(async () => {
        const javaSample = {
          name: 'Java Best Practices',
          summary: 'Essential Java coding practices for robust applications',
          description: 'Java coding standards',
          scope: 'Java source files',
          rules: [
            {
              content: 'Use try-with-resources',
            },
          ],
        };

        jest.spyOn(samplesModule, 'sampleExists').mockReturnValue(true);
        jest
          .spyOn(samplesModule, 'getStandardSample')
          .mockResolvedValue(javaSample);

        const javaStandard = standardFactory({ name: 'Java Best Practices' });
        standardsPort.createStandardWithExamples.mockResolvedValue(
          javaStandard,
        );

        command = {
          userId: testUserId.toString(),
          organizationId: testOrganizationId,
          samples: [{ type: 'language', id: 'java' }],
        };

        result = await usecase.execute(command);
      });

      it('creates standard with empty examples array', () => {
        expect(standardsPort.createStandardWithExamples).toHaveBeenCalledWith(
          expect.objectContaining({
            rules: [
              {
                content: 'Use try-with-resources',
                examples: [],
              },
            ],
          }),
        );
      });

      it('returns created standard', () => {
        expect(result.created).toHaveLength(1);
      });

      it('returns no errors', () => {
        expect(result.errors).toHaveLength(0);
      });
    });
  });
});
