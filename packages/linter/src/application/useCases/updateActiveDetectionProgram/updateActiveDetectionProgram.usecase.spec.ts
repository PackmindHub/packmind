import { UpdateActiveDetectionProgramUseCase } from './updateActiveDetectionProgram.usecase';
import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger } from '@packmind/logger';
import { createOrganizationId, createUserId } from '@packmind/types';
import {
  DetectionStatus,
  ActiveDetectionProgram,
  createActiveDetectionProgramId,
  createDetectionProgramId,
  UpdateActiveDetectionProgramCommand,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { IActiveDetectionProgramRepository } from '../../../domain/repositories/IActiveDetectionProgramRepository';
import {
  activeDetectionProgramFactory,
  detectionProgramFactory,
} from '../../../../test';
import { IDetectionProgramRepository } from '../../../domain/repositories/IDetectionProgramRepository';
import { InvalidDetectionProgramStatusError } from '../../../domain/errors';

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

describe('UpdateActiveDetectionProgramUseCase', () => {
  let updateActiveDetectionProgramUseCase: UpdateActiveDetectionProgramUseCase;
  let activeDetectionProgramRepository: jest.Mocked<IActiveDetectionProgramRepository>;
  let detectionProgramRepository: jest.Mocked<IDetectionProgramRepository>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    // Mock ActiveDetectionProgramRepository
    activeDetectionProgramRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      findByRuleId: jest.fn(),
      findByRuleIdAndLanguage: jest.fn(),
      findByRuleIdWithPrograms: jest.fn(),
      updateActiveDetectionProgram: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      deleteByRuleId: jest.fn(),
    } as unknown as jest.Mocked<IActiveDetectionProgramRepository>;

    // Mock DetectionProgramRepository
    detectionProgramRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      findByRuleId: jest.fn(),
      findByRuleIdAndVersion: jest.fn(),
      getLatestVersionByRuleIdAndLanguage: jest.fn(),
      updateStatus: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
    } as unknown as jest.Mocked<IDetectionProgramRepository>;

    stubbedLogger = stubLogger();

    updateActiveDetectionProgramUseCase =
      new UpdateActiveDetectionProgramUseCase(
        activeDetectionProgramRepository,
        detectionProgramRepository,
        stubbedLogger,
      );
  });

  describe('execute', () => {
    describe('when updating detectionProgramVersion only', () => {
      it('updates the detectionProgramVersion successfully', async () => {
        const activeDetectionProgramId =
          createActiveDetectionProgramId(uuidv4());
        const newDetectionProgramVersion = createDetectionProgramId(uuidv4());
        const organizationId = createOrganizationId(uuidv4());
        const userId = createUserId(uuidv4());

        const existingActiveProgram = activeDetectionProgramFactory({
          id: activeDetectionProgramId,
          detectionProgramVersion: createDetectionProgramId(uuidv4()),
          detectionProgramDraftVersion: null,
        });

        const detectionProgram = detectionProgramFactory({
          id: newDetectionProgramVersion,
          status: DetectionStatus.READY,
        });

        const expectedUpdatedProgram: ActiveDetectionProgram = {
          ...existingActiveProgram,
          detectionProgramVersion: newDetectionProgramVersion,
        };

        const command: UpdateActiveDetectionProgramCommand = {
          activeDetectionProgram: existingActiveProgram,
          newDetectionProgramVersion,
          organizationId,
          userId,
        };

        detectionProgramRepository.findById.mockResolvedValue(detectionProgram);
        activeDetectionProgramRepository.updateActiveDetectionProgram.mockResolvedValue(
          expectedUpdatedProgram,
        );

        const result =
          await updateActiveDetectionProgramUseCase.execute(command);

        expect(detectionProgramRepository.findById).toHaveBeenCalledWith(
          newDetectionProgramVersion,
        );
        expect(
          activeDetectionProgramRepository.updateActiveDetectionProgram,
        ).toHaveBeenCalledWith(expectedUpdatedProgram);
        expect(result).toEqual(expectedUpdatedProgram);
      });
    });

    describe('when updating detectionProgramDraftVersion only', () => {
      it('updates the detectionProgramDraftVersion successfully', async () => {
        const activeDetectionProgramId =
          createActiveDetectionProgramId(uuidv4());
        const newDetectionProgramDraftVersion =
          createDetectionProgramId(uuidv4());
        const organizationId = createOrganizationId(uuidv4());
        const userId = createUserId(uuidv4());

        const existingActiveProgram = activeDetectionProgramFactory({
          id: activeDetectionProgramId,
          detectionProgramVersion: createDetectionProgramId(uuidv4()),
          detectionProgramDraftVersion: null,
        });

        const expectedUpdatedProgram: ActiveDetectionProgram = {
          ...existingActiveProgram,
          detectionProgramDraftVersion: newDetectionProgramDraftVersion,
        };

        const command: UpdateActiveDetectionProgramCommand = {
          activeDetectionProgram: existingActiveProgram,
          newDetectionProgramDraftVersion,
          organizationId,
          userId,
        };

        activeDetectionProgramRepository.updateActiveDetectionProgram.mockResolvedValue(
          expectedUpdatedProgram,
        );

        const result =
          await updateActiveDetectionProgramUseCase.execute(command);

        expect(
          activeDetectionProgramRepository.updateActiveDetectionProgram,
        ).toHaveBeenCalledWith(expectedUpdatedProgram);
        expect(result).toEqual(expectedUpdatedProgram);
      });
    });

    describe('when updating both fields', () => {
      it('updates both detectionProgramVersion and detectionProgramDraftVersion', async () => {
        const activeDetectionProgramId =
          createActiveDetectionProgramId(uuidv4());
        const newDetectionProgramVersion = createDetectionProgramId(uuidv4());
        const newDetectionProgramDraftVersion =
          createDetectionProgramId(uuidv4());
        const organizationId = createOrganizationId(uuidv4());
        const userId = createUserId(uuidv4());

        const existingActiveProgram = activeDetectionProgramFactory({
          id: activeDetectionProgramId,
          detectionProgramVersion: createDetectionProgramId(uuidv4()),
          detectionProgramDraftVersion: null,
        });

        const detectionProgram = detectionProgramFactory({
          id: newDetectionProgramVersion,
          status: DetectionStatus.READY,
        });

        const expectedUpdatedProgram: ActiveDetectionProgram = {
          ...existingActiveProgram,
          detectionProgramVersion: newDetectionProgramVersion,
          detectionProgramDraftVersion: newDetectionProgramDraftVersion,
        };

        const command: UpdateActiveDetectionProgramCommand = {
          activeDetectionProgram: existingActiveProgram,
          newDetectionProgramVersion,
          newDetectionProgramDraftVersion,
          organizationId,
          userId,
        };

        detectionProgramRepository.findById.mockResolvedValue(detectionProgram);
        activeDetectionProgramRepository.updateActiveDetectionProgram.mockResolvedValue(
          expectedUpdatedProgram,
        );

        const result =
          await updateActiveDetectionProgramUseCase.execute(command);

        expect(detectionProgramRepository.findById).toHaveBeenCalledWith(
          newDetectionProgramVersion,
        );
        expect(
          activeDetectionProgramRepository.updateActiveDetectionProgram,
        ).toHaveBeenCalledWith(expectedUpdatedProgram);
        expect(result).toEqual(expectedUpdatedProgram);
      });
    });

    describe('when setting draft version to null', () => {
      it('allows setting detectionProgramDraftVersion to null', async () => {
        const activeDetectionProgramId =
          createActiveDetectionProgramId(uuidv4());
        const organizationId = createOrganizationId(uuidv4());
        const userId = createUserId(uuidv4());

        const existingActiveProgram = activeDetectionProgramFactory({
          id: activeDetectionProgramId,
          detectionProgramVersion: createDetectionProgramId(uuidv4()),
          detectionProgramDraftVersion: createDetectionProgramId(uuidv4()), // Has a draft version
        });

        const expectedUpdatedProgram: ActiveDetectionProgram = {
          ...existingActiveProgram,
          detectionProgramDraftVersion: null, // Setting to null
        };

        const command: UpdateActiveDetectionProgramCommand = {
          activeDetectionProgram: existingActiveProgram,
          newDetectionProgramDraftVersion: null,
          organizationId,
          userId,
        };

        activeDetectionProgramRepository.updateActiveDetectionProgram.mockResolvedValue(
          expectedUpdatedProgram,
        );

        const result =
          await updateActiveDetectionProgramUseCase.execute(command);

        expect(result.detectionProgramDraftVersion).toBeNull();
      });
    });

    describe('error cases', () => {
      describe('when no update fields are provided', () => {
        it('throws error', async () => {
          const activeDetectionProgramId =
            createActiveDetectionProgramId(uuidv4());
          const organizationId = createOrganizationId(uuidv4());
          const userId = createUserId(uuidv4());

          const existingActiveProgram = activeDetectionProgramFactory({
            id: activeDetectionProgramId,
          });

          const command: UpdateActiveDetectionProgramCommand = {
            activeDetectionProgram: existingActiveProgram,
            organizationId,
            userId,
          };

          await expect(
            updateActiveDetectionProgramUseCase.execute(command),
          ).rejects.toThrow(
            'At least one of newDetectionProgramVersion or newDetectionProgramDraftVersion must be provided',
          );

          expect(
            activeDetectionProgramRepository.updateActiveDetectionProgram,
          ).not.toHaveBeenCalled();
        });
      });

      describe('when repository update fails', () => {
        it('throws error', async () => {
          const activeDetectionProgramId =
            createActiveDetectionProgramId(uuidv4());
          const newDetectionProgramVersion = createDetectionProgramId(uuidv4());
          const organizationId = createOrganizationId(uuidv4());
          const userId = createUserId(uuidv4());

          const existingActiveProgram = activeDetectionProgramFactory({
            id: activeDetectionProgramId,
          });

          const detectionProgram = detectionProgramFactory({
            id: newDetectionProgramVersion,
            status: DetectionStatus.READY,
          });

          const command: UpdateActiveDetectionProgramCommand = {
            activeDetectionProgram: existingActiveProgram,
            newDetectionProgramVersion,
            organizationId,
            userId,
          };

          detectionProgramRepository.findById.mockResolvedValue(
            detectionProgram,
          );

          const repositoryError = new Error('Database connection failed');
          activeDetectionProgramRepository.updateActiveDetectionProgram.mockRejectedValue(
            repositoryError,
          );

          await expect(
            updateActiveDetectionProgramUseCase.execute(command),
          ).rejects.toThrow('Database connection failed');
        });
      });

      describe('when detection program is not found', () => {
        it('throws error', async () => {
          const activeDetectionProgramId =
            createActiveDetectionProgramId(uuidv4());
          const newDetectionProgramVersion = createDetectionProgramId(uuidv4());
          const organizationId = createOrganizationId(uuidv4());
          const userId = createUserId(uuidv4());

          const existingActiveProgram = activeDetectionProgramFactory({
            id: activeDetectionProgramId,
          });

          const command: UpdateActiveDetectionProgramCommand = {
            activeDetectionProgram: existingActiveProgram,
            newDetectionProgramVersion,
            organizationId,
            userId,
          };

          detectionProgramRepository.findById.mockResolvedValue(null);

          await expect(
            updateActiveDetectionProgramUseCase.execute(command),
          ).rejects.toThrow(
            `Detection program ${newDetectionProgramVersion} not found`,
          );

          expect(
            activeDetectionProgramRepository.updateActiveDetectionProgram,
          ).not.toHaveBeenCalled();
        });
      });

      describe('when detection program status is not READY', () => {
        it('throws InvalidDetectionProgramStatusError for IN_PROGRESS status', async () => {
          const activeDetectionProgramId =
            createActiveDetectionProgramId(uuidv4());
          const newDetectionProgramVersion = createDetectionProgramId(uuidv4());
          const organizationId = createOrganizationId(uuidv4());
          const userId = createUserId(uuidv4());

          const existingActiveProgram = activeDetectionProgramFactory({
            id: activeDetectionProgramId,
          });

          const detectionProgram = detectionProgramFactory({
            id: newDetectionProgramVersion,
            status: DetectionStatus.IN_PROGRESS,
          });

          const command: UpdateActiveDetectionProgramCommand = {
            activeDetectionProgram: existingActiveProgram,
            newDetectionProgramVersion,
            organizationId,
            userId,
          };

          detectionProgramRepository.findById.mockResolvedValue(
            detectionProgram,
          );

          await expect(
            updateActiveDetectionProgramUseCase.execute(command),
          ).rejects.toThrow(InvalidDetectionProgramStatusError);

          await expect(
            updateActiveDetectionProgramUseCase.execute(command),
          ).rejects.toThrow(
            `Detection program ${newDetectionProgramVersion} cannot be promoted as active. Current status: ${DetectionStatus.IN_PROGRESS}, required status: ${DetectionStatus.READY}`,
          );

          expect(
            activeDetectionProgramRepository.updateActiveDetectionProgram,
          ).not.toHaveBeenCalled();
        });

        it('throws InvalidDetectionProgramStatusError for TO_REVIEW status', async () => {
          const activeDetectionProgramId =
            createActiveDetectionProgramId(uuidv4());
          const newDetectionProgramVersion = createDetectionProgramId(uuidv4());
          const organizationId = createOrganizationId(uuidv4());
          const userId = createUserId(uuidv4());

          const existingActiveProgram = activeDetectionProgramFactory({
            id: activeDetectionProgramId,
          });

          const detectionProgram = detectionProgramFactory({
            id: newDetectionProgramVersion,
            status: DetectionStatus.TO_REVIEW,
          });

          const command: UpdateActiveDetectionProgramCommand = {
            activeDetectionProgram: existingActiveProgram,
            newDetectionProgramVersion,
            organizationId,
            userId,
          };

          detectionProgramRepository.findById.mockResolvedValue(
            detectionProgram,
          );

          await expect(
            updateActiveDetectionProgramUseCase.execute(command),
          ).rejects.toThrow(InvalidDetectionProgramStatusError);

          expect(
            activeDetectionProgramRepository.updateActiveDetectionProgram,
          ).not.toHaveBeenCalled();
        });

        it('throws InvalidDetectionProgramStatusError for ERROR status', async () => {
          const activeDetectionProgramId =
            createActiveDetectionProgramId(uuidv4());
          const newDetectionProgramVersion = createDetectionProgramId(uuidv4());
          const organizationId = createOrganizationId(uuidv4());
          const userId = createUserId(uuidv4());

          const existingActiveProgram = activeDetectionProgramFactory({
            id: activeDetectionProgramId,
          });

          const detectionProgram = detectionProgramFactory({
            id: newDetectionProgramVersion,
            status: DetectionStatus.ERROR,
          });

          const command: UpdateActiveDetectionProgramCommand = {
            activeDetectionProgram: existingActiveProgram,
            newDetectionProgramVersion,
            organizationId,
            userId,
          };

          detectionProgramRepository.findById.mockResolvedValue(
            detectionProgram,
          );

          await expect(
            updateActiveDetectionProgramUseCase.execute(command),
          ).rejects.toThrow(InvalidDetectionProgramStatusError);

          expect(
            activeDetectionProgramRepository.updateActiveDetectionProgram,
          ).not.toHaveBeenCalled();
        });
      });
    });
  });
});
