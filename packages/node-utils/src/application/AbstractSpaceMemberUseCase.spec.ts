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

type TestResponse = PackmindResult & { success: boolean };

class TestSpaceMemberUseCase extends AbstractSpaceMemberUseCase<
  SpaceMemberCommand,
  TestResponse
> {
  constructor(
    spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    logger: ReturnType<typeof stubLogger>,
    private readonly onExecute: (
      command: SpaceMemberCommand & SpaceMemberContext,
    ) => Promise<TestResponse>,
  ) {
    super(spacesPort, accountsPort, logger);
  }

  // Exposes the protected hook so the span attributes can be asserted without
  // standing up a real tracer provider.
  publicSpanAttributes(command: SpaceMemberCommand) {
    return this.spanAttributes(command);
  }

  protected executeForSpaceMembers(
    command: SpaceMemberCommand & SpaceMemberContext,
  ): Promise<TestResponse> {
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
    (command: SpaceMemberCommand & SpaceMemberContext) => Promise<TestResponse>
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
    pinned: false,
    createdBy: userId,
    updatedBy: userId,
    ...overrides,
  });

  beforeEach(() => {
    mockFindMembership = jest.fn();
    mockGetUserById = jest.fn();
    mockGetOrganizationById = jest.fn();
    mockExecuteForSpaceMembers = jest
      .fn<Promise<TestResponse>, [SpaceMemberCommand & SpaceMemberContext]>()
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
      let result: TestResponse;

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
      let result: TestResponse;

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

  describe('spanAttributes', () => {
    it('carries the organization and the space', () => {
      expect(useCase.publicSpanAttributes(command)).toEqual({
        'packmind.organization.id': command.organizationId,
        'packmind.space.id': spaceId,
      });
    });

    describe('when the command carries no space', () => {
      it('omits the space id rather than sending an empty one', () => {
        // The cast stands in for spaceId being optional on some commands.
        const spaceless = {
          ...command,
          spaceId: undefined,
        } as unknown as SpaceMemberCommand;

        expect(useCase.publicSpanAttributes(spaceless)).toEqual({
          'packmind.organization.id': command.organizationId,
        });
      });
    });
  });
});
