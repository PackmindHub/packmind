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
import { AbstractAdminUseCase, AdminContext } from './AbstractAdminUseCase';
import {
  OrganizationAdminRequiredError,
  UserNotFoundError,
  UserNotInOrganizationError,
} from './UserAccessErrors';

type TestResult = PackmindResult & { success: boolean };

class TestAdminUseCase extends AbstractAdminUseCase<
  PackmindCommand,
  TestResult
> {
  constructor(
    accountsPort: IAccountsPort,
    logger: ReturnType<typeof stubLogger>,
    private readonly onExecute: (
      command: PackmindCommand & AdminContext,
    ) => Promise<TestResult>,
  ) {
    super(accountsPort, logger);
  }

  protected executeForAdmins(
    command: PackmindCommand & AdminContext,
  ): Promise<TestResult> {
    return this.onExecute(command);
  }
}

describe('AbstractAdminUseCase', () => {
  const command: PackmindCommand = {
    userId: 'admin-user-id',
    organizationId: 'organization-id',
  };

  const userId = createUserId(command.userId);
  const organizationId = createOrganizationId(command.organizationId);

  let mockGetUserById: jest.Mock;
  let mockGetOrganizationById: jest.Mock;
  let mockExecuteForAdmins: jest.MockedFunction<
    (command: PackmindCommand & AdminContext) => Promise<TestResult>
  >;
  let logger: ReturnType<typeof stubLogger>;
  let useCase: TestAdminUseCase;

  const buildMembership = (
    overrides?: Partial<UserOrganizationMembership>,
  ): UserOrganizationMembership => ({
    userId,
    organizationId,
    role: 'admin',
    ...overrides,
  });

  const buildUser = (overrides?: Partial<User>): User => ({
    id: userId,
    email: 'admin@test.com',
    passwordHash: 'hash',
    active: true,
    memberships: [buildMembership()],
    ...overrides,
  });

  const buildOrganization = (
    overrides?: Partial<Organization>,
  ): Organization => ({
    id: organizationId,
    name: 'Test Organization',
    slug: 'test-organization',
    ...overrides,
  });

  beforeEach(() => {
    mockGetUserById = jest.fn();
    mockGetOrganizationById = jest.fn();
    mockExecuteForAdmins = jest
      .fn<Promise<TestResult>, [PackmindCommand & AdminContext]>()
      .mockResolvedValue({ success: true });
    logger = stubLogger();

    const accountsPort = {
      getUserById: mockGetUserById,
      getOrganizationById: mockGetOrganizationById,
    } as unknown as IAccountsPort;

    useCase = new TestAdminUseCase(accountsPort, logger, mockExecuteForAdmins);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when validation passes', () => {
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

      it('returns success result', () => {
        expect(result).toEqual({ success: true });
      });

      it('fetches the user by id', () => {
        expect(mockGetUserById).toHaveBeenCalledWith(userId);
      });

      it('fetches the organization by id', () => {
        expect(mockGetOrganizationById).toHaveBeenCalledWith(organizationId);
      });

      it('executes admin logic with context', () => {
        expect(mockExecuteForAdmins).toHaveBeenCalledWith({
          ...command,
          user,
          organization,
          membership,
        });
      });
    });

    describe('when multiple memberships exist', () => {
      let user: User;
      let organization: Organization;
      let membership: UserOrganizationMembership;
      let result: TestResult;

      beforeEach(async () => {
        const otherOrganizationId = createOrganizationId('other-organization');
        user = buildUser({
          memberships: [
            buildMembership({ organizationId: otherOrganizationId }),
            buildMembership(),
          ],
        });
        organization = buildOrganization();
        membership = user.memberships[1];

        mockGetUserById.mockResolvedValue(user);
        mockGetOrganizationById.mockResolvedValue(organization);

        result = await useCase.execute(command);
      });

      it('returns success result', () => {
        expect(result).toEqual({ success: true });
      });

      it('executes admin logic with correct membership', () => {
        expect(mockExecuteForAdmins).toHaveBeenCalledWith({
          ...command,
          user,
          organization,
          membership,
        });
      });
    });

    describe('when user is missing', () => {
      beforeEach(async () => {
        mockGetUserById.mockResolvedValue(null);

        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }
      });

      it('throws UserNotFoundError', async () => {
        mockGetUserById.mockResolvedValue(null);

        await expect(useCase.execute(command)).rejects.toBeInstanceOf(
          UserNotFoundError,
        );
      });

      it('does not execute admin logic', () => {
        expect(mockExecuteForAdmins).not.toHaveBeenCalled();
      });
    });

    describe('when no matching membership exists', () => {
      beforeEach(async () => {
        const user = buildUser({
          memberships: [
            buildMembership({
              organizationId: createOrganizationId('other-org'),
            }),
          ],
        });
        mockGetUserById.mockResolvedValue(user);
        mockGetOrganizationById.mockResolvedValue(buildOrganization());

        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }
      });

      it('throws UserNotInOrganizationError', async () => {
        await expect(useCase.execute(command)).rejects.toBeInstanceOf(
          UserNotInOrganizationError,
        );
      });

      it('does not execute admin logic', () => {
        expect(mockExecuteForAdmins).not.toHaveBeenCalled();
      });
    });

    describe('when role is not admin', () => {
      beforeEach(async () => {
        const user = buildUser({
          memberships: [buildMembership({ role: 'member' })],
        });
        mockGetUserById.mockResolvedValue(user);
        mockGetOrganizationById.mockResolvedValue(buildOrganization());

        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }
      });

      it('throws OrganizationAdminRequiredError', async () => {
        await expect(useCase.execute(command)).rejects.toBeInstanceOf(
          OrganizationAdminRequiredError,
        );
      });

      it('does not execute admin logic', () => {
        expect(mockExecuteForAdmins).not.toHaveBeenCalled();
      });
    });
  });
});
