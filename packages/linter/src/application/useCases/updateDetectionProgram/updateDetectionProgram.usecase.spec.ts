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
    describe('when detection program update is ready', () => {
      it('updates existing detection program with new code', async () => {
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

        // Setup mocks
        detectionProgramRepository.findById.mockResolvedValue(
          existingDetectionProgram,
        );
        detectionProgramRepository.add.mockResolvedValue(
          updatedDetectionProgram,
        );

        const result = await updateDetectionProgramUseCase.execute(command);

        expect(detectionProgramRepository.findById).toHaveBeenCalledWith(
          detectionProgramId,
        );
        expect(detectionProgramRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            id: detectionProgramId,
            code: command.code,
            mode: DetectionModeEnum.REGEXP,
            status: DetectionStatus.READY,
          }),
        );
        expect(result).toEqual(updatedDetectionProgram);
      });

      it('updates detection program with new mode and status', async () => {
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

        // Setup mocks
        detectionProgramRepository.findById.mockResolvedValue(
          existingDetectionProgram,
        );
        detectionProgramRepository.add.mockResolvedValue(
          updatedDetectionProgram,
        );

        const result = await updateDetectionProgramUseCase.execute(command);

        expect(detectionProgramRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            id: detectionProgramId,
            code: command.code,
            mode: command.mode,
            status: command.status,
          }),
        );
        expect(result).toEqual(updatedDetectionProgram);
      });

      describe('when mode and status are not provided', () => {
        it('preserves existing mode and status', async () => {
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

          // Setup mocks
          detectionProgramRepository.findById.mockResolvedValue(
            existingDetectionProgram,
          );
          detectionProgramRepository.add.mockResolvedValue(
            updatedDetectionProgram,
          );

          const result = await updateDetectionProgramUseCase.execute(command);

          expect(detectionProgramRepository.add).toHaveBeenCalledWith(
            expect.objectContaining({
              id: detectionProgramId,
              code: command.code,
              mode: DetectionModeEnum.FILE_SYSTEM,
              status: DetectionStatus.IN_PROGRESS,
            }),
          );
          expect(result).toEqual(updatedDetectionProgram);
        });
      });
    });

    describe('error cases', () => {
      describe('when detection program is not found', () => {
        it('throws error', async () => {
          const detectionProgramId = createDetectionProgramId(uuidv4());
          const command: UpdateDetectionProgramCommand = {
            detectionProgramId,
            code: 'test code',
            organizationId: createOrganizationId(uuidv4()),
            userId: createUserId(uuidv4()),
          };

          detectionProgramRepository.findById.mockResolvedValue(null);

          await expect(
            updateDetectionProgramUseCase.execute(command),
          ).rejects.toThrow('Detection program not found');

          expect(detectionProgramRepository.findById).toHaveBeenCalledWith(
            detectionProgramId,
          );
          expect(detectionProgramRepository.add).not.toHaveBeenCalled();
        });
      });

      describe('when repository update fails', () => {
        it('throws error', async () => {
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

          detectionProgramRepository.findById.mockResolvedValue(
            existingDetectionProgram,
          );
          detectionProgramRepository.add.mockRejectedValue(
            new Error('Database error'),
          );

          await expect(
            updateDetectionProgramUseCase.execute(command),
          ).rejects.toThrow('Database error');

          expect(detectionProgramRepository.findById).toHaveBeenCalledWith(
            detectionProgramId,
          );
          expect(detectionProgramRepository.add).toHaveBeenCalledTimes(1);
        });
      });
    });
  });
});
