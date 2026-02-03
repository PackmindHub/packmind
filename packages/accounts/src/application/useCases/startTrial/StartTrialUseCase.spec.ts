import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createUserId,
  IDeploymentPort,
  ISpacesPort,
  RenderMode,
  StartTrialCommand,
  AnonymousTrialStartedEvent,
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
  let mockDeploymentPort: jest.Mocked<IDeploymentPort>;
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

    mockDeploymentPort = {
      createRenderModeConfiguration: jest.fn(),
    } as unknown as jest.Mocked<IDeploymentPort>;

    stubbedLogger = stubLogger();

    startTrialUseCase = new StartTrialUseCase(
      mockUserService,
      mockOrganizationService,
      mockEventEmitterService,
      mockSpacesPort,
      mockDeploymentPort,
      stubbedLogger,
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

      it('emits UserSignedUpEvent with correct payload', async () => {
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
      });

      it('emits TrialStartedEvent with correct payload', async () => {
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
      });

      it('emits AnonymousTrialStartedEvent instance', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        await startTrialUseCase.execute(command);

        const trialStartedCall = (
          mockEventEmitterService.emit as jest.Mock
        ).mock.calls.find(
          (call) => call[0] instanceof AnonymousTrialStartedEvent,
        );
        expect(trialStartedCall[0]).toBeInstanceOf(AnonymousTrialStartedEvent);
      });

      it('emits OrganizationCreatedEvent with quick-start method', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        await startTrialUseCase.execute(command);

        expect(mockEventEmitterService.emit).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({
              userId: expect.anything(),
              organizationId: mockOrganization.id,
              name: expect.stringMatching(/^trial-[a-f0-9-]+$/),
              method: 'quick-start',
              source: 'ui',
            }),
          }),
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

      it('creates render mode configuration with GH_COPILOT for vs-code agent', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        await startTrialUseCase.execute(command);

        expect(
          mockDeploymentPort.createRenderModeConfiguration,
        ).toHaveBeenCalledWith({
          userId: expect.anything(),
          organizationId: mockOrganization.id,
          activeRenderModes: [RenderMode.GH_COPILOT],
        });
      });

      it('creates render mode configuration with CURSOR for cursor agent', async () => {
        const command: StartTrialCommand = { agent: 'cursor' };

        await startTrialUseCase.execute(command);

        expect(
          mockDeploymentPort.createRenderModeConfiguration,
        ).toHaveBeenCalledWith({
          userId: expect.anything(),
          organizationId: mockOrganization.id,
          activeRenderModes: [RenderMode.CURSOR],
        });
      });

      it('creates render mode configuration with CLAUDE for claude agent', async () => {
        const command: StartTrialCommand = { agent: 'claude' };

        await startTrialUseCase.execute(command);

        expect(
          mockDeploymentPort.createRenderModeConfiguration,
        ).toHaveBeenCalledWith({
          userId: expect.anything(),
          organizationId: mockOrganization.id,
          activeRenderModes: [RenderMode.CLAUDE],
        });
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
          undefined,
          mockDeploymentPort,
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

    describe('when deploymentPort is not provided', () => {
      let useCaseWithoutDeploymentPort: StartTrialUseCase;

      beforeEach(() => {
        useCaseWithoutDeploymentPort = new StartTrialUseCase(
          mockUserService,
          mockOrganizationService,
          mockEventEmitterService,
          mockSpacesPort,
          stubbedLogger,
        );

        mockOrganizationService.createOrganization.mockResolvedValue(
          mockOrganization,
        );
        mockUserService.createUser.mockResolvedValue(mockUser);
      });

      it('does not call createRenderModeConfiguration', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        await useCaseWithoutDeploymentPort.execute(command);

        expect(
          mockDeploymentPort.createRenderModeConfiguration,
        ).not.toHaveBeenCalled();
      });

      it('returns user data', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        const result = await useCaseWithoutDeploymentPort.execute(command);

        expect(result.user).toEqual(mockUser);
      });
    });

    describe('when render mode configuration creation fails', () => {
      beforeEach(() => {
        mockOrganizationService.createOrganization.mockResolvedValue(
          mockOrganization,
        );
        mockUserService.createUser.mockResolvedValue(mockUser);
        mockSpacesPort.createSpace.mockResolvedValue(undefined);
        mockDeploymentPort.createRenderModeConfiguration.mockRejectedValue(
          new Error('Render mode configuration failed'),
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
  });
});
