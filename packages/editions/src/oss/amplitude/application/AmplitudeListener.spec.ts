import {
  IEventTrackingPort,
  TrialStartedEvent,
  TrialAccountActivatedEvent,
  createUserId,
  createOrganizationId,
} from '@packmind/types';
import { AmplitudeListener } from './AmplitudeListener';

describe('AmplitudeListener', () => {
  let listener: AmplitudeListener;
  let mockAdapter: jest.Mocked<IEventTrackingPort>;

  const mockUserId = createUserId('user-123');
  const mockOrganizationId = createOrganizationId('org-123');

  beforeEach(() => {
    mockAdapter = {
      trackEvent: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<IEventTrackingPort>;

    listener = new AmplitudeListener(mockAdapter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleTrialStarted', () => {
    it('tracks trial_started event with agent and startedAt', async () => {
      const startedAt = new Date('2024-01-15T10:00:00.000Z');
      const event = new TrialStartedEvent({
        userId: mockUserId,
        organizationId: mockOrganizationId,
        agent: 'vs-code',
        startedAt,
      });

      await listener['handleTrialStarted'](event);

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        mockUserId,
        mockOrganizationId,
        'trial_started',
        {
          agent: 'vs-code',
          startedAt: '2024-01-15T10:00:00.000Z',
        },
      );
    });

    it('tracks trial_started event with claude agent', async () => {
      const startedAt = new Date('2024-01-15T10:00:00.000Z');
      const event = new TrialStartedEvent({
        userId: mockUserId,
        organizationId: mockOrganizationId,
        agent: 'claude',
        startedAt,
      });

      await listener['handleTrialStarted'](event);

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        mockUserId,
        mockOrganizationId,
        'trial_started',
        {
          agent: 'claude',
          startedAt: '2024-01-15T10:00:00.000Z',
        },
      );
    });

    it('tracks trial_started event with cursor agent', async () => {
      const startedAt = new Date('2024-01-15T10:00:00.000Z');
      const event = new TrialStartedEvent({
        userId: mockUserId,
        organizationId: mockOrganizationId,
        agent: 'cursor',
        startedAt,
      });

      await listener['handleTrialStarted'](event);

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        mockUserId,
        mockOrganizationId,
        'trial_started',
        {
          agent: 'cursor',
          startedAt: '2024-01-15T10:00:00.000Z',
        },
      );
    });

    describe('when tracking fails', () => {
      it('does not throw', async () => {
        mockAdapter.trackEvent.mockRejectedValue(new Error('Tracking failed'));

        const event = new TrialStartedEvent({
          userId: mockUserId,
          organizationId: mockOrganizationId,
          agent: 'vs-code',
          startedAt: new Date(),
        });

        await expect(
          listener['handleTrialStarted'](event),
        ).resolves.not.toThrow();
      });
    });
  });

  describe('handleTrialAccountActivated', () => {
    it('tracks trial_account_activated event', async () => {
      const event = new TrialAccountActivatedEvent({
        userId: mockUserId,
        organizationId: mockOrganizationId,
        email: 'user@example.com',
      });

      await listener['handleTrialAccountActivated'](event);

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        mockUserId,
        mockOrganizationId,
        'trial_account_activated',
        {},
      );
    });

    describe('when tracking fails', () => {
      it('does not throw', async () => {
        mockAdapter.trackEvent.mockRejectedValue(new Error('Tracking failed'));

        const event = new TrialAccountActivatedEvent({
          userId: mockUserId,
          organizationId: mockOrganizationId,
          email: 'user@example.com',
        });

        await expect(
          listener['handleTrialAccountActivated'](event),
        ).resolves.not.toThrow();
      });
    });
  });
});
