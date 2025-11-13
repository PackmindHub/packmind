import { CreateNewDetectionProgramVersionUsecase } from './createNewDetectionProgramVersion.usecase';
import { IDetectionProgramRepository } from '../../../domain/repositories/IDetectionProgramRepository';
import { IActiveDetectionProgramRepository } from '../../../domain/repositories/IActiveDetectionProgramRepository';
import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger } from '@packmind/logger';
import { createOrganizationId, createUserId } from '@packmind/types';
import {
  DetectionStatus,
  createRuleId,
  createStandardVersionId,
  createStandardId,
  ProgrammingLanguage,
  IStandardsPort,
  CreateNewDetectionProgramVersionCommand,
  createActiveDetectionProgramId,
  createDetectionProgramId,
  DetectionModeEnum,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { ruleFactory } from '@packmind/standards/test';
import {
  activeDetectionProgramFactory,
  detectionProgramFactory,
} from '../../../../test';
import { standardFactory } from '@packmind/standards/test';

// Add at the top, before other imports
jest.mock('@packmind/node-utils', () => {
  const actual = jest.requireActual('@packmind/node-utils');
  return {
    ...actual,
    SSEEventPublisher: {
      publishProgramStatusEvent: jest.fn().mockResolvedValue(undefined),
    },
  };
});

describe('CreateNewDetectionProgramVersionUsecase', () => {
  let createNewDetectionProgramVersionUsecase: CreateNewDetectionProgramVersionUsecase;
  let detectionProgramRepository: jest.Mocked<IDetectionProgramRepository>;
  let activeDetectionProgramRepository: jest.Mocked<IActiveDetectionProgramRepository>;
  let standardsAdapter: jest.Mocked<IStandardsPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    // Mock DetectionProgramRepository
    detectionProgramRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      findByRuleId: jest.fn(),
      findByRuleIdAndVersion: jest.fn(),
      getLatestVersionByRuleId: jest.fn(),
      getLatestVersionByRuleIdAndLanguage: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
    } as unknown as jest.Mocked<IDetectionProgramRepository>;

    // Mock ActiveDetectionProgramRepository
    activeDetectionProgramRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      findByRuleId: jest.fn(),
      findByRuleIdAndLanguage: jest.fn(),
      findByRuleIdWithPrograms: jest.fn(),
      updateActiveDetectionProgram: jest.fn(),
      deleteByRuleId: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
    } as unknown as jest.Mocked<IActiveDetectionProgramRepository>;

    standardsAdapter = {
      getStandard: jest.fn(),
      getRule: jest.fn(),
      getStandardVersion: jest.fn(),
      getStandardVersionById: jest.fn(),
      listStandardVersions: jest.fn(),
      getLatestRulesByStandardId: jest.fn(),
      getRulesByStandardId: jest.fn(),
      listStandardsBySpace: jest.fn(),
      getRuleCodeExamples: jest.fn(),
      findStandardBySlug: jest.fn(),
      getLatestStandardVersion: jest.fn(),
    };

    stubbedLogger = stubLogger();

    createNewDetectionProgramVersionUsecase =
      new CreateNewDetectionProgramVersionUsecase(
        detectionProgramRepository,
        activeDetectionProgramRepository,
        standardsAdapter,
        stubbedLogger,
      );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when updateActiveDetectionProgram is true', () => {
      it('creates new detection program and updates active detection program', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const userId = createUserId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const standardVersionId = createStandardVersionId(uuidv4());
        const standardId = createStandardId(uuidv4());
        const activeDetectionProgramId =
          createActiveDetectionProgramId(uuidv4());
        const currentDetectionProgramId = createDetectionProgramId(uuidv4());
        const newDetectionProgramId = createDetectionProgramId(uuidv4());

        const command: CreateNewDetectionProgramVersionCommand = {
          activeDetectionProgramId,
          code: 'updated code',
          mode: DetectionModeEnum.SINGLE_AST,
          status: DetectionStatus.READY,
          updateActiveDetectionProgram: true,
          userId,
          organizationId,
        };

        const existingRule = ruleFactory({
          id: ruleId,
          standardVersionId,
        });

        const existingStandardVersion = {
          id: standardVersionId,
          standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Test Description',
          version: 1,
          scope: null,
        };

        const existingStandard = standardFactory({
          id: standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          userId,
          scope: null,
        });

        const activeDetectionProgram = activeDetectionProgramFactory({
          id: activeDetectionProgramId,
          detectionProgramVersion: currentDetectionProgramId,
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
        });

        const currentDetectionProgram = detectionProgramFactory({
          id: currentDetectionProgramId,
          ruleId,
          version: 2,
          mode: DetectionModeEnum.REGEXP,
          status: DetectionStatus.READY,
        });

        const newDetectionProgram = detectionProgramFactory({
          id: newDetectionProgramId,
          ruleId,
          code: command.code,
          version: 3,
          mode: command.mode,
          status: command.status,
        });

        const updatedActiveProgram = {
          ...activeDetectionProgram,
          detectionProgramVersion: newDetectionProgramId,
        };

        // Setup mocks
        activeDetectionProgramRepository.findById.mockResolvedValue(
          activeDetectionProgram,
        );
        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getStandardVersion.mockResolvedValue(
          existingStandardVersion,
        );
        standardsAdapter.getStandard.mockResolvedValue(existingStandard);
        detectionProgramRepository.findById.mockResolvedValue(
          currentDetectionProgram,
        );
        detectionProgramRepository.getLatestVersionByRuleIdAndLanguage.mockResolvedValue(
          2,
        );
        detectionProgramRepository.add.mockResolvedValue(newDetectionProgram);
        activeDetectionProgramRepository.updateActiveDetectionProgram.mockResolvedValue(
          updatedActiveProgram,
        );

        const result =
          await createNewDetectionProgramVersionUsecase.execute(command);

        expect(detectionProgramRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            ruleId,
            code: command.code,
            version: 3,
            mode: command.mode,
            status: command.status,
          }),
        );
        expect(
          activeDetectionProgramRepository.updateActiveDetectionProgram,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            detectionProgramVersion: newDetectionProgramId,
          }),
        );
        expect(result).toEqual(newDetectionProgram);
      });
    });

    describe('when updateActiveDetectionProgram is false', () => {
      it('creates new detection program but does not update active detection program', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const userId = createUserId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const standardVersionId = createStandardVersionId(uuidv4());
        const standardId = createStandardId(uuidv4());
        const activeDetectionProgramId =
          createActiveDetectionProgramId(uuidv4());
        const currentDetectionProgramId = createDetectionProgramId(uuidv4());
        const newDetectionProgramId = createDetectionProgramId(uuidv4());

        const command: CreateNewDetectionProgramVersionCommand = {
          activeDetectionProgramId,
          code: 'updated code',
          updateActiveDetectionProgram: false,
          organizationId,
          userId,
        };

        const existingRule = ruleFactory({
          id: ruleId,
          standardVersionId,
        });

        const existingStandardVersion = {
          id: standardVersionId,
          standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Test Description',
          version: 1,
          scope: null,
        };

        const existingStandard = standardFactory({
          id: standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          userId,
          scope: null,
        });

        const activeDetectionProgram = activeDetectionProgramFactory({
          id: activeDetectionProgramId,
          detectionProgramVersion: currentDetectionProgramId,
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
        });

        const currentDetectionProgram = detectionProgramFactory({
          id: currentDetectionProgramId,
          ruleId,
          version: 2,
        });

        const newDetectionProgram = detectionProgramFactory({
          id: newDetectionProgramId,
          ruleId,
          code: command.code,
          version: 3,
        });

        // Setup mocks
        activeDetectionProgramRepository.findById.mockResolvedValue(
          activeDetectionProgram,
        );
        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getStandardVersion.mockResolvedValue(
          existingStandardVersion,
        );
        standardsAdapter.getStandard.mockResolvedValue(existingStandard);
        detectionProgramRepository.findById.mockResolvedValue(
          currentDetectionProgram,
        );
        detectionProgramRepository.getLatestVersionByRuleIdAndLanguage.mockResolvedValue(
          2,
        );
        detectionProgramRepository.add.mockResolvedValue(newDetectionProgram);

        const result =
          await createNewDetectionProgramVersionUsecase.execute(command);

        expect(detectionProgramRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            ruleId,
            code: command.code,
            version: 3,
          }),
        );
        expect(
          activeDetectionProgramRepository.updateActiveDetectionProgram,
        ).not.toHaveBeenCalled();
        expect(result).toEqual(newDetectionProgram);
      });
    });

    describe('when updateActiveDetectionProgram is undefined', () => {
      it('creates new detection program but does not update active detection program', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const userId = createUserId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const standardVersionId = createStandardVersionId(uuidv4());
        const standardId = createStandardId(uuidv4());
        const activeDetectionProgramId =
          createActiveDetectionProgramId(uuidv4());
        const currentDetectionProgramId = createDetectionProgramId(uuidv4());
        const newDetectionProgramId = createDetectionProgramId(uuidv4());

        const command: CreateNewDetectionProgramVersionCommand = {
          activeDetectionProgramId,
          code: 'updated code',
          organizationId,
          userId,
        };

        const existingRule = ruleFactory({
          id: ruleId,
          standardVersionId,
        });

        const existingStandardVersion = {
          id: standardVersionId,
          standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Test Description',
          version: 1,
          scope: null,
        };

        const existingStandard = standardFactory({
          id: standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          userId,
          scope: null,
        });

        const activeDetectionProgram = activeDetectionProgramFactory({
          id: activeDetectionProgramId,
          detectionProgramVersion: currentDetectionProgramId,
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
        });

        const currentDetectionProgram = detectionProgramFactory({
          id: currentDetectionProgramId,
          ruleId,
          version: 2,
        });

        const newDetectionProgram = detectionProgramFactory({
          id: newDetectionProgramId,
          ruleId,
          code: command.code,
          version: 3,
        });

        // Setup mocks
        activeDetectionProgramRepository.findById.mockResolvedValue(
          activeDetectionProgram,
        );
        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getStandardVersion.mockResolvedValue(
          existingStandardVersion,
        );
        standardsAdapter.getStandard.mockResolvedValue(existingStandard);
        detectionProgramRepository.findById.mockResolvedValue(
          currentDetectionProgram,
        );
        detectionProgramRepository.getLatestVersionByRuleIdAndLanguage.mockResolvedValue(
          2,
        );
        detectionProgramRepository.add.mockResolvedValue(newDetectionProgram);

        const result =
          await createNewDetectionProgramVersionUsecase.execute(command);

        expect(
          activeDetectionProgramRepository.updateActiveDetectionProgram,
        ).not.toHaveBeenCalled();
        expect(result).toEqual(newDetectionProgram);
      });
    });

    describe('when active detection program has draft version only', () => {
      it('uses draft version as reference for updating', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const userId = createUserId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const standardVersionId = createStandardVersionId(uuidv4());
        const standardId = createStandardId(uuidv4());
        const activeDetectionProgramId =
          createActiveDetectionProgramId(uuidv4());
        const draftDetectionProgramId = createDetectionProgramId(uuidv4());
        const newDetectionProgramId = createDetectionProgramId(uuidv4());

        const command: CreateNewDetectionProgramVersionCommand = {
          activeDetectionProgramId,
          code: 'updated code',
          updateActiveDetectionProgram: true,
          organizationId,
          userId,
        };

        const existingRule = ruleFactory({
          id: ruleId,
          standardVersionId,
        });

        const existingStandardVersion = {
          id: standardVersionId,
          standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Test Description',
          version: 1,
          scope: null,
        };

        const existingStandard = standardFactory({
          id: standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          userId,
          scope: null,
        });

        const activeDetectionProgram = activeDetectionProgramFactory({
          id: activeDetectionProgramId,
          detectionProgramVersion: null, // No regular version
          detectionProgramDraftVersion: draftDetectionProgramId, // Has draft version
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
        });

        const draftDetectionProgram = detectionProgramFactory({
          id: draftDetectionProgramId,
          ruleId,
          version: 1,
        });

        const newDetectionProgram = detectionProgramFactory({
          id: newDetectionProgramId,
          ruleId,
          code: command.code,
          version: 2,
        });

        // Setup mocks
        activeDetectionProgramRepository.findById.mockResolvedValue(
          activeDetectionProgram,
        );
        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getStandardVersion.mockResolvedValue(
          existingStandardVersion,
        );
        standardsAdapter.getStandard.mockResolvedValue(existingStandard);
        detectionProgramRepository.findById.mockResolvedValue(
          draftDetectionProgram,
        );
        detectionProgramRepository.getLatestVersionByRuleIdAndLanguage.mockResolvedValue(
          1,
        );
        detectionProgramRepository.add.mockResolvedValue(newDetectionProgram);

        const result =
          await createNewDetectionProgramVersionUsecase.execute(command);

        expect(detectionProgramRepository.findById).toHaveBeenCalledWith(
          draftDetectionProgramId,
        );
        expect(result).toEqual(newDetectionProgram);
      });
    });

    describe('error cases', () => {
      describe('when code is empty', () => {
        it('throws error', async () => {
          const command: CreateNewDetectionProgramVersionCommand = {
            activeDetectionProgramId: createActiveDetectionProgramId(uuidv4()),
            code: '',
            organizationId: createOrganizationId(uuidv4()),
            userId: createUserId(uuidv4()),
          };

          await expect(
            createNewDetectionProgramVersionUsecase.execute(command),
          ).rejects.toThrow('Code is required');
        });
      });

      describe('when active detection program is not found', () => {
        it('throws error', async () => {
          const command: CreateNewDetectionProgramVersionCommand = {
            activeDetectionProgramId: createActiveDetectionProgramId(uuidv4()),
            code: 'test code',
            organizationId: createOrganizationId(uuidv4()),
            userId: createUserId(uuidv4()),
          };

          activeDetectionProgramRepository.findById.mockResolvedValue(null);

          await expect(
            createNewDetectionProgramVersionUsecase.execute(command),
          ).rejects.toThrow('Detection program not found');
        });
      });

      describe('when active detection program has no version or draft version', () => {
        it('throws error', async () => {
          const activeDetectionProgramId =
            createActiveDetectionProgramId(uuidv4());
          const ruleId = createRuleId(uuidv4());
          const standardVersionId = createStandardVersionId(uuidv4());
          const standardId = createStandardId(uuidv4());
          const organizationId = createOrganizationId(uuidv4());
          const userId = createUserId(uuidv4());

          const command: CreateNewDetectionProgramVersionCommand = {
            activeDetectionProgramId,
            code: 'test code',
            organizationId,
            userId,
          };

          const existingRule = ruleFactory({
            id: ruleId,
            standardVersionId,
          });

          const existingStandardVersion = {
            id: standardVersionId,
            standardId,
            name: 'Test Standard',
            slug: 'test-standard',
            description: 'Test Description',
            version: 1,
            scope: null,
          };

          const existingStandard = standardFactory({
            id: standardId,
            name: 'Test Standard',
            slug: 'test-standard',
            userId,
            scope: null,
          });

          const activeDetectionProgram = activeDetectionProgramFactory({
            id: activeDetectionProgramId,
            detectionProgramVersion: null,
            detectionProgramDraftVersion: null,
            ruleId,
          });

          activeDetectionProgramRepository.findById.mockResolvedValue(
            activeDetectionProgram,
          );
          standardsAdapter.getRule.mockResolvedValue(existingRule);
          standardsAdapter.getStandardVersion.mockResolvedValue(
            existingStandardVersion,
          );
          standardsAdapter.getStandard.mockResolvedValue(existingStandard);

          await expect(
            createNewDetectionProgramVersionUsecase.execute(command),
          ).rejects.toThrow(
            'Active detection program has no version or draft version',
          );
        });
      });

      describe('when rule is not found', () => {
        it('throws error', async () => {
          const activeDetectionProgramId =
            createActiveDetectionProgramId(uuidv4());
          const ruleId = createRuleId(uuidv4());

          const command: CreateNewDetectionProgramVersionCommand = {
            activeDetectionProgramId,
            code: 'test code',
            organizationId: createOrganizationId(uuidv4()),
            userId: createUserId(uuidv4()),
          };

          const activeDetectionProgram = activeDetectionProgramFactory({
            id: activeDetectionProgramId,
            ruleId,
          });

          activeDetectionProgramRepository.findById.mockResolvedValue(
            activeDetectionProgram,
          );
          standardsAdapter.getRule.mockResolvedValue(null);

          await expect(
            createNewDetectionProgramVersionUsecase.execute(command),
          ).rejects.toThrow('Rule not found');
        });
      });

      describe('when current detection program is not found', () => {
        it('throws error', async () => {
          const activeDetectionProgramId =
            createActiveDetectionProgramId(uuidv4());
          const ruleId = createRuleId(uuidv4());
          const standardVersionId = createStandardVersionId(uuidv4());
          const standardId = createStandardId(uuidv4());
          const organizationId = createOrganizationId(uuidv4());
          const userId = createUserId(uuidv4());
          const currentDetectionProgramId = createDetectionProgramId(uuidv4());

          const command: CreateNewDetectionProgramVersionCommand = {
            activeDetectionProgramId,
            code: 'test code',
            organizationId,
            userId,
          };

          const existingRule = ruleFactory({
            id: ruleId,
            standardVersionId,
          });

          const existingStandardVersion = {
            id: standardVersionId,
            standardId,
            name: 'Test Standard',
            slug: 'test-standard',
            description: 'Test Description',
            version: 1,
            scope: null,
          };

          const existingStandard = standardFactory({
            id: standardId,
            name: 'Test Standard',
            slug: 'test-standard',
            userId,
            scope: null,
          });

          const activeDetectionProgram = activeDetectionProgramFactory({
            id: activeDetectionProgramId,
            detectionProgramVersion: currentDetectionProgramId,
            ruleId,
          });

          activeDetectionProgramRepository.findById.mockResolvedValue(
            activeDetectionProgram,
          );
          standardsAdapter.getRule.mockResolvedValue(existingRule);
          standardsAdapter.getStandardVersion.mockResolvedValue(
            existingStandardVersion,
          );
          standardsAdapter.getStandard.mockResolvedValue(existingStandard);
          detectionProgramRepository.findById.mockResolvedValue(null);

          await expect(
            createNewDetectionProgramVersionUsecase.execute(command),
          ).rejects.toThrow('Current detection program not found');
        });
      });
    });
  });
});
