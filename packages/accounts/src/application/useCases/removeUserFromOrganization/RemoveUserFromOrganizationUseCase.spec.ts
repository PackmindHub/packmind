import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createUserId,
  IAccountsPort,
  User,
} from '@packmind/types';
import { organizationFactory, userFactory } from '../../../../test';
import {
  UserCannotExcludeSelfError,
  UserNotFoundError,
} from '../../../domain/errors';
import {
  RemoveUserFromOrganizationCommand,
  RemoveUserFromOrganizationResponse,
} from '../../../domain/useCases';
import { UserService } from '../../services/UserService';
import { RemoveUserFromOrganizationUseCase } from './RemoveUserFromOrganizationUseCase';

jest.mock('../../services/UserService');
jest.mock('../../services/OrganizationService');

describe('RemoveUserFromOrganizationUseCase', () => {
  const organizationId = createOrganizationId('org-1');
  const requestingUserId = createUserId('requesting-user');
  const targetUserId = createUserId('target-user');

  let userService: jest.Mocked<UserService>;
  let logger: jest.Mocked<PackmindLogger>;
  let useCase: RemoveUserFromOrganizationUseCase;
  let mockGetUserById: jest.Mock;
  let mockGetOrganizationById: jest.Mock;

  beforeEach(() => {
    mockGetUserById = jest.fn();
    mockGetOrganizationById = jest.fn();

    userService = {
      getUserById: mockGetUserById,
      excludeUserFromOrganization: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    const organization = organizationFactory({ id: organizationId });
    mockGetUserById.mockResolvedValue(buildUser(requestingUserId));
    mockGetOrganizationById.mockResolvedValue(organization);

    logger = stubLogger();

    const accountsPort = {
      getUserById: mockGetUserById,
      getOrganizationById: mockGetOrganizationById,
    } as unknown as IAccountsPort;

    useCase = new RemoveUserFromOrganizationUseCase(
      accountsPort,
      userService,
      logger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createCommand = (
    overrides?: Partial<RemoveUserFromOrganizationCommand>,
  ): RemoveUserFromOrganizationCommand => ({
    userId: requestingUserId,
    organizationId,
    targetUserId,
    ...overrides,
  });

  const buildUser = (id: User['id']): User =>
    userFactory({
      id,
      memberships: [
        {
          userId: id,
          organizationId,
          role: 'admin',
        },
      ],
    });

  describe('when the exclusion is valid', () => {
    let requestingUser: User;
    let targetUser: User;

    beforeEach(() => {
      requestingUser = buildUser(requestingUserId);
      mockGetUserById.mockResolvedValue(requestingUser);
      targetUser = {
        ...buildUser(targetUserId),
        memberships: [
          {
            userId: targetUserId,
            organizationId,
            role: 'member',
          },
        ],
      };

      mockGetUserById.mockImplementation(async (id) => {
        if (id === requestingUserId) {
          return requestingUser;
        }
        if (id === targetUserId) {
          return targetUser;
        }
        return null;
      });
      userService.excludeUserFromOrganization.mockResolvedValue();
    });

    it('returns success response', async () => {
      const response = await useCase.execute(createCommand());

      const expected: RemoveUserFromOrganizationResponse = { removed: true };
      expect(response).toEqual(expected);
    });

    it('fetches the requesting user', async () => {
      await useCase.execute(createCommand());

      expect(mockGetUserById).toHaveBeenCalledWith(requestingUserId);
    });

    it('fetches the target user', async () => {
      await useCase.execute(createCommand());

      expect(mockGetUserById).toHaveBeenCalledWith(targetUserId);
    });

    it('calls excludeUserFromOrganization with correct parameters', async () => {
      await useCase.execute(createCommand());

      expect(userService.excludeUserFromOrganization).toHaveBeenCalledWith({
        requestingUser,
        targetUser,
        organizationId,
      });
    });
  });

  describe('when requesting user is missing', () => {
    beforeEach(() => {
      mockGetUserById.mockResolvedValueOnce(null);
    });

    it('throws UserNotFoundError', async () => {
      await expect(useCase.execute(createCommand())).rejects.toBeInstanceOf(
        UserNotFoundError,
      );
    });

    it('fetches the requesting user', async () => {
      await useCase.execute(createCommand()).catch(() => {
        // Expected to throw - catch to verify side effects
      });

      expect(mockGetUserById).toHaveBeenCalledWith(requestingUserId);
    });

    it('does not call excludeUserFromOrganization', async () => {
      await useCase.execute(createCommand()).catch(() => {
        // Expected to throw - catch to verify side effects
      });

      expect(userService.excludeUserFromOrganization).not.toHaveBeenCalled();
    });
  });

  describe('when target user is missing', () => {
    beforeEach(() => {
      const requestingUser = buildUser(requestingUserId);
      mockGetUserById
        .mockResolvedValueOnce(requestingUser) // For AbstractAdminUseCase validation
        .mockResolvedValueOnce(null); // For target user lookup
    });

    it('throws UserNotFoundError', async () => {
      await expect(useCase.execute(createCommand())).rejects.toBeInstanceOf(
        UserNotFoundError,
      );
    });

    it('does not call excludeUserFromOrganization', async () => {
      await useCase.execute(createCommand()).catch(() => {
        // Expected to throw - catch to verify side effects
      });

      expect(userService.excludeUserFromOrganization).not.toHaveBeenCalled();
    });
  });

  describe('when requester attempts self-exclusion', () => {
    const command = {
      userId: requestingUserId,
      organizationId,
      targetUserId: requestingUserId,
    };

    it('throws UserCannotExcludeSelfError', async () => {
      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        UserCannotExcludeSelfError,
      );
    });

    it('only fetches users once', async () => {
      await useCase.execute(command).catch(() => {
        // Expected to throw - catch to verify side effects
      });

      expect(mockGetUserById).toHaveBeenCalledTimes(1);
    });
  });
});
