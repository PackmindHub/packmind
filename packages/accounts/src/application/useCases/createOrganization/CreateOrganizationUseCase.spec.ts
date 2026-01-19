import { CreateOrganizationUseCase } from './CreateOrganizationUseCase';
import { OrganizationService } from '../../services/OrganizationService';
import { UserService } from '../../services/UserService';
import { stubLogger } from '@packmind/test-utils';
import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  createUserId,
  UserId,
  Organization,
  createOrganizationId,
  User,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

describe('CreateOrganizationUseCase', () => {
  let createOrganizationUseCase: CreateOrganizationUseCase;
  let mockOrganizationService: jest.Mocked<OrganizationService>;
  let mockUserService: jest.Mocked<UserService>;
  let mockEventEmitterService: jest.Mocked<PackmindEventEmitterService>;
  let stubbedLogger: PackmindLogger;

  beforeEach(() => {
    mockOrganizationService = {
      createOrganization: jest.fn(),
    } as unknown as jest.Mocked<OrganizationService>;

    mockUserService = {
      getUserById: jest.fn(),
      addOrganizationMembership: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    mockEventEmitterService = {
      emit: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    stubbedLogger = stubLogger();

    createOrganizationUseCase = new CreateOrganizationUseCase(
      mockOrganizationService,
      mockUserService,
      mockEventEmitterService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const userId: UserId = createUserId(uuidv4());
    const validCommand = {
      userId,
      name: 'Test Organization',
    };

    const mockOrganization: Organization = {
      id: createOrganizationId('org-123'),
      name: 'Test Organization',
      slug: 'test-organization',
    };

    describe('with valid organization name', () => {
      let mockUser: User;

      beforeEach(() => {
        mockUser = {
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hash',
          active: true,
          memberships: [],
        };
      });

      describe('when user exists', () => {
        beforeEach(() => {
          mockUserService.getUserById.mockResolvedValue(mockUser);
          mockOrganizationService.createOrganization.mockResolvedValue(
            mockOrganization,
          );
          mockUserService.addOrganizationMembership.mockResolvedValue(mockUser);
        });

        it('emits OrganizationCreatedEvent after successful creation', async () => {
          await createOrganizationUseCase.execute(validCommand);

          expect(mockEventEmitterService.emit).toHaveBeenCalledWith(
            expect.objectContaining({
              payload: {
                userId,
                organizationId: mockOrganization.id,
                name: 'Test Organization',
                method: 'create',
                source: 'ui',
              },
            }),
          );
        });

        it('returns created organization', async () => {
          const result = await createOrganizationUseCase.execute(validCommand);

          expect(result).toEqual({ organization: mockOrganization });
        });

        it('fetches user by id', async () => {
          await createOrganizationUseCase.execute(validCommand);

          expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
        });

        it('creates organization with trimmed name', async () => {
          await createOrganizationUseCase.execute(validCommand);

          expect(
            mockOrganizationService.createOrganization,
          ).toHaveBeenCalledWith('Test Organization');
        });

        it('adds user as admin to created organization', async () => {
          await createOrganizationUseCase.execute(validCommand);

          expect(
            mockUserService.addOrganizationMembership,
          ).toHaveBeenCalledWith(mockUser, mockOrganization.id, 'admin');
        });
      });

      describe('when user not found', () => {
        beforeEach(async () => {
          mockUserService.getUserById.mockResolvedValue(null);

          try {
            await createOrganizationUseCase.execute(validCommand);
          } catch {
            // Expected to throw
          }
        });

        it('throws user not found error', async () => {
          mockUserService.getUserById.mockResolvedValue(null);

          await expect(
            createOrganizationUseCase.execute(validCommand),
          ).rejects.toThrow('User not found');
        });

        it('fetches user by id', () => {
          expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
        });

        it('does not create organization', () => {
          expect(
            mockOrganizationService.createOrganization,
          ).not.toHaveBeenCalled();
        });

        it('does not add organization membership', () => {
          expect(
            mockUserService.addOrganizationMembership,
          ).not.toHaveBeenCalled();
        });
      });

      it('does not emit event if user not found', async () => {
        mockUserService.getUserById.mockResolvedValue(null);

        try {
          await createOrganizationUseCase.execute(validCommand);
        } catch {
          // Expected to throw
        }

        expect(mockEventEmitterService.emit).not.toHaveBeenCalled();
      });
    });

    describe('with organization name having whitespace', () => {
      let mockUser: User;

      beforeEach(() => {
        mockUser = {
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hash',
          active: true,
          memberships: [],
        };

        mockUserService.getUserById.mockResolvedValue(mockUser);
        mockOrganizationService.createOrganization.mockResolvedValue(
          mockOrganization,
        );
        mockUserService.addOrganizationMembership.mockResolvedValue(mockUser);
      });

      it('returns created organization', async () => {
        const commandWithWhitespace = {
          userId,
          name: '  Test Organization  ',
        };

        const result = await createOrganizationUseCase.execute(
          commandWithWhitespace,
        );

        expect(result).toEqual({ organization: mockOrganization });
      });

      it('trims whitespace before creating organization', async () => {
        const commandWithWhitespace = {
          userId,
          name: '  Test Organization  ',
        };

        await createOrganizationUseCase.execute(commandWithWhitespace);

        expect(mockOrganizationService.createOrganization).toHaveBeenCalledWith(
          'Test Organization',
        );
      });
    });

    describe('with missing userId', () => {
      const invalidCommand = {
        userId: null as unknown as UserId,
        name: 'Test Organization',
      };

      beforeEach(async () => {
        try {
          await createOrganizationUseCase.execute(invalidCommand);
        } catch {
          // Expected to throw
        }
      });

      it('throws validation error', async () => {
        await expect(
          createOrganizationUseCase.execute(invalidCommand),
        ).rejects.toThrow('User ID is required');
      });

      it('does not fetch user', () => {
        expect(mockUserService.getUserById).not.toHaveBeenCalled();
      });

      it('does not create organization', () => {
        expect(
          mockOrganizationService.createOrganization,
        ).not.toHaveBeenCalled();
      });
    });

    describe('with empty organization name', () => {
      const invalidCommand = {
        userId,
        name: '',
      };

      beforeEach(async () => {
        try {
          await createOrganizationUseCase.execute(invalidCommand);
        } catch {
          // Expected to throw
        }
      });

      it('throws validation error', async () => {
        await expect(
          createOrganizationUseCase.execute(invalidCommand),
        ).rejects.toThrow('Organization name is required');
      });

      it('does not create organization', () => {
        expect(
          mockOrganizationService.createOrganization,
        ).not.toHaveBeenCalled();
      });
    });

    describe('with whitespace-only organization name', () => {
      const invalidCommand = {
        userId,
        name: '   ',
      };

      beforeEach(async () => {
        try {
          await createOrganizationUseCase.execute(invalidCommand);
        } catch {
          // Expected to throw
        }
      });

      it('throws validation error', async () => {
        await expect(
          createOrganizationUseCase.execute(invalidCommand),
        ).rejects.toThrow('Organization name is required');
      });

      it('does not create organization', () => {
        expect(
          mockOrganizationService.createOrganization,
        ).not.toHaveBeenCalled();
      });
    });

    describe('with null organization name', () => {
      const invalidCommand = {
        userId,
        name: null as unknown as string,
      };

      beforeEach(async () => {
        try {
          await createOrganizationUseCase.execute(invalidCommand);
        } catch {
          // Expected to throw
        }
      });

      it('throws validation error', async () => {
        await expect(
          createOrganizationUseCase.execute(invalidCommand),
        ).rejects.toThrow('Organization name is required');
      });

      it('does not create organization', () => {
        expect(
          mockOrganizationService.createOrganization,
        ).not.toHaveBeenCalled();
      });
    });

    describe('with undefined organization name', () => {
      const invalidCommand = {
        userId,
        name: undefined as unknown as string,
      };

      beforeEach(async () => {
        try {
          await createOrganizationUseCase.execute(invalidCommand);
        } catch {
          // Expected to throw
        }
      });

      it('throws validation error', async () => {
        await expect(
          createOrganizationUseCase.execute(invalidCommand),
        ).rejects.toThrow('Organization name is required');
      });

      it('does not create organization', () => {
        expect(
          mockOrganizationService.createOrganization,
        ).not.toHaveBeenCalled();
      });
    });

    describe('with service error', () => {
      let mockUser: User;

      beforeEach(async () => {
        mockUser = {
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hash',
          active: true,
          memberships: [],
        };

        mockUserService.getUserById.mockResolvedValue(mockUser);
        const serviceError = new Error('Organization already exists');
        mockOrganizationService.createOrganization.mockRejectedValue(
          serviceError,
        );

        try {
          await createOrganizationUseCase.execute(validCommand);
        } catch {
          // Expected to throw
        }
      });

      it('rethrows error', async () => {
        await expect(
          createOrganizationUseCase.execute(validCommand),
        ).rejects.toThrow('Organization already exists');
      });

      it('fetches user by id', () => {
        expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
      });

      it('attempts to create organization', () => {
        expect(mockOrganizationService.createOrganization).toHaveBeenCalledWith(
          'Test Organization',
        );
      });

      it('does not add organization membership', () => {
        expect(
          mockUserService.addOrganizationMembership,
        ).not.toHaveBeenCalled();
      });
    });

    describe('with non-Error exception', () => {
      beforeEach(() => {
        const mockUser: User = {
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hash',
          active: true,
          memberships: [],
        };

        mockUserService.getUserById.mockResolvedValue(mockUser);
        const serviceError = 'Database connection failed';
        mockOrganizationService.createOrganization.mockRejectedValue(
          serviceError,
        );
      });

      it('rethrows exception', async () => {
        await expect(
          createOrganizationUseCase.execute(validCommand),
        ).rejects.toBe('Database connection failed');
      });
    });

    describe('with minimal valid organization name', () => {
      let mockUser: User;
      let minimalOrganization: Organization;

      beforeEach(() => {
        mockUser = {
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hash',
          active: true,
          memberships: [],
        };
        minimalOrganization = {
          ...mockOrganization,
          name: 'A',
          slug: 'a',
        };

        mockUserService.getUserById.mockResolvedValue(mockUser);
        mockOrganizationService.createOrganization.mockResolvedValue(
          minimalOrganization,
        );
        mockUserService.addOrganizationMembership.mockResolvedValue(mockUser);
      });

      it('returns created organization', async () => {
        const minimalCommand = {
          userId,
          name: 'A',
        };

        const result = await createOrganizationUseCase.execute(minimalCommand);

        expect(result).toEqual({ organization: minimalOrganization });
      });

      it('creates organization with minimal name', async () => {
        const minimalCommand = {
          userId,
          name: 'A',
        };

        await createOrganizationUseCase.execute(minimalCommand);

        expect(mockOrganizationService.createOrganization).toHaveBeenCalledWith(
          'A',
        );
      });
    });
  });
});
