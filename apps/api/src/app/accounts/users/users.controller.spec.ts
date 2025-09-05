import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import {
  User,
  createOrganizationId,
  createUserId,
  AccountsHexa,
} from '@packmind/accounts';
import { NotFoundException } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { PackmindLogger } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';

describe('UsersController', () => {
  let app: TestingModule;
  let usersController: UsersController;
  let usersService: UsersService;
  let mockAuthService: { getMe: jest.Mock };

  beforeAll(async () => {
    const mockAccountsApp = {
      listUsers: jest.fn(),
      getUserById: jest.fn(),
      getUserByUsername: jest.fn(),
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
    it('returns an array of users', async () => {
      const users: User[] = [
        {
          id: createUserId('1'),
          username: 'user1',
          passwordHash: 'hash1',
          organizationId: createOrganizationId('org-1'),
        },
        {
          id: createUserId('2'),
          username: 'user2',
          passwordHash: 'hash2',
          organizationId: createOrganizationId('org-2'),
        },
      ];
      jest
        .spyOn(usersService, 'getUsers')
        .mockImplementation(async () => users);

      expect(await usersController.getUsers()).toBe(users);
    });
  });

  describe('getUserById', () => {
    describe('when user is found', () => {
      it('returns the user', async () => {
        const userId = createUserId('1');
        const user: User = {
          id: userId,
          username: 'user1',
          passwordHash: 'hash1',
          organizationId: createOrganizationId('org-1'),
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

  describe('doesUsernameExist', () => {
    describe('when username exists', () => {
      it('returns true', async () => {
        jest.spyOn(usersService, 'doesUsernameExist').mockResolvedValue(true);

        const result = await usersController.doesUsernameExist({
          username: 'existinguser',
        });

        expect(result).toEqual({ exists: true });
        expect(usersService.doesUsernameExist).toHaveBeenCalledWith(
          'existinguser',
        );
      });
    });

    describe('when username does not exist', () => {
      it('returns false', async () => {
        jest.spyOn(usersService, 'doesUsernameExist').mockResolvedValue(false);

        const result = await usersController.doesUsernameExist({
          username: 'nonexistentuser',
        });

        expect(result).toEqual({ exists: false });
        expect(usersService.doesUsernameExist).toHaveBeenCalledWith(
          'nonexistentuser',
        );
      });
    });

    it('handles service errors', async () => {
      const error = new Error('Database error');
      jest.spyOn(usersService, 'doesUsernameExist').mockRejectedValue(error);

      await expect(
        usersController.doesUsernameExist({ username: 'testuser' }),
      ).rejects.toThrow('Database error');
      expect(usersService.doesUsernameExist).toHaveBeenCalledWith('testuser');
    });
  });
});
