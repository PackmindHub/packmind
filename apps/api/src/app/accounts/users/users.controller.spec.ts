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
