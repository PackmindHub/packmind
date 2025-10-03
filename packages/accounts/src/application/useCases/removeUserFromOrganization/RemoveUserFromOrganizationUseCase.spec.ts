import { RemoveUserFromOrganizationUseCase } from './RemoveUserFromOrganizationUseCase';
import { UserService } from '../../services/UserService';
import { OrganizationService } from '../../services/OrganizationService';
import {
  RemoveUserFromOrganizationCommand,
  RemoveUserFromOrganizationResponse,
} from '../../../domain/useCases';
import { createUserId, User } from '../../../domain/entities/User';
import { createOrganizationId } from '../../../domain/entities/Organization';
import {
  UserNotFoundError,
  UserCannotExcludeSelfError,
} from '../../../domain/errors';
import { stubLogger } from '@packmind/shared/test';
import { PackmindLogger } from '@packmind/shared';
import { organizationFactory, userFactory } from '../../../../test';

jest.mock('../../services/UserService');
jest.mock('../../services/OrganizationService');

describe('RemoveUserFromOrganizationUseCase', () => {
  const organizationId = createOrganizationId('org-1');
  const requestingUserId = createUserId('requesting-user');
  const targetUserId = createUserId('target-user');

  let userService: jest.Mocked<UserService>;
  let organizationService: jest.Mocked<OrganizationService>;
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

    organizationService = {
      getOrganizationById: mockGetOrganizationById,
    } as unknown as jest.Mocked<OrganizationService>;

    const organization = organizationFactory({ id: organizationId });
    mockGetUserById.mockResolvedValue(buildUser(requestingUserId));
    mockGetOrganizationById.mockResolvedValue(organization);

    logger = stubLogger();
    useCase = new RemoveUserFromOrganizationUseCase(
      userService,
      organizationService,
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
    it('removes the target membership and returns success response', async () => {
      const requestingUser = buildUser(requestingUserId);
      mockGetUserById.mockResolvedValue(requestingUser);
      const targetUser: User = {
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

      const response = await useCase.execute(createCommand());

      const expected: RemoveUserFromOrganizationResponse = { removed: true };
      expect(response).toEqual(expected);
      expect(mockGetUserById).toHaveBeenCalledWith(requestingUserId);
      expect(mockGetUserById).toHaveBeenCalledWith(targetUserId);
      expect(userService.excludeUserFromOrganization).toHaveBeenCalledWith({
        requestingUser,
        targetUser,
        organizationId,
      });
    });
  });

  describe('when requesting user is missing', () => {
    it('throws UserNotFoundError', async () => {
      mockGetUserById.mockResolvedValueOnce(null);

      await expect(useCase.execute(createCommand())).rejects.toBeInstanceOf(
        UserNotFoundError,
      );
      expect(mockGetUserById).toHaveBeenCalledWith(requestingUserId);
      expect(userService.excludeUserFromOrganization).not.toHaveBeenCalled();
    });
  });

  describe('when target user is missing', () => {
    it('throws UserNotFoundError', async () => {
      const requestingUser = buildUser(requestingUserId);
      mockGetUserById
        .mockResolvedValueOnce(requestingUser) // For AbstractAdminUseCase validation
        .mockResolvedValueOnce(null); // For target user lookup

      await expect(useCase.execute(createCommand())).rejects.toBeInstanceOf(
        UserNotFoundError,
      );
      expect(userService.excludeUserFromOrganization).not.toHaveBeenCalled();
    });
  });

  describe('when requester attempts self-exclusion', () => {
    it('throws UserCannotExcludeSelfError before fetching users', async () => {
      const command = createCommand({ targetUserId: requestingUserId });

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        UserCannotExcludeSelfError,
      );
      expect(mockGetUserById).toHaveBeenCalledTimes(1);
    });
  });
});
