import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createUserId,
  SignUpWithOrganizationCommand,
  SignUpWithOrganizationResponse,
  UserSignedUpEvent,
} from '@packmind/types';
import { organizationFactory, userFactory } from '../../../../test';
import { OrganizationService } from '../../services/OrganizationService';
import { UserService } from '../../services/UserService';
import { SignUpWithOrganizationUseCase } from './SignUpWithOrganizationUseCase';

describe('SignUpWithOrganizationUseCase', () => {
  let signUpWithOrganizationUseCase: SignUpWithOrganizationUseCase;
  let mockUserService: jest.Mocked<UserService>;
  let mockOrganizationService: jest.Mocked<OrganizationService>;
  let mockEventEmitterService: jest.Mocked<PackmindEventEmitterService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

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

    stubbedLogger = stubLogger();

    signUpWithOrganizationUseCase = new SignUpWithOrganizationUseCase(
      mockUserService,
      mockOrganizationService,
      mockEventEmitterService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const mockOrganization = organizationFactory({
      id: createOrganizationId('org-123'),
      name: 'Test Organization',
      slug: 'test-organization',
    });

    const userId = createUserId('user-123');
    const mockUser = userFactory({
      id: userId,
      email: 'testuser@packmind.com',
      passwordHash: 'hashedpassword',
      memberships: [
        {
          userId,
          organizationId: createOrganizationId('org-123'),
          role: 'admin',
        },
      ],
    });

    describe('when valid inputs are provided', () => {
      it('creates organization and user successfully', async () => {
        const command: SignUpWithOrganizationCommand = {
          organizationName: 'Test Organization',
          email: 'testuser@packmind.com',
          password: 'password123!@',
        };

        mockOrganizationService.createOrganization.mockResolvedValue(
          mockOrganization,
        );
        mockUserService.createUser.mockResolvedValue(mockUser);

        const result: SignUpWithOrganizationResponse =
          await signUpWithOrganizationUseCase.execute(command);

        expect(result).toEqual({
          user: mockUser,
          organization: mockOrganization,
        });
        expect(mockOrganizationService.createOrganization).toHaveBeenCalledWith(
          'Test Organization',
        );
        expect(mockUserService.createUser).toHaveBeenCalledWith(
          'testuser@packmind.com',
          'password123!@',
          createOrganizationId('org-123'),
        );
      });

      it('trims organization name before creating organization', async () => {
        const command: SignUpWithOrganizationCommand = {
          organizationName: '  Test Organization  ',
          email: 'testuser@packmind.com',
          password: 'password123!@',
        };

        mockOrganizationService.createOrganization.mockResolvedValue(
          mockOrganization,
        );
        mockUserService.createUser.mockResolvedValue(mockUser);

        await signUpWithOrganizationUseCase.execute(command);

        expect(mockOrganizationService.createOrganization).toHaveBeenCalledWith(
          'Test Organization',
        );
      });

      it('emits UserSignedUpEvent after successful signup', async () => {
        const command: SignUpWithOrganizationCommand = {
          organizationName: 'Test Organization',
          email: 'testuser@packmind.com',
          password: 'password123!@',
        };

        mockOrganizationService.createOrganization.mockResolvedValue(
          mockOrganization,
        );
        mockUserService.createUser.mockResolvedValue(mockUser);

        await signUpWithOrganizationUseCase.execute(command);

        expect(mockEventEmitterService.emit).toHaveBeenCalledWith(
          expect.any(UserSignedUpEvent),
        );
        expect(mockEventEmitterService.emit).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: {
              userId: mockUser.id,
              organizationId: mockOrganization.id,
              email: 'testuser@packmind.com',
              source: 'ui',
              quickStart: false,
            },
          }),
        );
      });
    });

    describe('when organization name validation fails', () => {
      it('throws error for empty organization name', async () => {
        const command: SignUpWithOrganizationCommand = {
          organizationName: '',
          email: 'testuser@packmind.com',
          password: 'password123!@',
        };

        await expect(
          signUpWithOrganizationUseCase.execute(command),
        ).rejects.toThrow('Organization name is required');

        expect(
          mockOrganizationService.createOrganization,
        ).not.toHaveBeenCalled();
        expect(mockUserService.createUser).not.toHaveBeenCalled();
      });

      it('throws error for whitespace-only organization name', async () => {
        const command: SignUpWithOrganizationCommand = {
          organizationName: '   ',
          email: 'testuser@packmind.com',
          password: 'password123!@',
        };

        await expect(
          signUpWithOrganizationUseCase.execute(command),
        ).rejects.toThrow('Organization name is required');

        expect(
          mockOrganizationService.createOrganization,
        ).not.toHaveBeenCalled();
        expect(mockUserService.createUser).not.toHaveBeenCalled();
      });
    });

    describe('when password validation fails', () => {
      it('throws error for empty password', async () => {
        const command: SignUpWithOrganizationCommand = {
          organizationName: 'Test Organization',
          email: 'testuser@packmind.com',
          password: '',
        };

        await expect(
          signUpWithOrganizationUseCase.execute(command),
        ).rejects.toThrow('Password is required');

        expect(
          mockOrganizationService.createOrganization,
        ).not.toHaveBeenCalled();
        expect(mockUserService.createUser).not.toHaveBeenCalled();
      });

      it('throws error for short password', async () => {
        const command: SignUpWithOrganizationCommand = {
          organizationName: 'Test Organization',
          email: 'testuser@packmind.com',
          password: 'short',
        };

        await expect(
          signUpWithOrganizationUseCase.execute(command),
        ).rejects.toThrow('Password must be at least 8 characters');

        expect(
          mockOrganizationService.createOrganization,
        ).not.toHaveBeenCalled();
        expect(mockUserService.createUser).not.toHaveBeenCalled();
      });

      it('throws error for password without enough non-alphanumerical characters', async () => {
        const command: SignUpWithOrganizationCommand = {
          organizationName: 'Test Organization',
          email: 'testuser@packmind.com',
          password: 'password123',
        };

        await expect(
          signUpWithOrganizationUseCase.execute(command),
        ).rejects.toThrow(
          'Password must contain at least 2 non-alphanumerical characters',
        );

        expect(
          mockOrganizationService.createOrganization,
        ).not.toHaveBeenCalled();
        expect(mockUserService.createUser).not.toHaveBeenCalled();
      });
    });

    describe('when organization creation fails', () => {
      it('throws error and does not create user', async () => {
        const command: SignUpWithOrganizationCommand = {
          organizationName: 'Test Organization',
          email: 'testuser@packmind.com',
          password: 'password123!@',
        };

        mockOrganizationService.createOrganization.mockRejectedValue(
          new Error('Organization name already exists'),
        );

        await expect(
          signUpWithOrganizationUseCase.execute(command),
        ).rejects.toThrow('Organization name already exists');

        expect(mockOrganizationService.createOrganization).toHaveBeenCalledWith(
          'Test Organization',
        );
        expect(mockUserService.createUser).not.toHaveBeenCalled();
      });

      it('does not emit UserSignedUpEvent', async () => {
        const command: SignUpWithOrganizationCommand = {
          organizationName: 'Test Organization',
          email: 'testuser@packmind.com',
          password: 'password123!@',
        };

        mockOrganizationService.createOrganization.mockRejectedValue(
          new Error('Organization name already exists'),
        );

        await expect(
          signUpWithOrganizationUseCase.execute(command),
        ).rejects.toThrow();

        expect(mockEventEmitterService.emit).not.toHaveBeenCalled();
      });
    });

    describe('when user creation fails after organization creation', () => {
      it('throws error but organization remains created', async () => {
        const command: SignUpWithOrganizationCommand = {
          organizationName: 'Test Organization',
          email: 'testuser@packmind.com',
          password: 'password123!@',
        };

        mockOrganizationService.createOrganization.mockResolvedValue(
          mockOrganization,
        );
        mockUserService.createUser.mockRejectedValue(
          new Error("Email 'testuser@packmind.com' already exists"),
        );

        await expect(
          signUpWithOrganizationUseCase.execute(command),
        ).rejects.toThrow("Email 'testuser@packmind.com' already exists");

        expect(mockOrganizationService.createOrganization).toHaveBeenCalledWith(
          'Test Organization',
        );
        expect(mockUserService.createUser).toHaveBeenCalledWith(
          'testuser@packmind.com',
          'password123!@',
          createOrganizationId('org-123'),
        );
      });
    });

    describe('when organizationService throws unexpected error', () => {
      it('throws error', async () => {
        const command: SignUpWithOrganizationCommand = {
          organizationName: 'Test Organization',
          email: 'testuser@packmind.com',
          password: 'password123!@',
        };

        mockOrganizationService.createOrganization.mockRejectedValue(
          new Error('Database connection failed'),
        );

        await expect(
          signUpWithOrganizationUseCase.execute(command),
        ).rejects.toThrow('Database connection failed');

        expect(mockOrganizationService.createOrganization).toHaveBeenCalledWith(
          'Test Organization',
        );
        expect(mockUserService.createUser).not.toHaveBeenCalled();
      });
    });

    describe('when userService throws unexpected error', () => {
      it('throws error', async () => {
        const command: SignUpWithOrganizationCommand = {
          organizationName: 'Test Organization',
          email: 'testuser@packmind.com',
          password: 'password123!@',
        };

        mockOrganizationService.createOrganization.mockResolvedValue(
          mockOrganization,
        );
        mockUserService.createUser.mockRejectedValue(
          new Error('Database connection failed'),
        );

        await expect(
          signUpWithOrganizationUseCase.execute(command),
        ).rejects.toThrow('Database connection failed');

        expect(mockOrganizationService.createOrganization).toHaveBeenCalledWith(
          'Test Organization',
        );
        expect(mockUserService.createUser).toHaveBeenCalledWith(
          'testuser@packmind.com',
          'password123!@',
          createOrganizationId('org-123'),
        );
      });
    });
  });
});
