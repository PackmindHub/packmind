import { PackmindLogger } from '@packmind/logger';
import { MemberContext } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  IAccountsPort,
  UpdateUserDisplayNameCommand,
  UpdateUserDisplayNameResponse,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { organizationFactory, userFactory } from '../../../../test';
import { UserService } from '../../services/UserService';
import { UpdateUserDisplayNameUseCase } from './UpdateUserDisplayNameUseCase';

describe('UpdateUserDisplayNameUseCase', () => {
  let useCase: UpdateUserDisplayNameUseCase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockUserService: jest.Mocked<UserService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  const userId = createUserId('user-123');
  const organizationId = createOrganizationId('org-456');

  beforeEach(() => {
    mockAccountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    mockUserService = {
      updateUser: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    stubbedLogger = stubLogger();

    useCase = new UpdateUserDisplayNameUseCase(
      mockAccountsPort,
      mockUserService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeForMembers', () => {
    const user = userFactory({ id: userId });
    const organization = organizationFactory({ id: organizationId });
    const membership = {
      userId,
      organizationId,
      role: 'member' as const,
    };

    describe('when setting a display name', () => {
      let result: UpdateUserDisplayNameResponse;

      beforeEach(async () => {
        const command: UpdateUserDisplayNameCommand & MemberContext = {
          userId: String(userId),
          organizationId,
          displayName: 'Joan Racenet',
          user,
          organization,
          membership,
        };

        mockUserService.updateUser.mockResolvedValue({
          ...user,
          displayName: 'Joan Racenet',
        });

        result = await useCase.executeForMembers(command);
      });

      it('calls updateUser with the new display name', () => {
        expect(mockUserService.updateUser).toHaveBeenCalledWith({
          ...user,
          displayName: 'Joan Racenet',
        });
      });

      it('returns the updated display name', () => {
        expect(result).toEqual({ displayName: 'Joan Racenet' });
      });
    });

    describe('when setting display name to null', () => {
      let result: UpdateUserDisplayNameResponse;

      beforeEach(async () => {
        const command: UpdateUserDisplayNameCommand & MemberContext = {
          userId: String(userId),
          organizationId,
          displayName: null,
          user,
          organization,
          membership,
        };

        mockUserService.updateUser.mockResolvedValue({
          ...user,
          displayName: null,
        });

        result = await useCase.executeForMembers(command);
      });

      it('calls updateUser with null display name', () => {
        expect(mockUserService.updateUser).toHaveBeenCalledWith({
          ...user,
          displayName: null,
        });
      });

      it('returns null display name', () => {
        expect(result).toEqual({ displayName: null });
      });
    });

    describe('when display name has whitespace', () => {
      let result: UpdateUserDisplayNameResponse;

      beforeEach(async () => {
        const command: UpdateUserDisplayNameCommand & MemberContext = {
          userId: String(userId),
          organizationId,
          displayName: '  Joan Racenet  ',
          user,
          organization,
          membership,
        };

        mockUserService.updateUser.mockResolvedValue({
          ...user,
          displayName: 'Joan Racenet',
        });

        result = await useCase.executeForMembers(command);
      });

      it('trims the display name before saving', () => {
        expect(mockUserService.updateUser).toHaveBeenCalledWith({
          ...user,
          displayName: 'Joan Racenet',
        });
      });

      it('returns the trimmed display name', () => {
        expect(result).toEqual({ displayName: 'Joan Racenet' });
      });
    });

    describe('when display name is empty string', () => {
      let result: UpdateUserDisplayNameResponse;

      beforeEach(async () => {
        const command: UpdateUserDisplayNameCommand & MemberContext = {
          userId: String(userId),
          organizationId,
          displayName: '   ',
          user,
          organization,
          membership,
        };

        mockUserService.updateUser.mockResolvedValue({
          ...user,
          displayName: null,
        });

        result = await useCase.executeForMembers(command);
      });

      it('sets display name to null when only whitespace', () => {
        expect(mockUserService.updateUser).toHaveBeenCalledWith({
          ...user,
          displayName: null,
        });
      });

      it('returns null display name', () => {
        expect(result).toEqual({ displayName: null });
      });
    });
  });
});
