import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createUserId,
  IMcpTokenService,
  ISpacesPort,
  StartTrialCommand,
  UserSignedUpEvent,
} from '@packmind/types';
import { organizationFactory, userFactory } from '../../../../test';
import { OrganizationService } from '../../services/OrganizationService';
import { UserService } from '../../services/UserService';
import { StartTrialUseCase } from './StartTrialUseCase';

describe('StartTrialUseCase', () => {
  let startTrialUseCase: StartTrialUseCase;
  let mockUserService: jest.Mocked<UserService>;
  let mockOrganizationService: jest.Mocked<OrganizationService>;
  let mockMcpTokenService: jest.Mocked<IMcpTokenService>;
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

    mockMcpTokenService = {
      generateToken: jest.fn(),
      getMcpUrl: jest.fn(),
    } as jest.Mocked<IMcpTokenService>;

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
      mockMcpTokenService,
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
        mockMcpTokenService.generateToken.mockReturnValue({
          accessToken: 'test-token-123',
          tokenType: 'Bearer',
          expiresIn: 2592000,
        });
        mockMcpTokenService.getMcpUrl.mockReturnValue(
          'https://api.packmind.com/mcp',
        );
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

      it('emits UserSignedUpEvent', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        await startTrialUseCase.execute(command);

        expect(mockEventEmitterService.emit).toHaveBeenCalledWith(
          expect.any(UserSignedUpEvent),
        );
      });

      it('generates MCP token with user and organization', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        await startTrialUseCase.execute(command);

        expect(mockMcpTokenService.generateToken).toHaveBeenCalledWith({
          user: mockUser,
          organization: mockOrganization,
          role: 'admin',
        });
      });

      it('returns URL with VS Code protocol', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        const result = await startTrialUseCase.execute(command);

        expect(result.mcpSetupUrl).toMatch(/^vscode:mcp\/install\?/);
      });

      it('includes packmind server name in URL', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        const result = await startTrialUseCase.execute(command);

        expect(result.mcpSetupUrl).toContain(
          encodeURIComponent('"name":"packmind"'),
        );
      });

      it('includes authorization token in URL', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        const result = await startTrialUseCase.execute(command);

        expect(result.mcpSetupUrl).toContain(
          encodeURIComponent('Bearer test-token-123'),
        );
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

      it('does not generate token', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        try {
          await startTrialUseCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(mockMcpTokenService.generateToken).not.toHaveBeenCalled();
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

      it('does not generate token', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        try {
          await startTrialUseCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(mockMcpTokenService.generateToken).not.toHaveBeenCalled();
      });
    });

    describe('when space creation fails', () => {
      it('continues without throwing error', async () => {
        mockOrganizationService.createOrganization.mockResolvedValue(
          mockOrganization,
        );
        mockUserService.createUser.mockResolvedValue(mockUser);
        mockSpacesPort.createSpace.mockRejectedValue(
          new Error('Space creation failed'),
        );
        mockMcpTokenService.generateToken.mockReturnValue({
          accessToken: 'test-token-123',
          tokenType: 'Bearer',
          expiresIn: 2592000,
        });
        mockMcpTokenService.getMcpUrl.mockReturnValue(
          'https://api.packmind.com/mcp',
        );

        const command: StartTrialCommand = { agent: 'vs-code' };

        const result = await startTrialUseCase.execute(command);

        expect(result.mcpSetupUrl).toMatch(/^vscode:mcp\/install\?/);
      });
    });

    describe('when spacesPort is not provided', () => {
      let useCaseWithoutSpacesPort: StartTrialUseCase;

      beforeEach(() => {
        useCaseWithoutSpacesPort = new StartTrialUseCase(
          mockUserService,
          mockOrganizationService,
          mockMcpTokenService,
          mockEventEmitterService,
          stubbedLogger,
        );

        mockOrganizationService.createOrganization.mockResolvedValue(
          mockOrganization,
        );
        mockUserService.createUser.mockResolvedValue(mockUser);
        mockMcpTokenService.generateToken.mockReturnValue({
          accessToken: 'test-token-123',
          tokenType: 'Bearer',
          expiresIn: 2592000,
        });
        mockMcpTokenService.getMcpUrl.mockReturnValue(
          'https://api.packmind.com/mcp',
        );
      });

      it('does not call createSpace', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        await useCaseWithoutSpacesPort.execute(command);

        expect(mockSpacesPort.createSpace).not.toHaveBeenCalled();
      });

      it('returns valid MCP setup URL', async () => {
        const command: StartTrialCommand = { agent: 'vs-code' };

        const result = await useCaseWithoutSpacesPort.execute(command);

        expect(result.mcpSetupUrl).toMatch(/^vscode:mcp\/install\?/);
      });
    });
  });
});
