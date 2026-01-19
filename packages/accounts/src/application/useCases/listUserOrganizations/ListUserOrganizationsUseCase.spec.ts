import { ListUserOrganizationsUseCase } from './ListUserOrganizationsUseCase';
import { UserService } from '../../services/UserService';
import { createUserId } from '@packmind/types';
import { createOrganizationId } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { userFactory, organizationFactory } from '../../../../test';
import { ListUserOrganizationsCommand } from '@packmind/types';

describe('ListUserOrganizationsUseCase', () => {
  let listUserOrganizationsUseCase: ListUserOrganizationsUseCase;
  let mockUserService: jest.Mocked<UserService>;
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

    stubbedLogger = stubLogger();

    listUserOrganizationsUseCase = new ListUserOrganizationsUseCase(
      mockUserService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when user exists with organizations', () => {
      const org1 = organizationFactory({
        id: createOrganizationId('org-1'),
        name: 'Organization 1',
        slug: 'organization-1',
      });
      const org2 = organizationFactory({
        id: createOrganizationId('org-2'),
        name: 'Organization 2',
        slug: 'organization-2',
      });
      const command: ListUserOrganizationsCommand = {
        userId: createUserId('user-123'),
      };

      beforeEach(() => {
        const mockUser = userFactory({
          id: createUserId('user-123'),
          email: 'testuser@packmind.com',
          memberships: [
            {
              userId: createUserId('user-123'),
              organizationId: org1.id,
              role: 'admin',
              organization: org1,
            },
            {
              userId: createUserId('user-123'),
              organizationId: org2.id,
              role: 'member',
              organization: org2,
            },
          ],
        });
        mockUserService.getUserById.mockResolvedValue(mockUser);
      });

      it('returns organizations from user memberships', async () => {
        const result = await listUserOrganizationsUseCase.execute(command);

        expect(result).toEqual({ organizations: [org1, org2] });
      });

      it('calls getUserById with the user id', async () => {
        await listUserOrganizationsUseCase.execute(command);

        expect(mockUserService.getUserById).toHaveBeenCalledWith(
          command.userId,
        );
      });
    });

    describe('when user exists with no organizations', () => {
      const command: ListUserOrganizationsCommand = {
        userId: createUserId('user-123'),
      };

      beforeEach(() => {
        const mockUser = userFactory({
          id: createUserId('user-123'),
          email: 'testuser@packmind.com',
          memberships: [],
        });
        mockUserService.getUserById.mockResolvedValue(mockUser);
      });

      it('returns empty organizations array', async () => {
        const result = await listUserOrganizationsUseCase.execute(command);

        expect(result).toEqual({ organizations: [] });
      });

      it('calls getUserById with the user id', async () => {
        await listUserOrganizationsUseCase.execute(command);

        expect(mockUserService.getUserById).toHaveBeenCalledWith(
          command.userId,
        );
      });
    });

    describe('when user exists with memberships without organization data', () => {
      const org1 = organizationFactory({
        id: createOrganizationId('org-1'),
        name: 'Organization 1',
        slug: 'organization-1',
      });
      const command: ListUserOrganizationsCommand = {
        userId: createUserId('user-123'),
      };

      beforeEach(() => {
        const mockUser = userFactory({
          id: createUserId('user-123'),
          email: 'testuser@packmind.com',
          memberships: [
            {
              userId: createUserId('user-123'),
              organizationId: org1.id,
              role: 'admin',
              organization: org1,
            },
            {
              userId: createUserId('user-123'),
              organizationId: createOrganizationId('org-2'),
              role: 'member',
              // No organization data
            },
          ],
        });
        mockUserService.getUserById.mockResolvedValue(mockUser);
      });

      it('filters out memberships without organization', async () => {
        const result = await listUserOrganizationsUseCase.execute(command);

        expect(result).toEqual({ organizations: [org1] });
      });

      it('calls getUserById with the user id', async () => {
        await listUserOrganizationsUseCase.execute(command);

        expect(mockUserService.getUserById).toHaveBeenCalledWith(
          command.userId,
        );
      });
    });

    describe('when user does not exist', () => {
      const command: ListUserOrganizationsCommand = {
        userId: createUserId('non-existent'),
      };

      beforeEach(() => {
        mockUserService.getUserById.mockResolvedValue(null);
      });

      it('returns empty organizations array', async () => {
        const result = await listUserOrganizationsUseCase.execute(command);

        expect(result).toEqual({ organizations: [] });
      });

      it('calls getUserById with the user id', async () => {
        await listUserOrganizationsUseCase.execute(command);

        expect(mockUserService.getUserById).toHaveBeenCalledWith(
          command.userId,
        );
      });
    });

    describe('when user service fails', () => {
      it('throws the error from user service', async () => {
        const error = new Error('Database error');
        mockUserService.getUserById.mockRejectedValue(error);

        const command: ListUserOrganizationsCommand = {
          userId: createUserId('user-123'),
        };

        await expect(
          listUserOrganizationsUseCase.execute(command),
        ).rejects.toThrow(error);
      });
    });
  });
});
