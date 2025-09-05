import { SignUpUserUseCase } from './signUpUser.usecase';
import { UserService } from '../../services/UserService';
import { OrganizationService } from '../../services/OrganizationService';
import { createOrganizationId } from '../../../domain/entities/Organization';
import { createUserId } from '../../../domain/entities/User';
import { PackmindLogger } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';
import { userFactory, organizationFactory } from '../../../../test';

import { SignUpUserCommand } from '../../../domain/useCases';

describe('SignUpUserUseCase', () => {
  let signUpUserUseCase: SignUpUserUseCase;
  let mockUserService: jest.Mocked<UserService>;
  let mockOrganizationService: jest.Mocked<OrganizationService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    mockUserService = {
      createUser: jest.fn(),
      getUserById: jest.fn(),
      getUserByUsername: jest.fn(),
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

    stubbedLogger = stubLogger();

    signUpUserUseCase = new SignUpUserUseCase(
      mockUserService,
      mockOrganizationService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signUpUser', () => {
    const mockOrganization = organizationFactory({
      id: createOrganizationId('org-123'),
    });

    const mockUser = userFactory({
      id: createUserId('user-123'),
      username: 'testuser',
      passwordHash: 'hashedpassword',
      organizationId: createOrganizationId('org-123'),
    });

    describe('when organization exists', () => {
      it('signs up a user successfully', async () => {
        const command: SignUpUserCommand = {
          username: 'testuser',
          password: 'password123',
          organizationId: createOrganizationId('org-123'),
        };

        mockOrganizationService.getOrganizationById.mockResolvedValue(
          mockOrganization,
        );
        mockUserService.createUser.mockResolvedValue(mockUser);

        const result = await signUpUserUseCase.execute(command);

        expect(result).toEqual(mockUser);
        expect(
          mockOrganizationService.getOrganizationById,
        ).toHaveBeenCalledWith('org-123');
        expect(mockUserService.createUser).toHaveBeenCalledWith(
          'testuser',
          'password123',
          'org-123',
        );
      });
    });

    describe('when organization is not found', () => {
      it('throws error', async () => {
        const command: SignUpUserCommand = {
          username: 'testuser',
          password: 'password123',
          organizationId: createOrganizationId('org-123'),
        };

        mockOrganizationService.getOrganizationById.mockResolvedValue(null);

        await expect(signUpUserUseCase.execute(command)).rejects.toThrow(
          'Organization not found',
        );

        expect(
          mockOrganizationService.getOrganizationById,
        ).toHaveBeenCalledWith('org-123');
        expect(mockUserService.createUser).not.toHaveBeenCalled();
      });

      it('throws error for missing username', async () => {
        const command: SignUpUserCommand = {
          username: '',
          password: 'password123',
          organizationId: createOrganizationId('org-123'),
        };

        mockOrganizationService.getOrganizationById.mockResolvedValue(
          mockOrganization,
        );
        mockUserService.createUser.mockRejectedValue(
          new Error('Username, password, and organizationId are required'),
        );

        await expect(signUpUserUseCase.execute(command)).rejects.toThrow(
          'Username, password, and organizationId are required',
        );

        expect(
          mockOrganizationService.getOrganizationById,
        ).toHaveBeenCalledWith('org-123');
        expect(mockUserService.createUser).toHaveBeenCalledWith(
          '',
          'password123',
          'org-123',
        );
      });

      it('throws error for missing password', async () => {
        const command: SignUpUserCommand = {
          username: 'testuser',
          password: '',
          organizationId: createOrganizationId('org-123'),
        };

        mockOrganizationService.getOrganizationById.mockResolvedValue(
          mockOrganization,
        );
        mockUserService.createUser.mockRejectedValue(
          new Error('Username, password, and organizationId are required'),
        );

        await expect(signUpUserUseCase.execute(command)).rejects.toThrow(
          'Username, password, and organizationId are required',
        );

        expect(
          mockOrganizationService.getOrganizationById,
        ).toHaveBeenCalledWith('org-123');
        expect(mockUserService.createUser).toHaveBeenCalledWith(
          'testuser',
          '',
          'org-123',
        );
      });

      it('throws error for missing organizationId', async () => {
        const command: SignUpUserCommand = {
          username: 'testuser',
          password: 'password123',
          organizationId: createOrganizationId(''),
        };

        mockOrganizationService.getOrganizationById.mockResolvedValue(null);

        await expect(signUpUserUseCase.execute(command)).rejects.toThrow(
          'Organization not found',
        );

        expect(
          mockOrganizationService.getOrganizationById,
        ).toHaveBeenCalledWith('');
        expect(mockUserService.createUser).not.toHaveBeenCalled();
      });

      describe('when username already exists', () => {
        it('throws error', async () => {
          const command: SignUpUserCommand = {
            username: 'testuser',
            password: 'password123',
            organizationId: createOrganizationId('org-123'),
          };

          mockOrganizationService.getOrganizationById.mockResolvedValue(
            mockOrganization,
          );
          mockUserService.createUser.mockRejectedValue(
            new Error("Username 'testuser' already exists"),
          );

          await expect(signUpUserUseCase.execute(command)).rejects.toThrow(
            "Username 'testuser' already exists",
          );

          expect(
            mockOrganizationService.getOrganizationById,
          ).toHaveBeenCalledWith('org-123');
          expect(mockUserService.createUser).toHaveBeenCalledWith(
            'testuser',
            'password123',
            'org-123',
          );
        });
      });

      describe('when userService throws unexpected error', () => {
        it('throws error', async () => {
          const command: SignUpUserCommand = {
            username: 'testuser',
            password: 'password123',
            organizationId: createOrganizationId('org-123'),
          };

          mockOrganizationService.getOrganizationById.mockResolvedValue(
            mockOrganization,
          );
          mockUserService.createUser.mockRejectedValue(
            new Error('Database connection failed'),
          );

          await expect(signUpUserUseCase.execute(command)).rejects.toThrow(
            'Database connection failed',
          );

          expect(
            mockOrganizationService.getOrganizationById,
          ).toHaveBeenCalledWith('org-123');
          expect(mockUserService.createUser).toHaveBeenCalledWith(
            'testuser',
            'password123',
            'org-123',
          );
        });
      });

      describe('when organizationService throws unexpected error', () => {
        it('throws error', async () => {
          const command: SignUpUserCommand = {
            username: 'testuser',
            password: 'password123',
            organizationId: createOrganizationId('org-123'),
          };

          mockOrganizationService.getOrganizationById.mockRejectedValue(
            new Error('Database connection failed'),
          );

          await expect(signUpUserUseCase.execute(command)).rejects.toThrow(
            'Database connection failed',
          );

          expect(
            mockOrganizationService.getOrganizationById,
          ).toHaveBeenCalledWith('org-123');
          expect(mockUserService.createUser).not.toHaveBeenCalled();
        });
      });
    });
  });
});
