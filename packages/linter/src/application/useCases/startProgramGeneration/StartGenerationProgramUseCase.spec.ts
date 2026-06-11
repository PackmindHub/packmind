import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger } from '@packmind/logger';
import { createOrganizationId, createUserId } from '@packmind/types';
import {
  DetectionStatus,
  ILinterPort,
  IStandardsPort,
  ProgrammingLanguage,
  RuleExample,
  createActiveDetectionProgramId,
  createDetectionProgramId,
  createRuleId,
  createRuleExampleId,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { StartGenerationProgramUseCase } from './StartGenerationProgramUseCase';
import { GenerateProgramDelayedJob } from '../generateProgramUseCase/shared/GenerateProgramDelayedJob';
import { detectionProgramFactory } from '../../../../test';

const organizationId = createOrganizationId(uuidv4());
const userId = createUserId(uuidv4());
const ruleId = createRuleId(uuidv4());
const language = ProgrammingLanguage.TYPESCRIPT;

const sampleExample: RuleExample = {
  id: createRuleExampleId(uuidv4()),
  lang: language,
  ruleId,
  negative: 'console.log("bad")',
  positive: 'console.log("good")',
};

describe('StartGenerationProgramUseCase', () => {
  let logger: jest.Mocked<PackmindLogger>;
  let generateProgramDelayedJob: jest.Mocked<GenerateProgramDelayedJob>;
  let standardsAdapter: jest.Mocked<IStandardsPort>;
  let linterAdapter: jest.Mocked<ILinterPort>;

  beforeEach(() => {
    logger = stubLogger();

    generateProgramDelayedJob = {
      addJob: jest.fn().mockResolvedValue('job-1'),
    } as unknown as jest.Mocked<GenerateProgramDelayedJob>;

    standardsAdapter = {
      getRule: jest.fn().mockResolvedValue({
        id: ruleId,
        content: 'Example rule',
        standardVersionId: ruleId,
      }),
      getStandardVersion: jest.fn().mockResolvedValue({
        id: ruleId,
        standardId: ruleId,
      }),
      getStandard: jest.fn().mockResolvedValue({
        id: ruleId,
        name: 'Example standard',
        organizationId,
      }),
      getRuleCodeExamples: jest.fn().mockResolvedValue([sampleExample]),
    } as unknown as jest.Mocked<IStandardsPort>;

    linterAdapter = {
      getActiveDetectionProgram: jest.fn(),
      createNewDetectionProgramVersion: jest.fn(),
      updateActiveDetectionProgram: jest.fn(),
      createDetectionProgram: jest.fn(),
    } as unknown as jest.Mocked<ILinterPort>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const buildUseCase = () =>
    new StartGenerationProgramUseCase(
      generateProgramDelayedJob,
      standardsAdapter,
      () => linterAdapter,
      logger,
    );

  it('creates new detection program version and queues job if an active program exists', async () => {
    const activeDetectionProgramId = createActiveDetectionProgramId(uuidv4());
    const existingDraftId = createDetectionProgramId(uuidv4());
    const newDetectionProgram = detectionProgramFactory({
      ruleId,
      language,
    });

    linterAdapter.getActiveDetectionProgram.mockResolvedValue({
      programs: [
        {
          id: activeDetectionProgramId,
          detectionProgramVersion: createDetectionProgramId(uuidv4()),
          detectionProgramDraftVersion: existingDraftId,
          ruleId,
          language,
          detectionProgram: null,
          draftDetectionProgram: null,
        },
      ],
    });

    linterAdapter.createNewDetectionProgramVersion.mockResolvedValue(
      newDetectionProgram,
    );

    const useCase = buildUseCase();
    const response = await useCase.execute({
      organizationId,
      userId,
      ruleId,
      language,
    });

    const queuedInput = generateProgramDelayedJob.addJob.mock.calls[0]?.[0];
    const createVersionPayload =
      linterAdapter.createNewDetectionProgramVersion.mock.calls[0]?.[0];
    const updateDraftPayload =
      linterAdapter.updateActiveDetectionProgram.mock.calls[0]?.[0];

    expect({
      jobsQueued: generateProgramDelayedJob.addJob.mock.calls.length,
      createVersionPayload,
      updateDraftPayload,
      queuedInput,
      responseMessage: response.message,
    }).toEqual({
      jobsQueued: 1,
      createVersionPayload: expect.objectContaining({
        activeDetectionProgramId,
        organizationId,
        userId,
        status: DetectionStatus.IN_PROGRESS,
      }),
      updateDraftPayload: expect.objectContaining({
        newDetectionProgramDraftVersion: newDetectionProgram.id,
      }),
      queuedInput: expect.objectContaining({
        detectionProgramId: newDetectionProgram.id,
        activeDetectionProgramId,
      }),
      responseMessage: expect.stringContaining(
        'Created 1 program generation job',
      ),
    });
  });

  it('creates detection program and queues job if no active program exists', async () => {
    const newDetectionProgram = detectionProgramFactory({
      ruleId,
      language,
    });
    const activeDetectionProgramId = createActiveDetectionProgramId(uuidv4());

    linterAdapter.getActiveDetectionProgram
      .mockResolvedValueOnce({ programs: [] })
      .mockResolvedValueOnce({
        programs: [
          {
            id: activeDetectionProgramId,
            detectionProgramVersion: null,
            detectionProgramDraftVersion: newDetectionProgram.id,
            ruleId,
            language,
            detectionProgram: null,
            draftDetectionProgram: null,
          },
        ],
      });

    linterAdapter.createDetectionProgram.mockResolvedValue(newDetectionProgram);

    const useCase = buildUseCase();
    const response = await useCase.execute({
      organizationId,
      userId,
      ruleId,
    });

    const queuedInput = generateProgramDelayedJob.addJob.mock.calls[0]?.[0];
    const createDetectionPayload =
      linterAdapter.createDetectionProgram.mock.calls[0]?.[0];

    expect({
      jobsQueued: generateProgramDelayedJob.addJob.mock.calls.length,
      createDetectionPayload,
      updateDraftCalls:
        linterAdapter.updateActiveDetectionProgram.mock.calls.length,
      queuedInput,
      responseMessage: response.message,
    }).toEqual({
      jobsQueued: 1,
      createDetectionPayload: expect.objectContaining({
        mustBeDraftVersion: true,
        status: DetectionStatus.IN_PROGRESS,
      }),
      updateDraftCalls: 0,
      queuedInput: expect.objectContaining({
        detectionProgramId: newDetectionProgram.id,
        activeDetectionProgramId,
      }),
      responseMessage: expect.stringContaining(
        'Created 1 program generation job',
      ),
    });
  });
});
