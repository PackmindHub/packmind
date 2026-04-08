import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  IAccountsPort,
  ISpacesPort,
  Organization,
  PackmindResult,
  SpaceMemberCommand,
  User,
  UserOrganizationMembership,
  UserSpaceMembership,
  UserSpaceRole,
} from '@packmind/types';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
  SpaceMembershipRequiredError,
} from './AbstractSpaceMemberUseCase';
import {
  UserNotFoundError,
  UserNotInOrganizationError,
} from './UserAccessErrors';

type TestResult = PackmindResult & { success: boolean };

class TestSpaceMemberUseCase extends AbstractSpaceMemberUseCase<
  SpaceMemberCommand,
  TestResult
> {
  constructor(
    spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    logger: ReturnType<typeof stubLogger>,
    private readonly onExecute: (
      command: SpaceMemberCommand & SpaceMemberContext,
    ) => Promise<TestResult>,
  ) {
    super(spacesPort, accountsPort, logger);
  }

  protected executeForSpaceMembers(
    command: SpaceMemberCommand & SpaceMemberContext,
  ): Promise<TestResult> {
    return this.onExecute(command);
  }
}

describe('AbstractSpaceMemberUseCase', () => {
  const spaceId = createSpaceId('space-id');
  const command: SpaceMemberCommand = {
    userId: 'user-id',
    organizationId: 'organization-id',
    spaceId,
  };

  const userId = createUserId(command.userId);
  const organizationId = createOrganizationId(command.organizationId);

  let mockFindMembership: jest.Mock;
  let mockGetUserById: jest.Mock;
  let mockGetOrganizationById: jest.Mock;
  let mockExecuteForSpaceMembers: jest.MockedFunction<
    (command: SpaceMemberCommand & SpaceMemberContext) => Promise<TestResult>
  >;
  let logger: ReturnType<typeof stubLogger>;
  let useCase: TestSpaceMemberUseCase;

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
    mockExecuteForSpaceMembers = jest
      .fn<Promise<TestResult>, [SpaceMemberCommand & SpaceMemberContext]>()
      .mockResolvedValue({ success: true });
    logger = stubLogger();

    const spacesPort = {
      findMembership: mockFindMembership,
    } as unknown as ISpacesPort;

    const accountsPort = {
      getUserById: mockGetUserById,
      getOrganizationById: mockGetOrganizationById,
    } as unknown as IAccountsPort;

    useCase = new TestSpaceMemberUseCase(
      spacesPort,
      accountsPort,
      logger,
      mockExecuteForSpaceMembers,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when the caller is a space member', () => {
      let result: TestResult;

      beforeEach(async () => {
        mockGetUserById.mockResolvedValue(buildUser());
        mockGetOrganizationById.mockResolvedValue(buildOrganization());
        mockFindMembership.mockResolvedValue(
          buildSpaceMembership({ role: UserSpaceRole.MEMBER }),
        );

        result = await useCase.execute(command);
      });

      it('returns success result', () => {
        expect(result).toEqual({ success: true });
      });

      it('delegates to executeForSpaceMembers', () => {
        expect(mockExecuteForSpaceMembers).toHaveBeenCalled();
      });
    });

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

      it('delegates to executeForSpaceMembers', () => {
        expect(mockExecuteForSpaceMembers).toHaveBeenCalled();
      });
    });

    describe('when the caller has no space membership', () => {
      beforeEach(() => {
        mockGetUserById.mockResolvedValue(buildUser());
        mockGetOrganizationById.mockResolvedValue(buildOrganization());
        mockFindMembership.mockResolvedValue(null);
      });

      it('throws SpaceMembershipRequiredError', async () => {
        await expect(useCase.execute(command)).rejects.toBeInstanceOf(
          SpaceMembershipRequiredError,
        );
      });

      it('does not execute space member logic', async () => {
        await useCase.execute(command).catch(() => undefined);

        expect(mockExecuteForSpaceMembers).not.toHaveBeenCalled();
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

      it('does not execute space member logic', async () => {
        await useCase.execute(command).catch(() => undefined);

        expect(mockExecuteForSpaceMembers).not.toHaveBeenCalled();
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

      it('does not execute space member logic', async () => {
        await useCase.execute(command).catch(() => undefined);

        expect(mockExecuteForSpaceMembers).not.toHaveBeenCalled();
      });
    });
  });
});
