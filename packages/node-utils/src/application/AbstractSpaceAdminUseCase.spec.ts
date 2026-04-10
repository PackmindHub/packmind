import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  IAccountsPort,
  ISpacesPort,
  Organization,
  PackmindResult,
  SpaceAdminCommand,
  User,
  UserOrganizationMembership,
  UserSpaceMembership,
  UserSpaceRole,
} from '@packmind/types';
import {
  AbstractSpaceAdminUseCase,
  SpaceAdminContext,
  SpaceAdminRequiredError,
} from './AbstractSpaceAdminUseCase';
import {
  UserNotFoundError,
  UserNotInOrganizationError,
} from './UserAccessErrors';

type TestResult = PackmindResult & { success: boolean };

class TestSpaceAdminUseCase extends AbstractSpaceAdminUseCase<
  SpaceAdminCommand,
  TestResult
> {
  constructor(
    spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    logger: ReturnType<typeof stubLogger>,
    private readonly onExecute: (
      command: SpaceAdminCommand & SpaceAdminContext,
    ) => Promise<TestResult>,
  ) {
    super(spacesPort, accountsPort, logger);
  }

  protected executeForSpaceAdmins(
    command: SpaceAdminCommand & SpaceAdminContext,
  ): Promise<TestResult> {
    return this.onExecute(command);
  }
}

describe('AbstractSpaceAdminUseCase', () => {
  const spaceId = createSpaceId('space-id');
  const command: SpaceAdminCommand = {
    userId: 'user-id',
    organizationId: 'organization-id',
    spaceId,
  };

  const userId = createUserId(command.userId);
  const organizationId = createOrganizationId(command.organizationId);

  let mockFindMembership: jest.Mock;
  let mockGetUserById: jest.Mock;
  let mockGetOrganizationById: jest.Mock;
  let mockExecuteForSpaceAdmins: jest.MockedFunction<
    (command: SpaceAdminCommand & SpaceAdminContext) => Promise<TestResult>
  >;
  let logger: ReturnType<typeof stubLogger>;
  let useCase: TestSpaceAdminUseCase;

  const buildOrgMembership = (
    overrides?: Partial<UserOrganizationMembership>,
  ): UserOrganizationMembership => ({
    userId,
    organizationId,
    role: 'member',
    ...overrides,
  });

  const buildUser = (overrides?: Partial<User>): User => ({
    id: userId,
    email: 'user@test.com',
    passwordHash: 'hash',
    active: true,
    memberships: [buildOrgMembership()],
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

  const buildSpaceMembership = (
    overrides?: Partial<UserSpaceMembership>,
  ): UserSpaceMembership => ({
    userId,
    spaceId,
    role: UserSpaceRole.MEMBER,
    createdBy: userId,
    updatedBy: userId,
    ...overrides,
  });

  beforeEach(() => {
    mockFindMembership = jest.fn();
    mockGetUserById = jest.fn();
    mockGetOrganizationById = jest.fn();
    mockExecuteForSpaceAdmins = jest
      .fn<Promise<TestResult>, [SpaceAdminCommand & SpaceAdminContext]>()
      .mockResolvedValue({ success: true });
    logger = stubLogger();

    const spacesPort = {
      findMembership: mockFindMembership,
    } as unknown as ISpacesPort;

    const accountsPort = {
      getUserById: mockGetUserById,
      getOrganizationById: mockGetOrganizationById,
    } as unknown as IAccountsPort;

    useCase = new TestSpaceAdminUseCase(
      spacesPort,
      accountsPort,
      logger,
      mockExecuteForSpaceAdmins,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when the caller is a space admin', () => {
      let result: TestResult;

      beforeEach(async () => {
        mockGetUserById.mockResolvedValue(buildUser());
        mockGetOrganizationById.mockResolvedValue(buildOrganization());
        mockFindMembership.mockResolvedValue(
          buildSpaceMembership({ role: UserSpaceRole.ADMIN }),
        );

        result = await useCase.execute(command);
      });

      it('returns success result', () => {
        expect(result).toEqual({ success: true });
      });

      it('delegates to executeForSpaceAdmins', () => {
        expect(mockExecuteForSpaceAdmins).toHaveBeenCalled();
      });
    });

    describe('when the caller is a space member but not admin', () => {
      beforeEach(() => {
        mockGetUserById.mockResolvedValue(buildUser());
        mockGetOrganizationById.mockResolvedValue(buildOrganization());
        mockFindMembership.mockResolvedValue(
          buildSpaceMembership({ role: UserSpaceRole.MEMBER }),
        );
      });

      it('throws SpaceAdminRequiredError', async () => {
        await expect(useCase.execute(command)).rejects.toBeInstanceOf(
          SpaceAdminRequiredError,
        );
      });

      it('does not execute space admin logic', async () => {
        await useCase.execute(command).catch(() => undefined);

        expect(mockExecuteForSpaceAdmins).not.toHaveBeenCalled();
      });
    });

    describe('when the caller has no space membership', () => {
      beforeEach(() => {
        mockGetUserById.mockResolvedValue(buildUser());
        mockGetOrganizationById.mockResolvedValue(buildOrganization());
        mockFindMembership.mockResolvedValue(null);
      });

      it('throws SpaceAdminRequiredError', async () => {
        await expect(useCase.execute(command)).rejects.toBeInstanceOf(
          SpaceAdminRequiredError,
        );
      });

      it('does not execute space admin logic', async () => {
        await useCase.execute(command).catch(() => undefined);

        expect(mockExecuteForSpaceAdmins).not.toHaveBeenCalled();
      });
    });

    describe('when the user is not a member of the organization', () => {
      beforeEach(() => {
        mockGetUserById.mockResolvedValue(
          buildUser({
            memberships: [
              buildOrgMembership({
                organizationId: createOrganizationId('other-org'),
              }),
            ],
          }),
        );
        mockGetOrganizationById.mockResolvedValue(buildOrganization());
      });

      it('throws UserNotInOrganizationError', async () => {
        await expect(useCase.execute(command)).rejects.toBeInstanceOf(
          UserNotInOrganizationError,
        );
      });

      it('does not execute space admin logic', async () => {
        await useCase.execute(command).catch(() => undefined);

        expect(mockExecuteForSpaceAdmins).not.toHaveBeenCalled();
      });
    });

    describe('when the user is not found', () => {
      beforeEach(() => {
        mockGetUserById.mockResolvedValue(null);
      });

      it('throws UserNotFoundError', async () => {
        await expect(useCase.execute(command)).rejects.toBeInstanceOf(
          UserNotFoundError,
        );
      });

      it('does not execute space admin logic', async () => {
        await useCase.execute(command).catch(() => undefined);

        expect(mockExecuteForSpaceAdmins).not.toHaveBeenCalled();
      });
    });
  });
});
