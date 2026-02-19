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
      updateSeverity: jest.fn(),
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
      let activeDetectionProgramId: ReturnType<
        typeof createActiveDetectionProgramId
      >;
      let newDetectionProgramVersion: ReturnType<
        typeof createDetectionProgramId
      >;
      let organizationId: ReturnType<typeof createOrganizationId>;
      let userId: ReturnType<typeof createUserId>;
      let existingActiveProgram: ActiveDetectionProgram;
      let detectionProgram: ReturnType<typeof detectionProgramFactory>;
      let expectedUpdatedProgram: ActiveDetectionProgram;
      let command: UpdateActiveDetectionProgramCommand;
      let result: ActiveDetectionProgram;

      beforeEach(async () => {
        activeDetectionProgramId = createActiveDetectionProgramId(uuidv4());
        newDetectionProgramVersion = createDetectionProgramId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        userId = createUserId(uuidv4());

        existingActiveProgram = activeDetectionProgramFactory({
          id: activeDetectionProgramId,
          detectionProgramVersion: createDetectionProgramId(uuidv4()),
          detectionProgramDraftVersion: null,
        });

        detectionProgram = detectionProgramFactory({
          id: newDetectionProgramVersion,
          status: DetectionStatus.READY,
        });

        expectedUpdatedProgram = {
          ...existingActiveProgram,
          detectionProgramVersion: newDetectionProgramVersion,
        };

        command = {
          activeDetectionProgram: existingActiveProgram,
          newDetectionProgramVersion,
          organizationId,
          userId,
        };

        detectionProgramRepository.findById.mockResolvedValue(detectionProgram);
        activeDetectionProgramRepository.updateActiveDetectionProgram.mockResolvedValue(
          expectedUpdatedProgram,
        );

        result = await updateActiveDetectionProgramUseCase.execute(command);
      });

      it('finds the detection program by id', () => {
        expect(detectionProgramRepository.findById).toHaveBeenCalledWith(
          newDetectionProgramVersion,
        );
      });

      it('updates the active detection program', () => {
        expect(
          activeDetectionProgramRepository.updateActiveDetectionProgram,
        ).toHaveBeenCalledWith(expectedUpdatedProgram);
      });

      it('returns the updated program', () => {
        expect(result).toEqual(expectedUpdatedProgram);
      });
    });

    describe('when updating detectionProgramDraftVersion only', () => {
      let activeDetectionProgramId: ReturnType<
        typeof createActiveDetectionProgramId
      >;
      let newDetectionProgramDraftVersion: ReturnType<
        typeof createDetectionProgramId
      >;
      let organizationId: ReturnType<typeof createOrganizationId>;
      let userId: ReturnType<typeof createUserId>;
      let existingActiveProgram: ActiveDetectionProgram;
      let expectedUpdatedProgram: ActiveDetectionProgram;
      let command: UpdateActiveDetectionProgramCommand;
      let result: ActiveDetectionProgram;

      beforeEach(async () => {
        activeDetectionProgramId = createActiveDetectionProgramId(uuidv4());
        newDetectionProgramDraftVersion = createDetectionProgramId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        userId = createUserId(uuidv4());

        existingActiveProgram = activeDetectionProgramFactory({
          id: activeDetectionProgramId,
          detectionProgramVersion: createDetectionProgramId(uuidv4()),
          detectionProgramDraftVersion: null,
        });

        expectedUpdatedProgram = {
          ...existingActiveProgram,
          detectionProgramDraftVersion: newDetectionProgramDraftVersion,
        };

        command = {
          activeDetectionProgram: existingActiveProgram,
          newDetectionProgramDraftVersion,
          organizationId,
          userId,
        };

        activeDetectionProgramRepository.updateActiveDetectionProgram.mockResolvedValue(
          expectedUpdatedProgram,
        );

        result = await updateActiveDetectionProgramUseCase.execute(command);
      });

      it('updates the active detection program', () => {
        expect(
          activeDetectionProgramRepository.updateActiveDetectionProgram,
        ).toHaveBeenCalledWith(expectedUpdatedProgram);
      });

      it('returns the updated program', () => {
        expect(result).toEqual(expectedUpdatedProgram);
      });
    });

    describe('when updating both fields', () => {
      let activeDetectionProgramId: ReturnType<
        typeof createActiveDetectionProgramId
      >;
      let newDetectionProgramVersion: ReturnType<
        typeof createDetectionProgramId
      >;
      let newDetectionProgramDraftVersion: ReturnType<
        typeof createDetectionProgramId
      >;
      let organizationId: ReturnType<typeof createOrganizationId>;
      let userId: ReturnType<typeof createUserId>;
      let existingActiveProgram: ActiveDetectionProgram;
      let detectionProgram: ReturnType<typeof detectionProgramFactory>;
      let expectedUpdatedProgram: ActiveDetectionProgram;
      let command: UpdateActiveDetectionProgramCommand;
      let result: ActiveDetectionProgram;

      beforeEach(async () => {
        activeDetectionProgramId = createActiveDetectionProgramId(uuidv4());
        newDetectionProgramVersion = createDetectionProgramId(uuidv4());
        newDetectionProgramDraftVersion = createDetectionProgramId(uuidv4());
        organizationId = createOrganizationId(uuidv4());
        userId = createUserId(uuidv4());

        existingActiveProgram = activeDetectionProgramFactory({
          id: activeDetectionProgramId,
          detectionProgramVersion: createDetectionProgramId(uuidv4()),
          detectionProgramDraftVersion: null,
        });

        detectionProgram = detectionProgramFactory({
          id: newDetectionProgramVersion,
          status: DetectionStatus.READY,
        });

        expectedUpdatedProgram = {
          ...existingActiveProgram,
          detectionProgramVersion: newDetectionProgramVersion,
          detectionProgramDraftVersion: newDetectionProgramDraftVersion,
        };

        command = {
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

        result = await updateActiveDetectionProgramUseCase.execute(command);
      });

      it('finds the detection program by id', () => {
        expect(detectionProgramRepository.findById).toHaveBeenCalledWith(
          newDetectionProgramVersion,
        );
      });

      it('updates the active detection program', () => {
        expect(
          activeDetectionProgramRepository.updateActiveDetectionProgram,
        ).toHaveBeenCalledWith(expectedUpdatedProgram);
      });

      it('returns the updated program', () => {
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
        let activeDetectionProgramId: ReturnType<
          typeof createActiveDetectionProgramId
        >;
        let organizationId: ReturnType<typeof createOrganizationId>;
        let userId: ReturnType<typeof createUserId>;
        let existingActiveProgram: ActiveDetectionProgram;
        let command: UpdateActiveDetectionProgramCommand;

        beforeEach(() => {
          activeDetectionProgramId = createActiveDetectionProgramId(uuidv4());
          organizationId = createOrganizationId(uuidv4());
          userId = createUserId(uuidv4());

          existingActiveProgram = activeDetectionProgramFactory({
            id: activeDetectionProgramId,
          });

          command = {
            activeDetectionProgram: existingActiveProgram,
            organizationId,
            userId,
          };
        });

        it('throws error with correct message', async () => {
          await expect(
            updateActiveDetectionProgramUseCase.execute(command),
          ).rejects.toThrow(
            'At least one of newDetectionProgramVersion or newDetectionProgramDraftVersion must be provided',
          );
        });

        it('does not call updateActiveDetectionProgram', async () => {
          try {
            await updateActiveDetectionProgramUseCase.execute(command);
          } catch {
            // Expected to throw
          }

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
        let activeDetectionProgramId: ReturnType<
          typeof createActiveDetectionProgramId
        >;
        let newDetectionProgramVersion: ReturnType<
          typeof createDetectionProgramId
        >;
        let organizationId: ReturnType<typeof createOrganizationId>;
        let userId: ReturnType<typeof createUserId>;
        let existingActiveProgram: ActiveDetectionProgram;
        let command: UpdateActiveDetectionProgramCommand;

        beforeEach(() => {
          activeDetectionProgramId = createActiveDetectionProgramId(uuidv4());
          newDetectionProgramVersion = createDetectionProgramId(uuidv4());
          organizationId = createOrganizationId(uuidv4());
          userId = createUserId(uuidv4());

          existingActiveProgram = activeDetectionProgramFactory({
            id: activeDetectionProgramId,
          });

          command = {
            activeDetectionProgram: existingActiveProgram,
            newDetectionProgramVersion,
            organizationId,
            userId,
          };

          detectionProgramRepository.findById.mockResolvedValue(null);
        });

        it('throws error with correct message', async () => {
          await expect(
            updateActiveDetectionProgramUseCase.execute(command),
          ).rejects.toThrow(
            `Detection program ${newDetectionProgramVersion} not found`,
          );
        });

        it('does not call updateActiveDetectionProgram', async () => {
          try {
            await updateActiveDetectionProgramUseCase.execute(command);
          } catch {
            // Expected to throw
          }

          expect(
            activeDetectionProgramRepository.updateActiveDetectionProgram,
          ).not.toHaveBeenCalled();
        });
      });

      describe('when detection program status is not READY', () => {
        describe('when status is IN_PROGRESS', () => {
          let activeDetectionProgramId: ReturnType<
            typeof createActiveDetectionProgramId
          >;
          let newDetectionProgramVersion: ReturnType<
            typeof createDetectionProgramId
          >;
          let organizationId: ReturnType<typeof createOrganizationId>;
          let userId: ReturnType<typeof createUserId>;
          let existingActiveProgram: ActiveDetectionProgram;
          let detectionProgram: ReturnType<typeof detectionProgramFactory>;
          let command: UpdateActiveDetectionProgramCommand;

          beforeEach(() => {
            activeDetectionProgramId = createActiveDetectionProgramId(uuidv4());
            newDetectionProgramVersion = createDetectionProgramId(uuidv4());
            organizationId = createOrganizationId(uuidv4());
            userId = createUserId(uuidv4());

            existingActiveProgram = activeDetectionProgramFactory({
              id: activeDetectionProgramId,
            });

            detectionProgram = detectionProgramFactory({
              id: newDetectionProgramVersion,
              status: DetectionStatus.IN_PROGRESS,
            });

            command = {
              activeDetectionProgram: existingActiveProgram,
              newDetectionProgramVersion,
              organizationId,
              userId,
            };

            detectionProgramRepository.findById.mockResolvedValue(
              detectionProgram,
            );
          });

          it('throws InvalidDetectionProgramStatusError', async () => {
            await expect(
              updateActiveDetectionProgramUseCase.execute(command),
            ).rejects.toThrow(InvalidDetectionProgramStatusError);
          });

          it('throws error with correct message', async () => {
            await expect(
              updateActiveDetectionProgramUseCase.execute(command),
            ).rejects.toThrow(
              `Detection program ${newDetectionProgramVersion} cannot be promoted as active. Current status: ${DetectionStatus.IN_PROGRESS}, required status: ${DetectionStatus.READY}`,
            );
          });

          it('does not call updateActiveDetectionProgram', async () => {
            try {
              await updateActiveDetectionProgramUseCase.execute(command);
            } catch {
              // Expected to throw
            }

            expect(
              activeDetectionProgramRepository.updateActiveDetectionProgram,
            ).not.toHaveBeenCalled();
          });
        });

        describe('when status is TO_REVIEW', () => {
          let activeDetectionProgramId: ReturnType<
            typeof createActiveDetectionProgramId
          >;
          let newDetectionProgramVersion: ReturnType<
            typeof createDetectionProgramId
          >;
          let organizationId: ReturnType<typeof createOrganizationId>;
          let userId: ReturnType<typeof createUserId>;
          let existingActiveProgram: ActiveDetectionProgram;
          let detectionProgram: ReturnType<typeof detectionProgramFactory>;
          let command: UpdateActiveDetectionProgramCommand;

          beforeEach(() => {
            activeDetectionProgramId = createActiveDetectionProgramId(uuidv4());
            newDetectionProgramVersion = createDetectionProgramId(uuidv4());
            organizationId = createOrganizationId(uuidv4());
            userId = createUserId(uuidv4());

            existingActiveProgram = activeDetectionProgramFactory({
              id: activeDetectionProgramId,
            });

            detectionProgram = detectionProgramFactory({
              id: newDetectionProgramVersion,
              status: DetectionStatus.TO_REVIEW,
            });

            command = {
              activeDetectionProgram: existingActiveProgram,
              newDetectionProgramVersion,
              organizationId,
              userId,
            };

            detectionProgramRepository.findById.mockResolvedValue(
              detectionProgram,
            );
          });

          it('throws InvalidDetectionProgramStatusError', async () => {
            await expect(
              updateActiveDetectionProgramUseCase.execute(command),
            ).rejects.toThrow(InvalidDetectionProgramStatusError);
          });

          it('does not call updateActiveDetectionProgram', async () => {
            try {
              await updateActiveDetectionProgramUseCase.execute(command);
            } catch {
              // Expected to throw
            }

            expect(
              activeDetectionProgramRepository.updateActiveDetectionProgram,
            ).not.toHaveBeenCalled();
          });
        });

        describe('when status is ERROR', () => {
          let activeDetectionProgramId: ReturnType<
            typeof createActiveDetectionProgramId
          >;
          let newDetectionProgramVersion: ReturnType<
            typeof createDetectionProgramId
          >;
          let organizationId: ReturnType<typeof createOrganizationId>;
          let userId: ReturnType<typeof createUserId>;
          let existingActiveProgram: ActiveDetectionProgram;
          let detectionProgram: ReturnType<typeof detectionProgramFactory>;
          let command: UpdateActiveDetectionProgramCommand;

          beforeEach(() => {
            activeDetectionProgramId = createActiveDetectionProgramId(uuidv4());
            newDetectionProgramVersion = createDetectionProgramId(uuidv4());
            organizationId = createOrganizationId(uuidv4());
            userId = createUserId(uuidv4());

            existingActiveProgram = activeDetectionProgramFactory({
              id: activeDetectionProgramId,
            });

            detectionProgram = detectionProgramFactory({
              id: newDetectionProgramVersion,
              status: DetectionStatus.ERROR,
            });

            command = {
              activeDetectionProgram: existingActiveProgram,
              newDetectionProgramVersion,
              organizationId,
              userId,
            };

            detectionProgramRepository.findById.mockResolvedValue(
              detectionProgram,
            );
          });

          it('throws InvalidDetectionProgramStatusError', async () => {
            await expect(
              updateActiveDetectionProgramUseCase.execute(command),
            ).rejects.toThrow(InvalidDetectionProgramStatusError);
          });

          it('does not call updateActiveDetectionProgram', async () => {
            try {
              await updateActiveDetectionProgramUseCase.execute(command);
            } catch {
              // Expected to throw
            }

            expect(
              activeDetectionProgramRepository.updateActiveDetectionProgram,
            ).not.toHaveBeenCalled();
          });
        });
      });
    });
  });
});
