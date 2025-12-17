import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createUserId,
  ISpacesPort,
  StartTrialCommand,
  UserSignedUpEvent,
  TrialStartedEvent,
} from '@packmind/types';
import { organizationFactory, userFactory } from '../../../../test';
import { OrganizationService } from '../../services/OrganizationService';
import { UserService } from '../../services/UserService';
import { StartTrialUseCase } from './StartTrialUseCase';

describe('StartTrialUseCase', () => {
  let startTrialUseCase: StartTrialUseCase;
  let mockUserService: jest.Mocked<UserService>;
  let mockOrganizationService: jest.Mocked<OrganizationService>;
  let mockEventEmitterService: jest.Mocked<PackmindEventEmitterService>;
  let mockSpacesPort: jest.Mocked<ISpacesPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  const mockOrganization = organizationFactory({
    id: createOrganizationId('org-123'),
    name: 'trial-test-uuid',
    slug: 'trial-test-uuid',
  });

  const mockUser = userFactory({
    id: createUserId('user-123'),
    email: 'trial-test-uuid@packmind.trial',
    trial: true,
    memberships: [
      {
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-123'),
        role: 'admin',
      },
    ],
  });

  beforeEach(() => {
    mockUserService = {
      createUser: jest.fn(),
      getUserById: jest.fn(),
      getUserByEmail: jest.fn(),
      hashPassword: jest.fn(),
      validatePassword: jest.fn(),
      listUsers: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    mockOrganizationService = {
      createOrganization: jest.fn(),
      getOrganizationById: jest.fn(),
      getOrganizationByName: jest.fn(),
      listOrganizations: jest.fn(),
    } as unknown as jest.Mocked<OrganizationService>;

    mockEventEmitterService = {
      emit: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    mockSpacesPort = {
      createSpace: jest.fn(),
    } as unknown as jest.Mocked<ISpacesPort>;

    stubbedLogger = stubLogger();

    startTrialUseCase = new StartTrialUseCase(
      mockUserService,
      mockOrganizationService,
      mockEventEmitterService,
      stubbedLogger,
      mockSpacesPort,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when trial is started successfully', () => {
      beforeEach(() => {
        mockOrganizationService.createOrganization.mockResolvedValue(
          mockOrganization,
        );
        mockUserService.createUser.mockResolvedValue(mockUser);
        mockSpacesPort.createSpace.mockResolvedValue(undefined);
      });

      it('creates organization with generated name', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        await startTrialUseCase.execute(command);

        expect(mockOrganizationService.createOrganization).toHaveBeenCalledWith(
          expect.stringMatching(/^trial-[a-f0-9-]+$/),
        );
      });

      it('creates user with generated email and trial flag', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        await startTrialUseCase.execute(command);

        expect(mockUserService.createUser).toHaveBeenCalledWith(
          expect.stringMatching(/^trial-[a-f0-9-]+@packmind\.trial$/),
          expect.stringMatching(/^[a-f0-9-]+$/),
          mockOrganization.id,
          { trial: true },
        );
      });

      it('creates default Global space for the organization', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        await startTrialUseCase.execute(command);

        expect(mockSpacesPort.createSpace).toHaveBeenCalledWith(
          'Global',
          mockOrganization.id,
        );
      });

      it('emits UserSignedUpEvent without trialMode', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        await startTrialUseCase.execute(command);

        expect(mockEventEmitterService.emit).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({
              userId: expect.anything(),
              organizationId: mockOrganization.id,
              email: expect.stringMatching(
                /^trial-[a-f0-9-]+@packmind\.trial$/,
              ),
            }),
          }),
        );

        // Verify trialMode is NOT in the payload
        const userSignedUpCall = (
          mockEventEmitterService.emit as jest.Mock
        ).mock.calls.find((call) => call[0] instanceof UserSignedUpEvent);
        expect(userSignedUpCall[0].payload).not.toHaveProperty('trialMode');
      });

      it('emits TrialStartedEvent with agent and startedAt', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        await startTrialUseCase.execute(command);

        expect(mockEventEmitterService.emit).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({
              userId: expect.anything(),
              organizationId: mockOrganization.id,
              agent: 'vs-code',
              startedAt: expect.any(Date),
            }),
          }),
        );

        const trialStartedCall = (
          mockEventEmitterService.emit as jest.Mock
        ).mock.calls.find((call) => call[0] instanceof TrialStartedEvent);
        expect(trialStartedCall).toBeDefined();
        expect(trialStartedCall[0]).toBeInstanceOf(TrialStartedEvent);
      });

      it('returns user data', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        const result = await startTrialUseCase.execute(command);

        expect(result.user).toEqual(mockUser);
      });

      it('returns organization data', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        const result = await startTrialUseCase.execute(command);

        expect(result.organization).toEqual(mockOrganization);
      });

      it('returns admin role', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        const result = await startTrialUseCase.execute(command);

        expect(result.role).toBe('admin');
      });
    });

    describe('when organization creation fails', () => {
      beforeEach(() => {
        mockOrganizationService.createOrganization.mockRejectedValue(
          new Error('Database error'),
        );
      });

      it('throws error', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        await expect(startTrialUseCase.execute(command)).rejects.toThrow(
          'Database error',
        );
      });

      it('does not create user', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        try {
          await startTrialUseCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(mockUserService.createUser).not.toHaveBeenCalled();
      });
    });

    describe('when user creation fails', () => {
      beforeEach(() => {
        mockOrganizationService.createOrganization.mockResolvedValue(
          mockOrganization,
        );
        mockUserService.createUser.mockRejectedValue(
          new Error('User creation failed'),
        );
      });

      it('throws error', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        await expect(startTrialUseCase.execute(command)).rejects.toThrow(
          'User creation failed',
        );
      });
    });

    describe('when space creation fails', () => {
      beforeEach(() => {
        mockOrganizationService.createOrganization.mockResolvedValue(
          mockOrganization,
        );
        mockUserService.createUser.mockResolvedValue(mockUser);
        mockSpacesPort.createSpace.mockRejectedValue(
          new Error('Space creation failed'),
        );
      });

      it('returns user data', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        const result = await startTrialUseCase.execute(command);

        expect(result.user).toEqual(mockUser);
      });

      it('returns organization data', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        const result = await startTrialUseCase.execute(command);

        expect(result.organization).toEqual(mockOrganization);
      });

      it('returns admin role', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        const result = await startTrialUseCase.execute(command);

        expect(result.role).toBe('admin');
      });
    });

    describe('when spacesPort is not provided', () => {
      let useCaseWithoutSpacesPort: StartTrialUseCase;

      beforeEach(() => {
        useCaseWithoutSpacesPort = new StartTrialUseCase(
          mockUserService,
          mockOrganizationService,
          mockEventEmitterService,
          stubbedLogger,
        );

        mockOrganizationService.createOrganization.mockResolvedValue(
          mockOrganization,
        );
        mockUserService.createUser.mockResolvedValue(mockUser);
      });

      it('does not call createSpace', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        await useCaseWithoutSpacesPort.execute(command);

        expect(mockSpacesPort.createSpace).not.toHaveBeenCalled();
      });

      it('returns user data', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        const result = await useCaseWithoutSpacesPort.execute(command);

        expect(result.user).toEqual(mockUser);
      });

      it('returns organization data', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        const result = await useCaseWithoutSpacesPort.execute(command);

        expect(result.organization).toEqual(mockOrganization);
      });

      it('returns admin role', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        const result = await useCaseWithoutSpacesPort.execute(command);

        expect(result.role).toBe('admin');
      });
    });
  });
});
