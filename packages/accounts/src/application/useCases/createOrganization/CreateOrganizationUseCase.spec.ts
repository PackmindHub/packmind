import { CreateOrganizationUseCase } from './CreateOrganizationUseCase';
import { OrganizationService } from '../../services/OrganizationService';
import { UserService } from '../../services/UserService';
import {
  mockInterface,
  stubLogger,
  createMockInstance,
} from '@packmind/test-utils';
import { PackmindLogger } from '@packmind/logger';
import {
  PackmindEventEmitterService,
  UserNotFoundError,
} from '@packmind/node-utils';
import {
  createUserId,
  UserId,
  Organization,
  createOrganizationId,
  User,
  ISpacesPort,
  UserSpaceRole,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { userFactory } from '../../../../test';
import {
  InvalidOrganizationNameError,
  UserIdRequiredError,
} from '../../../domain/errors';

describe('CreateOrganizationUseCase', () => {
  let createOrganizationUseCase: CreateOrganizationUseCase;
  let mockOrganizationService: jest.Mocked<OrganizationService>;
  let mockUserService: jest.Mocked<UserService>;
  let mockEventEmitterService: jest.Mocked<PackmindEventEmitterService>;
  let mockSpacesPort: jest.Mocked<ISpacesPort>;
  let stubbedLogger: PackmindLogger;

  beforeEach(() => {
    mockOrganizationService = createMockInstance(OrganizationService);

    mockUserService = createMockInstance(UserService);

    mockEventEmitterService = createMockInstance(PackmindEventEmitterService);
    mockEventEmitterService.emit.mockReturnValue(true);

    mockSpacesPort = mockInterface<ISpacesPort>();

    stubbedLogger = stubLogger();

    createOrganizationUseCase = new CreateOrganizationUseCase(
      mockOrganizationService,
      mockUserService,
      mockEventEmitterService,
      mockSpacesPort,
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
        mockUser = userFactory({
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hash',
          memberships: [],
        });
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

        it('creates default space for organization', async () => {
          await createOrganizationUseCase.execute(validCommand);

          expect(mockSpacesPort.createDefaultSpace).toHaveBeenCalledWith(
            mockOrganization.id,
          );
        });

        it('adds user as admin to default space', async () => {
          await createOrganizationUseCase.execute(validCommand);

          expect(mockSpacesPort.addMemberToDefaultSpace).toHaveBeenCalledWith(
            userId,
            mockOrganization.id,
            UserSpaceRole.ADMIN,
            userId,
          );
        });

        describe('when space creation fails', () => {
          beforeEach(() => {
            mockSpacesPort.createDefaultSpace.mockRejectedValue(
              new Error('Space creation failed'),
            );
          });

          it('does not attempt to add space membership', async () => {
            await createOrganizationUseCase.execute(validCommand);

            expect(
              mockSpacesPort.addMemberToDefaultSpace,
            ).not.toHaveBeenCalled();
          });

          it('still returns created organization', async () => {
            const result =
              await createOrganizationUseCase.execute(validCommand);

            expect(result).toEqual({ organization: mockOrganization });
          });
        });

        describe('when space membership creation fails', () => {
          beforeEach(() => {
            mockSpacesPort.addMemberToDefaultSpace.mockRejectedValue(
              new Error('Membership creation failed'),
            );
          });

          it('still returns created organization', async () => {
            const result =
              await createOrganizationUseCase.execute(validCommand);

            expect(result).toEqual({ organization: mockOrganization });
          });
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

        it('throws UserNotFoundError', async () => {
          mockUserService.getUserById.mockResolvedValue(null);

          await expect(
            createOrganizationUseCase.execute(validCommand),
          ).rejects.toBeInstanceOf(UserNotFoundError);
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
        mockUser = userFactory({
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hash',
          memberships: [],
        });

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

      it('throws UserIdRequiredError', async () => {
        await expect(
          createOrganizationUseCase.execute(invalidCommand),
        ).rejects.toBeInstanceOf(UserIdRequiredError);
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

      it('throws InvalidOrganizationNameError', async () => {
        await expect(
          createOrganizationUseCase.execute(invalidCommand),
        ).rejects.toBeInstanceOf(InvalidOrganizationNameError);
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

      it('throws InvalidOrganizationNameError', async () => {
        await expect(
          createOrganizationUseCase.execute(invalidCommand),
        ).rejects.toBeInstanceOf(InvalidOrganizationNameError);
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

      it('throws InvalidOrganizationNameError', async () => {
        await expect(
          createOrganizationUseCase.execute(invalidCommand),
        ).rejects.toBeInstanceOf(InvalidOrganizationNameError);
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

      it('throws InvalidOrganizationNameError', async () => {
        await expect(
          createOrganizationUseCase.execute(invalidCommand),
        ).rejects.toBeInstanceOf(InvalidOrganizationNameError);
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
        mockUser = userFactory({
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hash',
          memberships: [],
        });

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
        const mockUser: User = userFactory({
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hash',
          memberships: [],
        });

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
        mockUser = userFactory({
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hash',
          memberships: [],
        });
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
