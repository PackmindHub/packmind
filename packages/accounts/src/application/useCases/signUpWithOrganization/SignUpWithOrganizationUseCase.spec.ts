import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createUserId,
  SignUpWithOrganizationCommand,
  SignUpWithOrganizationResponse,
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
      getOrganizationByName: jest.fn().mockResolvedValue(null),
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
      const command: SignUpWithOrganizationCommand = {
        email: 'testuser@packmind.com',
        password: 'password123!@',
      };

      beforeEach(() => {
        mockOrganizationService.createOrganization.mockResolvedValue(
          mockOrganization,
        );
        mockUserService.createUser.mockResolvedValue(mockUser);
      });

      it('returns created user and organization', async () => {
        const result: SignUpWithOrganizationResponse =
          await signUpWithOrganizationUseCase.execute(command);

        expect(result).toEqual({
          user: mockUser,
          organization: mockOrganization,
        });
      });

      it('generates organization name from email local part', async () => {
        await signUpWithOrganizationUseCase.execute(command);

        expect(mockOrganizationService.createOrganization).toHaveBeenCalledWith(
          "testuser's organization",
        );
      });

      it('calls user service with email, password and organization id', async () => {
        await signUpWithOrganizationUseCase.execute(command);

        expect(mockUserService.createUser).toHaveBeenCalledWith(
          'testuser@packmind.com',
          'password123!@',
          createOrganizationId('org-123'),
        );
      });

      it('emits UserSignedUpEvent with correct payload after successful signup', async () => {
        await signUpWithOrganizationUseCase.execute(command);

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

      it('emits OrganizationCreatedEvent after successful signup', async () => {
        await signUpWithOrganizationUseCase.execute(command);

        expect(mockEventEmitterService.emit).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: {
              userId: mockUser.id,
              organizationId: mockOrganization.id,
              name: "testuser's organization",
              method: 'sign-up',
              source: 'ui',
            },
          }),
        );
      });
    });

    describe('when organization name already exists', () => {
      const command: SignUpWithOrganizationCommand = {
        email: 'john@example.com',
        password: 'password123!@',
      };

      beforeEach(() => {
        mockOrganizationService.createOrganization.mockResolvedValue(
          mockOrganization,
        );
        mockUserService.createUser.mockResolvedValue(mockUser);
      });

      describe('when base name exists', () => {
        beforeEach(() => {
          mockOrganizationService.getOrganizationByName
            .mockResolvedValueOnce(mockOrganization)
            .mockResolvedValueOnce(null);
        });

        it('adds suffix 2 to organization name', async () => {
          await signUpWithOrganizationUseCase.execute(command);

          expect(
            mockOrganizationService.createOrganization,
          ).toHaveBeenCalledWith("john's organization 2");
        });
      });

      describe('when base name and suffix 2 exist', () => {
        beforeEach(() => {
          mockOrganizationService.getOrganizationByName
            .mockResolvedValueOnce(mockOrganization)
            .mockResolvedValueOnce(mockOrganization)
            .mockResolvedValueOnce(null);
        });

        it('adds suffix 3 to organization name', async () => {
          await signUpWithOrganizationUseCase.execute(command);

          expect(
            mockOrganizationService.createOrganization,
          ).toHaveBeenCalledWith("john's organization 3");
        });

        it('checks base organization name first', async () => {
          await signUpWithOrganizationUseCase.execute(command);

          expect(
            mockOrganizationService.getOrganizationByName,
          ).toHaveBeenNthCalledWith(1, "john's organization");
        });

        it('checks organization name with suffix 2 second', async () => {
          await signUpWithOrganizationUseCase.execute(command);

          expect(
            mockOrganizationService.getOrganizationByName,
          ).toHaveBeenNthCalledWith(2, "john's organization 2");
        });

        it('checks organization name with suffix 3 third', async () => {
          await signUpWithOrganizationUseCase.execute(command);

          expect(
            mockOrganizationService.getOrganizationByName,
          ).toHaveBeenNthCalledWith(3, "john's organization 3");
        });
      });
    });

    describe('when email has firstName.lastName format', () => {
      const command: SignUpWithOrganizationCommand = {
        email: 'firstName.lastName@example.com',
        password: 'password123!@',
      };

      beforeEach(() => {
        mockOrganizationService.createOrganization.mockResolvedValue(
          mockOrganization,
        );
        mockUserService.createUser.mockResolvedValue(mockUser);
      });

      it('generates organization name from full local part', async () => {
        await signUpWithOrganizationUseCase.execute(command);

        expect(mockOrganizationService.createOrganization).toHaveBeenCalledWith(
          "firstName.lastName's organization",
        );
      });
    });

    describe('when password validation fails', () => {
      describe('with empty password', () => {
        const command: SignUpWithOrganizationCommand = {
          email: 'testuser@packmind.com',
          password: '',
        };

        it('throws password required error', async () => {
          await expect(
            signUpWithOrganizationUseCase.execute(command),
          ).rejects.toThrow('Password is required');
        });

        it('does not call organization service', async () => {
          try {
            await signUpWithOrganizationUseCase.execute(command);
          } catch {
            // Expected to throw
          }

          expect(
            mockOrganizationService.createOrganization,
          ).not.toHaveBeenCalled();
        });

        it('does not call user service', async () => {
          try {
            await signUpWithOrganizationUseCase.execute(command);
          } catch {
            // Expected to throw
          }

          expect(mockUserService.createUser).not.toHaveBeenCalled();
        });
      });

      describe('with short password', () => {
        const command: SignUpWithOrganizationCommand = {
          email: 'testuser@packmind.com',
          password: 'short',
        };

        it('throws password minimum length error', async () => {
          await expect(
            signUpWithOrganizationUseCase.execute(command),
          ).rejects.toThrow('Password must be at least 8 characters');
        });

        it('does not call organization service', async () => {
          try {
            await signUpWithOrganizationUseCase.execute(command);
          } catch {
            // Expected to throw
          }

          expect(
            mockOrganizationService.createOrganization,
          ).not.toHaveBeenCalled();
        });

        it('does not call user service', async () => {
          try {
            await signUpWithOrganizationUseCase.execute(command);
          } catch {
            // Expected to throw
          }

          expect(mockUserService.createUser).not.toHaveBeenCalled();
        });
      });

      describe('with password without enough non-alphanumerical characters', () => {
        const command: SignUpWithOrganizationCommand = {
          email: 'testuser@packmind.com',
          password: 'password123',
        };

        it('throws non-alphanumerical characters error', async () => {
          await expect(
            signUpWithOrganizationUseCase.execute(command),
          ).rejects.toThrow(
            'Password must contain at least 2 non-alphanumerical characters',
          );
        });

        it('does not call organization service', async () => {
          try {
            await signUpWithOrganizationUseCase.execute(command);
          } catch {
            // Expected to throw
          }

          expect(
            mockOrganizationService.createOrganization,
          ).not.toHaveBeenCalled();
        });

        it('does not call user service', async () => {
          try {
            await signUpWithOrganizationUseCase.execute(command);
          } catch {
            // Expected to throw
          }

          expect(mockUserService.createUser).not.toHaveBeenCalled();
        });
      });
    });

    describe('when organization creation fails', () => {
      const command: SignUpWithOrganizationCommand = {
        email: 'testuser@packmind.com',
        password: 'password123!@',
      };

      beforeEach(() => {
        mockOrganizationService.createOrganization.mockRejectedValue(
          new Error('Organization slug conflict'),
        );
      });

      it('throws organization creation error', async () => {
        await expect(
          signUpWithOrganizationUseCase.execute(command),
        ).rejects.toThrow('Organization slug conflict');
      });

      it('calls organization service with generated organization name', async () => {
        try {
          await signUpWithOrganizationUseCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(mockOrganizationService.createOrganization).toHaveBeenCalledWith(
          "testuser's organization",
        );
      });

      it('does not call user service', async () => {
        try {
          await signUpWithOrganizationUseCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(mockUserService.createUser).not.toHaveBeenCalled();
      });

      it('does not emit UserSignedUpEvent', async () => {
        try {
          await signUpWithOrganizationUseCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(mockEventEmitterService.emit).not.toHaveBeenCalled();
      });
    });

    describe('when user creation fails after organization creation', () => {
      const command: SignUpWithOrganizationCommand = {
        email: 'testuser@packmind.com',
        password: 'password123!@',
      };

      beforeEach(() => {
        mockOrganizationService.createOrganization.mockResolvedValue(
          mockOrganization,
        );
        mockUserService.createUser.mockRejectedValue(
          new Error("Email 'testuser@packmind.com' already exists"),
        );
      });

      it('throws email already exists error', async () => {
        await expect(
          signUpWithOrganizationUseCase.execute(command),
        ).rejects.toThrow("Email 'testuser@packmind.com' already exists");
      });

      it('calls organization service with generated organization name', async () => {
        try {
          await signUpWithOrganizationUseCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(mockOrganizationService.createOrganization).toHaveBeenCalledWith(
          "testuser's organization",
        );
      });

      it('calls user service with email, password and organization id', async () => {
        try {
          await signUpWithOrganizationUseCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(mockUserService.createUser).toHaveBeenCalledWith(
          'testuser@packmind.com',
          'password123!@',
          createOrganizationId('org-123'),
        );
      });
    });

    describe('when organizationService throws unexpected error', () => {
      const command: SignUpWithOrganizationCommand = {
        email: 'testuser@packmind.com',
        password: 'password123!@',
      };

      beforeEach(() => {
        mockOrganizationService.createOrganization.mockRejectedValue(
          new Error('Database connection failed'),
        );
      });

      it('throws database connection error', async () => {
        await expect(
          signUpWithOrganizationUseCase.execute(command),
        ).rejects.toThrow('Database connection failed');
      });

      it('calls organization service with generated organization name', async () => {
        try {
          await signUpWithOrganizationUseCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(mockOrganizationService.createOrganization).toHaveBeenCalledWith(
          "testuser's organization",
        );
      });

      it('does not call user service', async () => {
        try {
          await signUpWithOrganizationUseCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(mockUserService.createUser).not.toHaveBeenCalled();
      });
    });

    describe('when userService throws unexpected error', () => {
      const command: SignUpWithOrganizationCommand = {
        email: 'testuser@packmind.com',
        password: 'password123!@',
      };

      beforeEach(() => {
        mockOrganizationService.createOrganization.mockResolvedValue(
          mockOrganization,
        );
        mockUserService.createUser.mockRejectedValue(
          new Error('Database connection failed'),
        );
      });

      it('throws database connection error', async () => {
        await expect(
          signUpWithOrganizationUseCase.execute(command),
        ).rejects.toThrow('Database connection failed');
      });

      it('calls organization service with generated organization name', async () => {
        try {
          await signUpWithOrganizationUseCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(mockOrganizationService.createOrganization).toHaveBeenCalledWith(
          "testuser's organization",
        );
      });

      it('calls user service with email, password and organization id', async () => {
        try {
          await signUpWithOrganizationUseCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(mockUserService.createUser).toHaveBeenCalledWith(
          'testuser@packmind.com',
          'password123!@',
          createOrganizationId('org-123'),
        );
      });
    });
  });
});
