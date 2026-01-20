import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createUserId,
  IAccountsPort,
  Organization,
  PackmindCommand,
  PackmindResult,
  User,
  UserOrganizationMembership,
} from '@packmind/types';
import { AbstractMemberUseCase, MemberContext } from './AbstractMemberUseCase';
import {
  UserNotFoundError,
  UserNotInOrganizationError,
} from './UserAccessErrors';

type TestResult = PackmindResult & { success: boolean };

class TestMemberUseCase extends AbstractMemberUseCase<
  PackmindCommand,
  TestResult
> {
  constructor(
    accountsPort: IAccountsPort,
    logger: ReturnType<typeof stubLogger>,
    private readonly onExecute: (
      command: PackmindCommand & MemberContext,
    ) => Promise<TestResult>,
  ) {
    super(accountsPort, logger);
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

    const accountsPort = {
      getUserById: mockGetUserById,
      getOrganizationById: mockGetOrganizationById,
    } as unknown as IAccountsPort;

    useCase = new TestMemberUseCase(
      accountsPort,
      logger,
      mockExecuteForMembers,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when membership exists', () => {
    let user: User;
    let organization: Organization;
    let membership: UserOrganizationMembership;
    let result: TestResult;

    beforeEach(async () => {
      user = buildUser();
      organization = buildOrganization();
      membership = user.memberships[0];

      mockGetUserById.mockResolvedValue(user);
      mockGetOrganizationById.mockResolvedValue(organization);

      result = await useCase.execute(command);
    });

    it('returns the expected result', () => {
      expect(result).toEqual({ success: true });
    });

    it('retrieves the user by id', () => {
      expect(mockGetUserById).toHaveBeenCalledWith(userId);
    });

    it('retrieves the organization by id', () => {
      expect(mockGetOrganizationById).toHaveBeenCalledWith(organizationId);
    });

    it('executes member logic with context', () => {
      expect(mockExecuteForMembers).toHaveBeenCalledWith({
        ...command,
        user,
        organization,
        membership,
      });
    });
  });

  describe('when membership role is admin', () => {
    let user: User;
    let organization: Organization;
    let membership: UserOrganizationMembership;
    let result: TestResult;

    beforeEach(async () => {
      user = buildUser({
        memberships: [buildMembership({ role: 'admin' })],
      });
      organization = buildOrganization();
      membership = user.memberships[0];

      mockGetUserById.mockResolvedValue(user);
      mockGetOrganizationById.mockResolvedValue(organization);

      result = await useCase.execute(command);
    });

    it('returns the expected result', () => {
      expect(result).toEqual({ success: true });
    });

    it('executes member logic with context', () => {
      expect(mockExecuteForMembers).toHaveBeenCalledWith({
        ...command,
        user,
        organization,
        membership,
      });
    });
  });

  describe('when user does not exist', () => {
    beforeEach(async () => {
      mockGetUserById.mockResolvedValue(null);
      await useCase.execute(command).catch(() => {
        /* expected rejection */
      });
    });

    it('throws UserNotFoundError', async () => {
      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        UserNotFoundError,
      );
    });

    it('does not execute member logic', () => {
      expect(mockExecuteForMembers).not.toHaveBeenCalled();
    });
  });

  describe('when membership is missing', () => {
    beforeEach(async () => {
      const user = buildUser({
        memberships: [
          buildMembership({
            organizationId: createOrganizationId('other-org'),
          }),
        ],
      });

      mockGetUserById.mockResolvedValue(user);
      await useCase.execute(command).catch(() => {
        /* expected rejection */
      });
    });

    it('throws UserNotInOrganizationError', async () => {
      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        UserNotInOrganizationError,
      );
    });

    it('does not execute member logic', () => {
      expect(mockExecuteForMembers).not.toHaveBeenCalled();
    });
  });
});
