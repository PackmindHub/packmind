import { AbstractMemberUseCase, MemberContext } from './AbstractMemberUseCase';
import {
  UserNotFoundError,
  UserNotInOrganizationError,
} from './UserAccessErrors';
import { PackmindCommand, PackmindResult } from '@packmind/types';
import {
  createUserId,
  User,
  UserOrganizationMembership,
} from '@packmind/types';
import { createOrganizationId, Organization } from '@packmind/types';
import { UserProvider, OrganizationProvider } from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';

type TestResult = PackmindResult & { success: boolean };

class TestMemberUseCase extends AbstractMemberUseCase<
  PackmindCommand,
  TestResult
> {
  constructor(
    userProvider: UserProvider,
    organizationProvider: OrganizationProvider,
    logger: ReturnType<typeof stubLogger>,
    private readonly onExecute: (
      command: PackmindCommand & MemberContext,
    ) => Promise<TestResult>,
  ) {
    super(userProvider, organizationProvider, logger);
  }

  protected executeForMembers(
    command: PackmindCommand & MemberContext,
  ): Promise<TestResult> {
    return this.onExecute(command);
  }
}

describe('AbstractMemberUseCase', () => {
  const userId = createUserId('member-user-id');
  const organizationId = createOrganizationId('organization-id');

  const command: PackmindCommand = {
    userId,
    organizationId,
  };

  let mockGetUserById: jest.Mock;
  let mockGetOrganizationById: jest.Mock;
  let mockExecuteForMembers: jest.MockedFunction<
    (command: PackmindCommand & MemberContext) => Promise<TestResult>
  >;
  let logger: ReturnType<typeof stubLogger>;
  let useCase: TestMemberUseCase;

  const buildMembership = (
    overrides?: Partial<UserOrganizationMembership>,
  ): UserOrganizationMembership => ({
    userId,
    organizationId,
    role: 'member',
    ...overrides,
  });

  const buildUser = (overrides?: Partial<User>): User => ({
    id: userId,
    email: 'member@test.com',
    passwordHash: 'hash',
    active: true,
    memberships: [
      buildMembership(),
      buildMembership({
        role: 'admin',
        organizationId: createOrganizationId('other-org'),
      }),
    ],
    ...overrides,
  });

  const buildOrganization = (
    overrides?: Partial<Organization>,
  ): Organization => ({
    id: organizationId,
    name: 'Test Organization',
    slug: 'test-org',
    ...overrides,
  });

  beforeEach(() => {
    mockGetUserById = jest.fn();
    mockGetOrganizationById = jest.fn();
    mockExecuteForMembers = jest
      .fn<Promise<TestResult>, [PackmindCommand & MemberContext]>()
      .mockResolvedValue({ success: true });
    logger = stubLogger();

    const userProvider: UserProvider = {
      getUserById: mockGetUserById,
    };

    const organizationProvider: OrganizationProvider = {
      getOrganizationById: mockGetOrganizationById,
    };

    useCase = new TestMemberUseCase(
      userProvider,
      organizationProvider,
      logger,
      mockExecuteForMembers,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when membership exists', () => {
    it('executes member logic', async () => {
      const user = buildUser();
      const organization = buildOrganization();
      const membership = user.memberships[0];

      mockGetUserById.mockResolvedValue(user);
      mockGetOrganizationById.mockResolvedValue(organization);

      const result = await useCase.execute(command);

      expect(result).toEqual({ success: true });
      expect(mockGetUserById).toHaveBeenCalledWith(userId);
      expect(mockGetOrganizationById).toHaveBeenCalledWith(organizationId);
      expect(mockExecuteForMembers).toHaveBeenCalledWith({
        ...command,
        user,
        organization,
        membership,
      });
      expect(logger.info).toHaveBeenCalledWith('Member validation successful', {
        userId: command.userId,
        organizationId: command.organizationId,
      });
    });
  });

  describe('when membership role is admin', () => {
    it('accepts the membership as valid', async () => {
      const user = buildUser({
        memberships: [buildMembership({ role: 'admin' })],
      });
      const organization = buildOrganization();
      const membership = user.memberships[0];

      mockGetUserById.mockResolvedValue(user);
      mockGetOrganizationById.mockResolvedValue(organization);

      const result = await useCase.execute(command);

      expect(result).toEqual({ success: true });
      expect(mockExecuteForMembers).toHaveBeenCalledWith({
        ...command,
        user,
        organization,
        membership,
      });
    });
  });

  describe('when user does not exist', () => {
    it('throws UserNotFoundError', async () => {
      mockGetUserById.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        UserNotFoundError,
      );
      expect(mockExecuteForMembers).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith('Member validation failed', {
        userId: command.userId,
        organizationId: command.organizationId,
        reason: 'user_not_found',
      });
    });
  });

  describe('when membership is missing', () => {
    it('throws UserNotInOrganizationError', async () => {
      const user = buildUser({
        memberships: [
          buildMembership({
            organizationId: createOrganizationId('other-org'),
          }),
        ],
      });

      mockGetUserById.mockResolvedValue(user);

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        UserNotInOrganizationError,
      );
      expect(mockExecuteForMembers).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith('Member validation failed', {
        userId: command.userId,
        organizationId: command.organizationId,
        reason: 'user_not_in_organization',
      });
    });
  });
});
