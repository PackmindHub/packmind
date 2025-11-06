import { AbstractAdminUseCase, AdminContext } from './AbstractAdminUseCase';
import {
  OrganizationAdminRequiredError,
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

class TestAdminUseCase extends AbstractAdminUseCase<
  PackmindCommand,
  TestResult
> {
  constructor(
    userProvider: UserProvider,
    organizationProvider: OrganizationProvider,
    logger: ReturnType<typeof stubLogger>,
    private readonly onExecute: (
      command: PackmindCommand & AdminContext,
    ) => Promise<TestResult>,
  ) {
    super(userProvider, organizationProvider, logger);
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

    const userProvider: UserProvider = {
      getUserById: mockGetUserById,
    };

    const organizationProvider: OrganizationProvider = {
      getOrganizationById: mockGetOrganizationById,
    };

    useCase = new TestAdminUseCase(
      userProvider,
      organizationProvider,
      logger,
      mockExecuteForAdmins,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when validation passes', () => {
      it('executes admin logic', async () => {
        const user = buildUser();
        const organization = buildOrganization();
        const membership = user.memberships[0];

        mockGetUserById.mockResolvedValue(user);
        mockGetOrganizationById.mockResolvedValue(organization);

        const result = await useCase.execute(command);

        expect(result).toEqual({ success: true });
        expect(mockGetUserById).toHaveBeenCalledWith(userId);
        expect(mockGetOrganizationById).toHaveBeenCalledWith(organizationId);
        expect(mockExecuteForAdmins).toHaveBeenCalledWith({
          ...command,
          user,
          organization,
          membership,
        });
        expect(logger.info).toHaveBeenCalledWith(
          'Member validation successful',
          {
            userId: command.userId,
            organizationId: command.organizationId,
          },
        );
      });
    });

    describe('when multiple memberships exist', () => {
      it('finds the correct membership', async () => {
        const otherOrganizationId = createOrganizationId('other-organization');
        const user = buildUser({
          memberships: [
            buildMembership({ organizationId: otherOrganizationId }),
            buildMembership(),
          ],
        });
        const organization = buildOrganization();
        const membership = user.memberships[1];

        mockGetUserById.mockResolvedValue(user);
        mockGetOrganizationById.mockResolvedValue(organization);

        const result = await useCase.execute(command);

        expect(result).toEqual({ success: true });
        expect(mockExecuteForAdmins).toHaveBeenCalledWith({
          ...command,
          user,
          organization,
          membership,
        });
      });
    });

    describe('when user is missing', () => {
      it('throws UserNotFoundError', async () => {
        mockGetUserById.mockResolvedValue(null);

        await expect(useCase.execute(command)).rejects.toBeInstanceOf(
          UserNotFoundError,
        );
        expect(mockExecuteForAdmins).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith('Admin validation failed', {
          userId: command.userId,
          organizationId: command.organizationId,
          reason: 'user_not_found',
        });
      });
    });

    describe('when no matching membership exists', () => {
      it('throws UserNotInOrganizationError', async () => {
        const user = buildUser({
          memberships: [
            buildMembership({
              organizationId: createOrganizationId('other-org'),
            }),
          ],
        });
        mockGetUserById.mockResolvedValue(user);
        mockGetOrganizationById.mockResolvedValue(buildOrganization());

        await expect(useCase.execute(command)).rejects.toBeInstanceOf(
          UserNotInOrganizationError,
        );
        expect(mockExecuteForAdmins).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith('Admin validation failed', {
          userId: command.userId,
          organizationId: command.organizationId,
          reason: 'user_not_in_organization',
        });
      });
    });

    describe('when role is not admin', () => {
      it('throws OrganizationAdminRequiredError', async () => {
        const user = buildUser({
          memberships: [buildMembership({ role: 'member' })],
        });
        mockGetUserById.mockResolvedValue(user);
        mockGetOrganizationById.mockResolvedValue(buildOrganization());

        await expect(useCase.execute(command)).rejects.toBeInstanceOf(
          OrganizationAdminRequiredError,
        );
        expect(mockExecuteForAdmins).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith('Admin validation failed', {
          userId: command.userId,
          organizationId: command.organizationId,
          reason: 'user_not_an_admin',
        });
      });
    });
  });
});
