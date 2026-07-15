import { ListCommandsBySpaceUseCase } from './ListCommandsBySpaceUseCase';
import { CommandService } from '../../services/CommandService';
import { commandFactory } from '../../../../test/commandFactory';
import {
  IAccountsPort,
  ISpacesPort,
  Space,
  createSpaceId,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { SpaceMembershipRequiredError } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';

describe('ListRecipesBySpaceUseCase', () => {
  let usecase: ListCommandsBySpaceUseCase;
  let commandService: jest.Mocked<CommandService>;
  let accountsAdapter: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;

  beforeEach(() => {
    commandService = {
      listCommandsBySpace: jest.fn(),
    } as unknown as jest.Mocked<CommandService>;

    accountsAdapter = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    spacesPort = {
      getSpaceById: jest.fn(),
      findMembership: jest.fn().mockResolvedValue({
        userId: createUserId('00000000-0000-0000-0000-000000000001'),
        spaceId: createSpaceId('00000000-0000-0000-0000-000000000002'),
        role: 'member',
        createdBy: createUserId('00000000-0000-0000-0000-000000000001'),
        updatedBy: createUserId('00000000-0000-0000-0000-000000000001'),
      }),
    } as unknown as jest.Mocked<ISpacesPort>;

    usecase = new ListCommandsBySpaceUseCase(
      spacesPort,
      accountsAdapter,
      commandService,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeForMembers', () => {
    describe('when listing recipes for a space', () => {
      const organizationId = createOrganizationId('org-1');
      const spaceId = createSpaceId('space-1');
      const userId = createUserId('user-1');
      let spaceCommands: ReturnType<typeof commandFactory>[];
      let result: { recipes: ReturnType<typeof commandFactory>[] };

      beforeEach(async () => {
        const organization = {
          id: organizationId,
          name: 'Test Org',
          slug: 'test-org',
        };
        const user = {
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hash',
          active: true,
          memberships: [
            {
              userId,
              organizationId,
              role: 'member' as const,
            },
          ],
        };
        const space: Space = {
          id: spaceId,
          name: 'Test Space',
          slug: 'test-space',
          organizationId,
        };

        spaceCommands = [
          commandFactory({ spaceId }),
          commandFactory({ spaceId }),
        ];

        accountsAdapter.getOrganizationById.mockResolvedValue(organization);
        accountsAdapter.getUserById.mockResolvedValue(user);
        spacesPort.getSpaceById.mockResolvedValue(space);
        commandService.listCommandsBySpace.mockResolvedValue(spaceCommands);

        result = await usecase.execute({
          userId,
          organizationId,
          spaceId,
        });
      });

      it('calls listRecipesBySpace with the space id', () => {
        expect(commandService.listCommandsBySpace).toHaveBeenCalledWith(
          spaceId,
          {
            includeDeleted: undefined,
          },
        );
      });

      it('returns the correct number of recipes', () => {
        expect(result.recipes).toHaveLength(2);
      });

      it('includes the first space recipe', () => {
        expect(result.recipes).toContainEqual(spaceCommands[0]);
      });

      it('includes the second space recipe', () => {
        expect(result.recipes).toContainEqual(spaceCommands[1]);
      });
    });

    describe('when organization has no recipes', () => {
      const organizationId = createOrganizationId('org-1');
      const spaceId = createSpaceId('space-1');
      const userId = createUserId('user-1');
      let result: { recipes: ReturnType<typeof commandFactory>[] };

      beforeEach(async () => {
        const organization = {
          id: organizationId,
          name: 'Test Org',
          slug: 'test-org',
        };
        const user = {
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hash',
          active: true,
          memberships: [
            {
              userId,
              organizationId,
              role: 'member' as const,
            },
          ],
        };
        const space: Space = {
          id: spaceId,
          name: 'Test Space',
          slug: 'test-space',
          organizationId,
        };

        accountsAdapter.getOrganizationById.mockResolvedValue(organization);
        accountsAdapter.getUserById.mockResolvedValue(user);
        spacesPort.getSpaceById.mockResolvedValue(space);
        commandService.listCommandsBySpace.mockResolvedValue([]);

        result = await usecase.execute({
          userId,
          organizationId,
          spaceId,
        });
      });

      it('calls listRecipesBySpace with the space id', () => {
        expect(commandService.listCommandsBySpace).toHaveBeenCalledWith(
          spaceId,
          {
            includeDeleted: undefined,
          },
        );
      });

      it('returns an empty array', () => {
        expect(result.recipes).toEqual([]);
      });
    });

    describe('when filtering recipes by space', () => {
      const organizationId = createOrganizationId('org-1');
      const spaceId = createSpaceId('space-1');
      const otherSpaceId = createSpaceId('space-2');
      const userId = createUserId('user-1');
      let commandInSpace: ReturnType<typeof commandFactory>;
      let orgLevelCommand: ReturnType<typeof commandFactory>;
      let commandInOtherSpace: ReturnType<typeof commandFactory>;
      let result: { recipes: ReturnType<typeof commandFactory>[] };

      beforeEach(async () => {
        const organization = {
          id: organizationId,
          name: 'Test Org',
          slug: 'test-org',
        };
        const user = {
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hash',
          active: true,
          memberships: [
            {
              userId,
              organizationId,
              role: 'member' as const,
            },
          ],
        };
        const space: Space = {
          id: spaceId,
          name: 'Test Space',
          slug: 'test-space',
          organizationId,
        };

        commandInSpace = commandFactory({ spaceId });
        orgLevelCommand = commandFactory({
          spaceId: createSpaceId('space-1'),
        });
        commandInOtherSpace = commandFactory({
          spaceId: otherSpaceId,
        });

        accountsAdapter.getOrganizationById.mockResolvedValue(organization);
        accountsAdapter.getUserById.mockResolvedValue(user);
        spacesPort.getSpaceById.mockResolvedValue(space);
        commandService.listCommandsBySpace.mockResolvedValue([commandInSpace]);

        result = await usecase.execute({
          userId,
          organizationId,
          spaceId,
        });
      });

      it('returns only recipes from the requested space', () => {
        expect(result.recipes).toHaveLength(1);
      });

      it('includes the recipe from the requested space', () => {
        expect(result.recipes).toContainEqual(commandInSpace);
      });

      it('excludes org-level recipes', () => {
        expect(result.recipes).not.toContainEqual(orgLevelCommand);
      });

      it('excludes recipes from other spaces', () => {
        expect(result.recipes).not.toContainEqual(commandInOtherSpace);
      });
    });

    describe('when deduplicating recipes', () => {
      const organizationId = createOrganizationId('org-1');
      const spaceId = createSpaceId('space-1');
      const userId = createUserId('user-1');
      let result: { recipes: ReturnType<typeof commandFactory>[] };

      beforeEach(async () => {
        const organization = {
          id: organizationId,
          name: 'Test Org',
          slug: 'test-org',
        };
        const user = {
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hash',
          active: true,
          memberships: [
            {
              userId,
              organizationId,
              role: 'member' as const,
            },
          ],
        };
        const space: Space = {
          id: spaceId,
          name: 'Test Space',
          slug: 'test-space',
          organizationId,
        };

        const commandInSpace = commandFactory({ spaceId });

        accountsAdapter.getOrganizationById.mockResolvedValue(organization);
        accountsAdapter.getUserById.mockResolvedValue(user);
        spacesPort.getSpaceById.mockResolvedValue(space);
        commandService.listCommandsBySpace.mockResolvedValue([commandInSpace]);

        result = await usecase.execute({
          userId,
          organizationId,
          spaceId,
        });
      });

      it('returns recipes without duplicates', () => {
        expect(result.recipes).toHaveLength(1);
      });

      it('contains unique recipe ids', () => {
        const recipeIds = result.recipes.map((r) => r.id);
        const uniqueCommandIds = new Set(recipeIds);
        expect(recipeIds.length).toBe(uniqueCommandIds.size);
      });
    });

    describe('when user is not found', () => {
      it('throws User not found error', async () => {
        const organizationId = createOrganizationId('org-1');
        const spaceId = createSpaceId('space-1');
        const userId = createUserId('user-1');

        accountsAdapter.getUserById.mockResolvedValue(null);

        await expect(
          usecase.execute({
            userId,
            organizationId,
            spaceId,
          }),
        ).rejects.toThrow('User not found');
      });
    });

    describe('when organization is not found', () => {
      it('throws an error', async () => {
        const organizationId = createOrganizationId('org-1');
        const spaceId = createSpaceId('space-1');
        const userId = createUserId('user-1');

        const user = {
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hash',
          active: true,
          memberships: [
            {
              userId,
              organizationId,
              role: 'member' as const,
            },
          ],
        };

        accountsAdapter.getUserById.mockResolvedValue(user);
        accountsAdapter.getOrganizationById.mockResolvedValue(null);

        await expect(
          usecase.execute({
            userId,
            organizationId,
            spaceId,
          }),
        ).rejects.toThrow();
      });
    });

    describe('when space is not found', () => {
      it('throws Space not found error', async () => {
        const organizationId = createOrganizationId('org-1');
        const spaceId = createSpaceId('space-1');
        const userId = createUserId('user-1');

        const organization = {
          id: organizationId,
          name: 'Test Org',
          slug: 'test-org',
        };
        const user = {
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hash',
          active: true,
          memberships: [
            {
              userId,
              organizationId,
              role: 'member' as const,
            },
          ],
        };

        accountsAdapter.getOrganizationById.mockResolvedValue(organization);
        accountsAdapter.getUserById.mockResolvedValue(user);
        spacesPort.getSpaceById.mockResolvedValue(null);

        await expect(
          usecase.execute({
            userId,
            organizationId,
            spaceId,
          }),
        ).rejects.toThrow(`Space with id ${spaceId} not found`);
      });
    });

    describe('when space does not belong to organization', () => {
      it('throws Space does not belong to organization error', async () => {
        const organizationId = createOrganizationId('org-1');
        const differentOrgId = createOrganizationId('org-2');
        const spaceId = createSpaceId('space-1');
        const userId = createUserId('user-1');

        const organization = {
          id: organizationId,
          name: 'Test Org',
          slug: 'test-org',
        };
        const user = {
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hash',
          active: true,
          memberships: [
            {
              userId,
              organizationId,
              role: 'member' as const,
            },
          ],
        };
        const space: Space = {
          id: spaceId,
          name: 'Test Space',
          organizationId: differentOrgId,
          slug: 'test-space',
        };

        accountsAdapter.getOrganizationById.mockResolvedValue(organization);
        accountsAdapter.getUserById.mockResolvedValue(user);
        spacesPort.getSpaceById.mockResolvedValue(space);

        await expect(
          usecase.execute({
            userId,
            organizationId,
            spaceId,
          }),
        ).rejects.toThrow(
          `Space ${spaceId} does not belong to organization ${organizationId}`,
        );
      });
    });

    describe('when the user is not a member of the space', () => {
      beforeEach(() => {
        spacesPort.findMembership.mockResolvedValue(null);
      });

      it('throws a SpaceMembershipRequiredError', async () => {
        const organizationId = createOrganizationId('org-1');
        const spaceId = createSpaceId('space-1');
        const userId = createUserId('user-1');

        const organization = {
          id: organizationId,
          name: 'Test Org',
          slug: 'test-org',
        };
        const user = {
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hash',
          active: true,
          memberships: [
            {
              userId,
              organizationId,
              role: 'member' as const,
            },
          ],
        };
        const space: Space = {
          id: spaceId,
          name: 'Test Space',
          slug: 'test-space',
          organizationId,
        };

        accountsAdapter.getOrganizationById.mockResolvedValue(organization);
        accountsAdapter.getUserById.mockResolvedValue(user);
        spacesPort.getSpaceById.mockResolvedValue(space);

        await expect(
          usecase.execute({
            userId,
            organizationId,
            spaceId,
          }),
        ).rejects.toThrow(SpaceMembershipRequiredError);
      });
    });

    describe('when includeDeleted is true', () => {
      const organizationId = createOrganizationId('org-1');
      const spaceId = createSpaceId('space-1');
      const userId = createUserId('user-1');
      let spaceCommands: ReturnType<typeof commandFactory>[];
      let result: { recipes: ReturnType<typeof commandFactory>[] };

      beforeEach(async () => {
        const organization = {
          id: organizationId,
          name: 'Test Org',
          slug: 'test-org',
        };
        const user = {
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hash',
          active: true,
          memberships: [
            {
              userId,
              organizationId,
              role: 'member' as const,
            },
          ],
        };
        const space: Space = {
          id: spaceId,
          name: 'Test Space',
          slug: 'test-space',
          organizationId,
        };

        spaceCommands = [
          commandFactory({ spaceId }),
          commandFactory({ spaceId }),
        ];

        accountsAdapter.getOrganizationById.mockResolvedValue(organization);
        accountsAdapter.getUserById.mockResolvedValue(user);
        spacesPort.getSpaceById.mockResolvedValue(space);
        commandService.listCommandsBySpace.mockResolvedValue(spaceCommands);

        result = await usecase.execute({
          userId,
          organizationId,
          spaceId,
          includeDeleted: true,
        });
      });

      it('passes includeDeleted option to service', () => {
        expect(commandService.listCommandsBySpace).toHaveBeenCalledWith(
          spaceId,
          {
            includeDeleted: true,
          },
        );
      });

      it('returns the recipes from the space', () => {
        expect(result.recipes).toEqual(spaceCommands);
      });
    });
  });
});
