import { Crisp } from 'crisp-api';
import { stubLogger } from '@packmind/test-utils';
import { Configuration } from '@packmind/node-utils';
import { CrispTrackEventService } from './CrispTrackEventService';

jest.mock('crisp-api');
jest.mock('@packmind/node-utils', () => ({
  ...jest.requireActual('@packmind/node-utils'),
  Configuration: {
    getConfig: jest.fn(),
  },
}));

describe('CrispTrackEventService', () => {
  let service: CrispTrackEventService;
  let logger: ReturnType<typeof stubLogger>;
  let mockCrispClient: jest.Mocked<Crisp>;

  beforeEach(() => {
    logger = stubLogger();
    mockCrispClient = {
      authenticateTier: jest.fn(),
      website: {
        checkPeopleProfileExists: jest.fn(),
        addNewPeopleProfile: jest.fn(),
        addPeopleEvent: jest.fn(),
      },
    } as unknown as jest.Mocked<Crisp>;

    (Crisp as jest.MockedClass<typeof Crisp>).mockImplementation(
      () => mockCrispClient,
    );

    service = new CrispTrackEventService(logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPeopleIfNotAlreadyExists', () => {
    describe('when email is trial', () => {
      const trialEmail =
        'trial-550e8400-e29b-41d4-a716-446655440000@packmind.trial';

      it('does not check for existing profile', async () => {
        await service.createPeopleIfNotAlreadyExists(trialEmail);

        expect(
          mockCrispClient.website.checkPeopleProfileExists,
        ).not.toHaveBeenCalled();
      });

      it('does not create profile', async () => {
        await service.createPeopleIfNotAlreadyExists(trialEmail);

        expect(
          mockCrispClient.website.addNewPeopleProfile,
        ).not.toHaveBeenCalled();
      });
    });

    describe('when email is not trial', () => {
      const regularEmail = 'user@example.com';

      beforeEach(() => {
        (Configuration.getConfig as jest.Mock).mockResolvedValue('test-config');
      });

      describe('when profile exists', () => {
        beforeEach(() => {
          mockCrispClient.website.checkPeopleProfileExists.mockResolvedValue(
            undefined,
          );
        });

        it('checks for existing profile', async () => {
          await service.createPeopleIfNotAlreadyExists(regularEmail);

          expect(
            mockCrispClient.website.checkPeopleProfileExists,
          ).toHaveBeenCalledWith('test-config', regularEmail);
        });

        it('does not create profile', async () => {
          await service.createPeopleIfNotAlreadyExists(regularEmail);

          expect(
            mockCrispClient.website.addNewPeopleProfile,
          ).not.toHaveBeenCalled();
        });
      });

      describe('when profile does not exist', () => {
        beforeEach(() => {
          mockCrispClient.website.checkPeopleProfileExists.mockRejectedValue({
            code: 404,
          });
        });

        it('creates profile', async () => {
          await service.createPeopleIfNotAlreadyExists(regularEmail);

          expect(
            mockCrispClient.website.addNewPeopleProfile,
          ).toHaveBeenCalledWith('test-config', {
            email: regularEmail,
            person: {
              nickname: regularEmail,
            },
          });
        });
      });

      describe('when addNewPeopleProfile fails with subscription error', () => {
        const subscriptionError = {
          reason: 'error',
          message: 'subscription_upgrade_required',
          code: 402,
          data: {
            namespace: 'response',
            message: 'Got response error: subscription_upgrade_required',
          },
        };

        beforeEach(() => {
          mockCrispClient.website.checkPeopleProfileExists.mockRejectedValue({
            code: 404,
          });
          mockCrispClient.website.addNewPeopleProfile.mockRejectedValue(
            subscriptionError,
          );
        });

        it('does not throw', async () => {
          await expect(
            service.createPeopleIfNotAlreadyExists(regularEmail),
          ).resolves.toBeUndefined();
        });

        it('attempted to create the profile before encountering the error', async () => {
          await service.createPeopleIfNotAlreadyExists(regularEmail);

          expect(
            mockCrispClient.website.addNewPeopleProfile,
          ).toHaveBeenCalled();
        });
      });

      describe('when checkPeopleProfileExists fails with non-404 error', () => {
        beforeEach(() => {
          mockCrispClient.website.checkPeopleProfileExists.mockRejectedValue({
            code: 500,
            message: 'Internal Server Error',
          });
        });

        it('does not throw', async () => {
          await expect(
            service.createPeopleIfNotAlreadyExists(regularEmail),
          ).resolves.toBeUndefined();
        });

        it('does not attempt to create the profile', async () => {
          await service.createPeopleIfNotAlreadyExists(regularEmail);

          expect(
            mockCrispClient.website.addNewPeopleProfile,
          ).not.toHaveBeenCalled();
        });

        it('queried for profile existence before failing', async () => {
          await service.createPeopleIfNotAlreadyExists(regularEmail);

          expect(
            mockCrispClient.website.checkPeopleProfileExists,
          ).toHaveBeenCalled();
        });
      });
    });
  });

  describe('addPeopleEvent', () => {
    describe('when email is trial', () => {
      const trialEmail =
        'trial-550e8400-e29b-41d4-a716-446655440000@packmind.trial';
      const eventName = 'User Signed Up';

      it('does not create profile', async () => {
        await service.addPeopleEvent(trialEmail, eventName);

        expect(
          mockCrispClient.website.checkPeopleProfileExists,
        ).not.toHaveBeenCalled();
      });

      it('does not add event', async () => {
        await service.addPeopleEvent(trialEmail, eventName);

        expect(mockCrispClient.website.addPeopleEvent).not.toHaveBeenCalled();
      });
    });

    describe('when email is not trial', () => {
      const regularEmail = 'user@example.com';
      const eventName = 'User Signed Up';

      beforeEach(() => {
        (Configuration.getConfig as jest.Mock).mockResolvedValue('test-config');
        mockCrispClient.website.checkPeopleProfileExists.mockResolvedValue(
          undefined,
        );
      });

      it('adds event to Crisp', async () => {
        await service.addPeopleEvent(regularEmail, eventName);

        expect(mockCrispClient.website.addPeopleEvent).toHaveBeenCalledWith(
          'test-config',
          regularEmail,
          { text: eventName },
        );
      });
    });
  });
});
