import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import {
  User,
  createOrganizationId,
  createUserId,
  AccountsHexa,
  ListUsersResponse,
} from '@packmind/accounts';
import { NotFoundException } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { PackmindLogger } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';
import { AuthenticatedRequest } from '@packmind/shared-nest';

describe('UsersController', () => {
  let app: TestingModule;
  let usersController: UsersController;
  let usersService: UsersService;
  let mockAuthService: { getMe: jest.Mock };

  beforeAll(async () => {
    const mockAccountsApp = {
      listUsers: jest.fn(),
      getUserById: jest.fn(),
      signUpUser: jest.fn(),
      getOrganizationById: jest.fn(),
    };

    mockAuthService = {
      getMe: jest.fn(),
    };

    app = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        UsersService,
        {
          provide: AccountsHexa,
          useValue: mockAccountsApp,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: PackmindLogger,
          useValue: stubLogger(), // Using our stubLogger utility
        },
      ],
    }).compile();

    usersController = app.get<UsersController>(UsersController);
    usersService = app.get<UsersService>(UsersService);
  });

  describe('getUsers', () => {
    it('returns an array of users for the request organization', async () => {
      const user1Id = createUserId('1');
      const user2Id = createUserId('2');
      const users: ListUsersResponse['users'] = [
        {
          id: user1Id,
          email: 'user1@packmind.com',
          active: true,
        },
        {
          id: user2Id,
          email: 'user2@packmind.com',
          active: true,
        },
      ];
      jest
        .spyOn(usersService, 'getUsers')
        .mockImplementation(async () => ({ users }));

      const request = {
        user: {
          userId: user1Id,
        },
        organization: {
          id: createOrganizationId('org-1'),
          name: 'Organization 1',
          slug: 'organization-1',
        },
      } as unknown as AuthenticatedRequest;

      expect(await usersController.getUsers(request)).toEqual({ users });
      expect(usersService.getUsers).toHaveBeenCalledWith(
        request.user.userId,
        request.organization.id,
      );
    });
  });

  describe('getUserById', () => {
    describe('when user is found', () => {
      it('returns the user', async () => {
        const userId = createUserId('1');
        const user: User = {
          id: userId,
          email: 'user1@packmind.com',
          passwordHash: 'hash1',
          active: true,
          memberships: [
            {
              userId,
              organizationId: createOrganizationId('org-1'),
              role: 'admin',
            },
          ],
        };
        jest
          .spyOn(usersService, 'getUserById')
          .mockImplementation(async () => user);

        expect(await usersController.getUserById(userId)).toBe(user);
      });
    });

    describe('when user is not found', () => {
      it('throws NotFoundException', async () => {
        const userId = createUserId('1');

        jest
          .spyOn(usersService, 'getUserById')
          .mockImplementation(async () => null);

        await expect(usersController.getUserById(userId)).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });
});
