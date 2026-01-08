import { stubLogger } from '@packmind/test-utils';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  createOrganizationId,
  createUserId,
  LinterCalledEvent,
} from '@packmind/types';
import { TrackLinterExecutionUseCase } from './trackLinterExecution.usecase';

describe('TrackLinterExecutionUseCase', () => {
  let useCase: TrackLinterExecutionUseCase;
  let mockEventEmitterService: jest.Mocked<PackmindEventEmitterService>;

  beforeEach(() => {
    mockEventEmitterService = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    useCase = new TrackLinterExecutionUseCase(
      mockEventEmitterService,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const organizationId = createOrganizationId('org-123');
    const userId = createUserId('user-123');

    it('emits LinterCalledEvent with correct payload', async () => {
      const command = {
        organizationId,
        userId,
        targetCount: 2,
        standardCount: 5,
      };

      await useCase.execute(command);

      expect(mockEventEmitterService.emit).toHaveBeenCalledTimes(1);

      const emittedEvent = (mockEventEmitterService.emit as jest.Mock).mock
        .calls[0][0];
      expect(emittedEvent).toBeInstanceOf(LinterCalledEvent);
      expect(emittedEvent.payload).toEqual({
        userId: createUserId(userId),
        organizationId: createOrganizationId(organizationId),
        targetCount: 2,
        standardCount: 5,
      });
    });

    it('emits event with zero counts', async () => {
      const command = {
        organizationId,
        userId,
        targetCount: 0,
        standardCount: 0,
      };

      await useCase.execute(command);

      expect(mockEventEmitterService.emit).toHaveBeenCalledTimes(1);

      const emittedEvent = (mockEventEmitterService.emit as jest.Mock).mock
        .calls[0][0];
      expect(emittedEvent.payload.targetCount).toBe(0);
      expect(emittedEvent.payload.standardCount).toBe(0);
    });
  });
});
