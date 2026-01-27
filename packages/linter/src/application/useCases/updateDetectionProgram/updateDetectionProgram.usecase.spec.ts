import { UpdateDetectionProgramUseCase } from './updateDetectionProgram.usecase';
import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger } from '@packmind/logger';
import { createOrganizationId, createUserId } from '@packmind/types';
import {
  DetectionStatus,
  UpdateDetectionProgramCommand,
  createDetectionProgramId,
  DetectionModeEnum,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { IDetectionProgramRepository } from '../../../domain/repositories/IDetectionProgramRepository';
import { detectionProgramFactory } from '../../../../test';

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

describe('UpdateDetectionProgramUseCase', () => {
  let updateDetectionProgramUseCase: UpdateDetectionProgramUseCase;
  let detectionProgramRepository: jest.Mocked<IDetectionProgramRepository>;
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

    stubbedLogger = stubLogger();

    updateDetectionProgramUseCase = new UpdateDetectionProgramUseCase(
      detectionProgramRepository,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when updating existing detection program with new code', () => {
      const organizationId = createOrganizationId(uuidv4());
      const userId = createUserId(uuidv4());
      const detectionProgramId = createDetectionProgramId(uuidv4());

      const command: UpdateDetectionProgramCommand = {
        detectionProgramId,
        code: 'updated code',
        organizationId,
        userId,
      };

      const existingDetectionProgram = detectionProgramFactory({
        id: detectionProgramId,
        code: 'old code',
        mode: DetectionModeEnum.REGEXP,
        status: DetectionStatus.READY,
      });

      const updatedDetectionProgram = detectionProgramFactory({
        id: detectionProgramId,
        code: command.code,
        mode: DetectionModeEnum.REGEXP,
        status: DetectionStatus.READY,
      });

      let result: Awaited<
        ReturnType<typeof updateDetectionProgramUseCase.execute>
      >;

      beforeEach(async () => {
        detectionProgramRepository.findById.mockResolvedValue(
          existingDetectionProgram,
        );
        detectionProgramRepository.add.mockResolvedValue(
          updatedDetectionProgram,
        );

        result = await updateDetectionProgramUseCase.execute(command);
      });

      it('finds the detection program by id', () => {
        expect(detectionProgramRepository.findById).toHaveBeenCalledWith(
          detectionProgramId,
        );
      });

      it('saves the updated detection program with new code', () => {
        expect(detectionProgramRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            id: detectionProgramId,
            code: command.code,
            mode: DetectionModeEnum.REGEXP,
            status: DetectionStatus.READY,
          }),
        );
      });

      it('returns the updated detection program', () => {
        expect(result).toEqual(updatedDetectionProgram);
      });
    });

    describe('when updating detection program with new mode and status', () => {
      const organizationId = createOrganizationId(uuidv4());
      const userId = createUserId(uuidv4());
      const detectionProgramId = createDetectionProgramId(uuidv4());

      const command: UpdateDetectionProgramCommand = {
        detectionProgramId,
        code: 'updated code',
        mode: DetectionModeEnum.SINGLE_AST,
        status: DetectionStatus.READY,
        organizationId,
        userId,
      };

      const existingDetectionProgram = detectionProgramFactory({
        id: detectionProgramId,
        code: 'old code',
        mode: DetectionModeEnum.REGEXP,
        status: DetectionStatus.READY,
      });

      const updatedDetectionProgram = detectionProgramFactory({
        id: detectionProgramId,
        code: command.code,
        mode: command.mode,
        status: command.status,
      });

      let result: Awaited<
        ReturnType<typeof updateDetectionProgramUseCase.execute>
      >;

      beforeEach(async () => {
        detectionProgramRepository.findById.mockResolvedValue(
          existingDetectionProgram,
        );
        detectionProgramRepository.add.mockResolvedValue(
          updatedDetectionProgram,
        );

        result = await updateDetectionProgramUseCase.execute(command);
      });

      it('saves the detection program with updated mode and status', () => {
        expect(detectionProgramRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            id: detectionProgramId,
            code: command.code,
            mode: command.mode,
            status: command.status,
          }),
        );
      });

      it('returns the updated detection program', () => {
        expect(result).toEqual(updatedDetectionProgram);
      });
    });

    describe('when mode and status are not provided', () => {
      const organizationId = createOrganizationId(uuidv4());
      const userId = createUserId(uuidv4());
      const detectionProgramId = createDetectionProgramId(uuidv4());

      const command: UpdateDetectionProgramCommand = {
        detectionProgramId,
        code: 'updated code',
        organizationId,
        userId,
      };

      const existingDetectionProgram = detectionProgramFactory({
        id: detectionProgramId,
        code: 'old code',
        mode: DetectionModeEnum.FILE_SYSTEM,
        status: DetectionStatus.IN_PROGRESS,
      });

      const updatedDetectionProgram = detectionProgramFactory({
        id: detectionProgramId,
        code: command.code,
        mode: DetectionModeEnum.FILE_SYSTEM,
        status: DetectionStatus.IN_PROGRESS,
      });

      let result: Awaited<
        ReturnType<typeof updateDetectionProgramUseCase.execute>
      >;

      beforeEach(async () => {
        detectionProgramRepository.findById.mockResolvedValue(
          existingDetectionProgram,
        );
        detectionProgramRepository.add.mockResolvedValue(
          updatedDetectionProgram,
        );

        result = await updateDetectionProgramUseCase.execute(command);
      });

      describe('when saving', () => {
        it('preserves existing mode and status', () => {
          expect(detectionProgramRepository.add).toHaveBeenCalledWith(
            expect.objectContaining({
              id: detectionProgramId,
              code: command.code,
              mode: DetectionModeEnum.FILE_SYSTEM,
              status: DetectionStatus.IN_PROGRESS,
            }),
          );
        });
      });

      it('returns the updated detection program', () => {
        expect(result).toEqual(updatedDetectionProgram);
      });
    });

    describe('error cases', () => {
      describe('when detection program is not found', () => {
        const detectionProgramId = createDetectionProgramId(uuidv4());
        const command: UpdateDetectionProgramCommand = {
          detectionProgramId,
          code: 'test code',
          organizationId: createOrganizationId(uuidv4()),
          userId: createUserId(uuidv4()),
        };

        beforeEach(() => {
          detectionProgramRepository.findById.mockResolvedValue(null);
        });

        it('throws detection program not found error', async () => {
          await expect(
            updateDetectionProgramUseCase.execute(command),
          ).rejects.toThrow('Detection program not found');
        });

        it('calls findById with the detection program id', async () => {
          try {
            await updateDetectionProgramUseCase.execute(command);
          } catch {
            // Expected to throw
          }

          expect(detectionProgramRepository.findById).toHaveBeenCalledWith(
            detectionProgramId,
          );
        });

        it('does not call add on the repository', async () => {
          try {
            await updateDetectionProgramUseCase.execute(command);
          } catch {
            // Expected to throw
          }

          expect(detectionProgramRepository.add).not.toHaveBeenCalled();
        });
      });

      describe('when repository update fails', () => {
        const organizationId = createOrganizationId(uuidv4());
        const userId = createUserId(uuidv4());
        const detectionProgramId = createDetectionProgramId(uuidv4());

        const command: UpdateDetectionProgramCommand = {
          detectionProgramId,
          code: 'updated code',
          organizationId,
          userId,
        };

        const existingDetectionProgram = detectionProgramFactory({
          id: detectionProgramId,
          code: 'old code',
        });

        beforeEach(() => {
          detectionProgramRepository.findById.mockResolvedValue(
            existingDetectionProgram,
          );
          detectionProgramRepository.add.mockRejectedValue(
            new Error('Database error'),
          );
        });

        it('throws database error', async () => {
          await expect(
            updateDetectionProgramUseCase.execute(command),
          ).rejects.toThrow('Database error');
        });

        it('calls findById with the detection program id', async () => {
          try {
            await updateDetectionProgramUseCase.execute(command);
          } catch {
            // Expected to throw
          }

          expect(detectionProgramRepository.findById).toHaveBeenCalledWith(
            detectionProgramId,
          );
        });

        it('attempts to save the detection program once', async () => {
          try {
            await updateDetectionProgramUseCase.execute(command);
          } catch {
            // Expected to throw
          }

          expect(detectionProgramRepository.add).toHaveBeenCalledTimes(1);
        });
      });
    });
  });
});
