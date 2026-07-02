import { stubLogger } from '@packmind/test-utils';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  createOrganizationId,
  createUserId,
  LinterCalledEvent,
} from '@packmind/types';
import { TrackLinterExecutionUseCase } from './TrackLinterExecutionUseCase';

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

    describe('when called with valid command', () => {
      const command = {
        organizationId,
        userId,
        targetCount: 2,
        standardCount: 5,
      };

      beforeEach(async () => {
        await useCase.execute(command);
      });

      it('emits exactly one event', () => {
        expect(mockEventEmitterService.emit).toHaveBeenCalledTimes(1);
      });

      it('emits a LinterCalledEvent instance', () => {
        const emittedEvent = (mockEventEmitterService.emit as jest.Mock).mock
          .calls[0][0];

        expect(emittedEvent).toBeInstanceOf(LinterCalledEvent);
      });

      it('includes correct payload in the event', () => {
        const emittedEvent = (mockEventEmitterService.emit as jest.Mock).mock
          .calls[0][0];

        expect(emittedEvent.payload).toEqual({
          userId: createUserId(userId),
          organizationId: createOrganizationId(organizationId),
          targetCount: 2,
          standardCount: 5,
          source: 'cli',
        });
      });
    });

    describe('when called with zero counts', () => {
      const command = {
        organizationId,
        userId,
        targetCount: 0,
        standardCount: 0,
      };

      beforeEach(async () => {
        await useCase.execute(command);
      });

      it('emits exactly one event', () => {
        expect(mockEventEmitterService.emit).toHaveBeenCalledTimes(1);
      });

      it('includes zero targetCount in the payload', () => {
        const emittedEvent = (mockEventEmitterService.emit as jest.Mock).mock
          .calls[0][0];

        expect(emittedEvent.payload.targetCount).toBe(0);
      });

      it('includes zero standardCount in the payload', () => {
        const emittedEvent = (mockEventEmitterService.emit as jest.Mock).mock
          .calls[0][0];

        expect(emittedEvent.payload.standardCount).toBe(0);
      });
    });
  });
});
