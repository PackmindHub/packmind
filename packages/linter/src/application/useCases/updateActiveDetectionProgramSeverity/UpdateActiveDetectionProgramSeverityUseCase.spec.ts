import { UpdateActiveDetectionProgramSeverityUseCase } from './UpdateActiveDetectionProgramSeverityUseCase';
import { v4 as uuidv4 } from 'uuid';
import {
  createActiveDetectionProgramId,
  createOrganizationId,
  createRuleId,
  createUserId,
  DetectionSeverity,
  LinterRuleSeverityUpdatedEvent,
  UpdateActiveDetectionProgramSeverityCommand,
} from '@packmind/types';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import { PackmindLogger } from '@packmind/logger';
import { IActiveDetectionProgramRepository } from '../../../domain/repositories/IActiveDetectionProgramRepository';
import { activeDetectionProgramFactory } from '../../../../test';
import { ActiveDetectionProgramNotFoundError } from '../../../domain/errors';

describe('UpdateActiveDetectionProgramSeverityUseCase', () => {
  let useCase: UpdateActiveDetectionProgramSeverityUseCase;
  let activeDetectionProgramRepository: jest.Mocked<IActiveDetectionProgramRepository>;
  let mockEventEmitterService: jest.Mocked<PackmindEventEmitterService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
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

    mockEventEmitterService = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    stubbedLogger = stubLogger();

    useCase = new UpdateActiveDetectionProgramSeverityUseCase(
      activeDetectionProgramRepository,
      mockEventEmitterService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when active detection program exists', () => {
      const activeDetectionProgramId = createActiveDetectionProgramId(uuidv4());
      const ruleId = createRuleId(uuidv4());
      const organizationId = createOrganizationId(uuidv4());
      const userId = createUserId(uuidv4());

      describe('when updating severity to WARNING', () => {
        let command: UpdateActiveDetectionProgramSeverityCommand;

        beforeEach(() => {
          const existingProgram = activeDetectionProgramFactory({
            id: activeDetectionProgramId,
            ruleId,
            severity: DetectionSeverity.ERROR,
          });

          activeDetectionProgramRepository.findById.mockResolvedValue(
            existingProgram,
          );

          const updatedProgram = activeDetectionProgramFactory({
            id: activeDetectionProgramId,
            ruleId,
            severity: DetectionSeverity.WARNING,
          });
          activeDetectionProgramRepository.updateSeverity.mockResolvedValue(
            updatedProgram,
          );

          command = {
            userId,
            organizationId,
            activeDetectionProgramId,
            ruleId,
            severity: DetectionSeverity.WARNING,
          };
        });

        it('returns the updated program with WARNING severity', async () => {
          const result = await useCase.execute(command);

          expect(result.severity).toEqual(DetectionSeverity.WARNING);
        });

        it('calls updateSeverity on the repository', async () => {
          await useCase.execute(command);

          expect(
            activeDetectionProgramRepository.updateSeverity,
          ).toHaveBeenCalledWith(
            activeDetectionProgramId,
            DetectionSeverity.WARNING,
          );
        });

        it('emits exactly one event', async () => {
          await useCase.execute(command);

          expect(mockEventEmitterService.emit).toHaveBeenCalledTimes(1);
        });

        it('emits a LinterRuleSeverityUpdatedEvent instance', async () => {
          await useCase.execute(command);

          const emittedEvent = mockEventEmitterService.emit.mock.calls[0][0];
          expect(emittedEvent).toBeInstanceOf(LinterRuleSeverityUpdatedEvent);
        });

        it('includes ruleId in the event payload', async () => {
          await useCase.execute(command);

          const emittedEvent = mockEventEmitterService.emit.mock.calls[0][0];
          expect(emittedEvent.payload.ruleId).toEqual(ruleId);
        });

        it('includes the new severity in the event payload', async () => {
          await useCase.execute(command);

          const emittedEvent = mockEventEmitterService.emit.mock.calls[0][0];
          expect(emittedEvent.payload.severity).toEqual(
            DetectionSeverity.WARNING,
          );
        });
      });

      describe('when updating severity to ERROR', () => {
        let command: UpdateActiveDetectionProgramSeverityCommand;

        beforeEach(() => {
          const existingProgram = activeDetectionProgramFactory({
            id: activeDetectionProgramId,
            ruleId,
            severity: DetectionSeverity.WARNING,
          });

          activeDetectionProgramRepository.findById.mockResolvedValue(
            existingProgram,
          );

          const updatedProgram = activeDetectionProgramFactory({
            id: activeDetectionProgramId,
            ruleId,
            severity: DetectionSeverity.ERROR,
          });
          activeDetectionProgramRepository.updateSeverity.mockResolvedValue(
            updatedProgram,
          );

          command = {
            userId,
            organizationId,
            activeDetectionProgramId,
            ruleId,
            severity: DetectionSeverity.ERROR,
          };
        });

        it('returns the updated program with ERROR severity', async () => {
          const result = await useCase.execute(command);

          expect(result.severity).toEqual(DetectionSeverity.ERROR);
        });

        it('emits exactly one event', async () => {
          await useCase.execute(command);

          expect(mockEventEmitterService.emit).toHaveBeenCalledTimes(1);
        });

        it('emits a LinterRuleSeverityUpdatedEvent instance', async () => {
          await useCase.execute(command);

          const emittedEvent = mockEventEmitterService.emit.mock.calls[0][0];
          expect(emittedEvent).toBeInstanceOf(LinterRuleSeverityUpdatedEvent);
        });

        it('includes ruleId in the event payload', async () => {
          await useCase.execute(command);

          const emittedEvent = mockEventEmitterService.emit.mock.calls[0][0];
          expect(emittedEvent.payload.ruleId).toEqual(ruleId);
        });

        it('includes the new severity in the event payload', async () => {
          await useCase.execute(command);

          const emittedEvent = mockEventEmitterService.emit.mock.calls[0][0];
          expect(emittedEvent.payload.severity).toEqual(
            DetectionSeverity.ERROR,
          );
        });
      });

      describe('when ruleId does not match', () => {
        let command: UpdateActiveDetectionProgramSeverityCommand;

        beforeEach(() => {
          const existingProgram = activeDetectionProgramFactory({
            id: activeDetectionProgramId,
            ruleId: createRuleId(uuidv4()),
          });

          activeDetectionProgramRepository.findById.mockResolvedValue(
            existingProgram,
          );

          command = {
            userId,
            organizationId,
            activeDetectionProgramId,
            ruleId,
            severity: DetectionSeverity.WARNING,
          };
        });

        it('throws ActiveDetectionProgramNotFoundError', async () => {
          await expect(useCase.execute(command)).rejects.toThrow(
            ActiveDetectionProgramNotFoundError,
          );
        });

        it('does not call updateSeverity on the repository', async () => {
          try {
            await useCase.execute(command);
          } catch {
            // Expected to throw
          }

          expect(
            activeDetectionProgramRepository.updateSeverity,
          ).not.toHaveBeenCalled();
        });

        it('does not emit any event', async () => {
          try {
            await useCase.execute(command);
          } catch {
            // Expected to throw
          }

          expect(mockEventEmitterService.emit).not.toHaveBeenCalled();
        });
      });
    });

    describe('when active detection program does not exist', () => {
      let command: UpdateActiveDetectionProgramSeverityCommand;

      beforeEach(() => {
        activeDetectionProgramRepository.findById.mockResolvedValue(null);

        command = {
          userId: createUserId(uuidv4()),
          organizationId: createOrganizationId(uuidv4()),
          activeDetectionProgramId: createActiveDetectionProgramId(uuidv4()),
          ruleId: createRuleId(uuidv4()),
          severity: DetectionSeverity.WARNING,
        };
      });

      it('throws ActiveDetectionProgramNotFoundError', async () => {
        await expect(useCase.execute(command)).rejects.toThrow(
          ActiveDetectionProgramNotFoundError,
        );
      });

      it('does not call updateSeverity on the repository', async () => {
        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(
          activeDetectionProgramRepository.updateSeverity,
        ).not.toHaveBeenCalled();
      });

      it('does not emit any event', async () => {
        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(mockEventEmitterService.emit).not.toHaveBeenCalled();
      });
    });
  });
});
