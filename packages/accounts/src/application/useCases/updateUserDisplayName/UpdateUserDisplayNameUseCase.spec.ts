import { PackmindLogger } from '@packmind/logger';
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
import { InvalidDisplayNameError } from '../../../domain/errors';

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

  describe('execute', () => {
    const membership = {
      userId,
      organizationId,
      role: 'member' as const,
    };
    const user = userFactory({ id: userId, memberships: [membership] });
    const organization = organizationFactory({ id: organizationId });

    beforeEach(() => {
      mockAccountsPort.getUserById.mockResolvedValue(user);
      mockAccountsPort.getOrganizationById.mockResolvedValue(organization);
    });

    describe('when setting a display name', () => {
      let result: UpdateUserDisplayNameResponse;

      beforeEach(async () => {
        const command: UpdateUserDisplayNameCommand = {
          userId: String(userId),
          organizationId,
          displayName: 'Joan Racenet',
        };

        mockUserService.updateUser.mockResolvedValue({
          ...user,
          displayName: 'Joan Racenet',
        });

        result = await useCase.execute(command);
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
        const command: UpdateUserDisplayNameCommand = {
          userId: String(userId),
          organizationId,
          displayName: null,
        };

        mockUserService.updateUser.mockResolvedValue({
          ...user,
          displayName: null,
        });

        result = await useCase.execute(command);
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
        const command: UpdateUserDisplayNameCommand = {
          userId: String(userId),
          organizationId,
          displayName: '  Joan Racenet  ',
        };

        mockUserService.updateUser.mockResolvedValue({
          ...user,
          displayName: 'Joan Racenet',
        });

        result = await useCase.execute(command);
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

    describe('when display name has consecutive spaces', () => {
      let result: UpdateUserDisplayNameResponse;

      beforeEach(async () => {
        const command: UpdateUserDisplayNameCommand = {
          userId: String(userId),
          organizationId,
          displayName: 'Joan    Racenet',
        };

        mockUserService.updateUser.mockResolvedValue({
          ...user,
          displayName: 'Joan Racenet',
        });

        result = await useCase.execute(command);
      });

      it('normalizes consecutive spaces to single space', () => {
        expect(mockUserService.updateUser).toHaveBeenCalledWith({
          ...user,
          displayName: 'Joan Racenet',
        });
      });

      it('returns the normalized display name', () => {
        expect(result).toEqual({ displayName: 'Joan Racenet' });
      });
    });

    describe('when display name exceeds max length', () => {
      let executePromise: Promise<UpdateUserDisplayNameResponse>;

      beforeEach(() => {
        const command: UpdateUserDisplayNameCommand = {
          userId: String(userId),
          organizationId,
          displayName: 'a'.repeat(256),
        };

        executePromise = useCase.execute(command);
      });

      it('throws InvalidDisplayNameError', async () => {
        await expect(executePromise).rejects.toThrow(InvalidDisplayNameError);
      });

      it('does not call updateUser', async () => {
        await executePromise.catch(() => undefined);
        expect(mockUserService.updateUser).not.toHaveBeenCalled();
      });
    });

    describe('when display name is exactly max length', () => {
      let result: UpdateUserDisplayNameResponse;

      beforeEach(async () => {
        const name = 'a'.repeat(255);
        const command: UpdateUserDisplayNameCommand = {
          userId: String(userId),
          organizationId,
          displayName: name,
        };

        mockUserService.updateUser.mockResolvedValue({
          ...user,
          displayName: name,
        });

        result = await useCase.execute(command);
      });

      it('accepts the display name', () => {
        expect(mockUserService.updateUser).toHaveBeenCalled();
      });

      it('returns the display name', () => {
        expect(result.displayName).toHaveLength(255);
      });
    });

    describe('when display name is empty string', () => {
      let result: UpdateUserDisplayNameResponse;

      beforeEach(async () => {
        const command: UpdateUserDisplayNameCommand = {
          userId: String(userId),
          organizationId,
          displayName: '   ',
        };

        mockUserService.updateUser.mockResolvedValue({
          ...user,
          displayName: null,
        });

        result = await useCase.execute(command);
      });

      describe('when only whitespace', () => {
        it('sets display name to null', () => {
          expect(mockUserService.updateUser).toHaveBeenCalledWith({
            ...user,
            displayName: null,
          });
        });
      });

      it('returns null display name', () => {
        expect(result).toEqual({ displayName: null });
      });
    });
  });
});
