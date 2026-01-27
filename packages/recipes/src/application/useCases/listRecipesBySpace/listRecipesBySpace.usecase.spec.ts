import { ListRecipesBySpaceUsecase } from './listRecipesBySpace.usecase';
import { RecipeService } from '../../services/RecipeService';
import { recipeFactory } from '../../../../test/recipeFactory';
import {
  IAccountsPort,
  ISpacesPort,
  Space,
  createSpaceId,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';

describe('ListRecipesBySpaceUsecase', () => {
  let usecase: ListRecipesBySpaceUsecase;
  let recipeService: jest.Mocked<RecipeService>;
  let accountsAdapter: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;

  beforeEach(() => {
    recipeService = {
      listRecipesByOrganization: jest.fn(),
      listRecipesBySpace: jest.fn(),
    } as unknown as jest.Mocked<RecipeService>;

    accountsAdapter = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    spacesPort = {
      getSpaceById: jest.fn(),
    } as unknown as jest.Mocked<ISpacesPort>;

    usecase = new ListRecipesBySpaceUsecase(
      accountsAdapter,
      recipeService,
      spacesPort,
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
      let spaceRecipes: ReturnType<typeof recipeFactory>[];
      let result: { recipes: ReturnType<typeof recipeFactory>[] };

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

        spaceRecipes = [recipeFactory({ spaceId }), recipeFactory({ spaceId })];
        const orgLevelRecipe = recipeFactory({
          spaceId: createSpaceId('space-1'),
        });
        const organizationRecipes = [...spaceRecipes, orgLevelRecipe];

        accountsAdapter.getOrganizationById.mockResolvedValue(organization);
        accountsAdapter.getUserById.mockResolvedValue(user);
        spacesPort.getSpaceById.mockResolvedValue(space);
        recipeService.listRecipesBySpace.mockResolvedValue(spaceRecipes);
        recipeService.listRecipesByOrganization.mockResolvedValue(
          organizationRecipes,
        );

        result = await usecase.execute({
          userId,
          organizationId,
          spaceId,
        });
      });

      it('calls listRecipesBySpace with the space id', () => {
        expect(recipeService.listRecipesBySpace).toHaveBeenCalledWith(spaceId, {
          includeDeleted: undefined,
        });
      });

      it('does not call listRecipesByOrganization', () => {
        expect(recipeService.listRecipesByOrganization).not.toHaveBeenCalled();
      });

      it('returns the correct number of recipes', () => {
        expect(result.recipes).toHaveLength(2);
      });

      it('includes the first space recipe', () => {
        expect(result.recipes).toContainEqual(spaceRecipes[0]);
      });

      it('includes the second space recipe', () => {
        expect(result.recipes).toContainEqual(spaceRecipes[1]);
      });
    });

    describe('when organization has no recipes', () => {
      const organizationId = createOrganizationId('org-1');
      const spaceId = createSpaceId('space-1');
      const userId = createUserId('user-1');
      let result: { recipes: ReturnType<typeof recipeFactory>[] };

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
        recipeService.listRecipesBySpace.mockResolvedValue([]);
        recipeService.listRecipesByOrganization.mockResolvedValue([]);

        result = await usecase.execute({
          userId,
          organizationId,
          spaceId,
        });
      });

      it('calls listRecipesBySpace with the space id', () => {
        expect(recipeService.listRecipesBySpace).toHaveBeenCalledWith(spaceId, {
          includeDeleted: undefined,
        });
      });

      it('does not call listRecipesByOrganization', () => {
        expect(recipeService.listRecipesByOrganization).not.toHaveBeenCalled();
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
      let recipeInSpace: ReturnType<typeof recipeFactory>;
      let orgLevelRecipe: ReturnType<typeof recipeFactory>;
      let recipeInOtherSpace: ReturnType<typeof recipeFactory>;
      let result: { recipes: ReturnType<typeof recipeFactory>[] };

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

        recipeInSpace = recipeFactory({ spaceId });
        orgLevelRecipe = recipeFactory({
          spaceId: createSpaceId('space-1'),
        });
        recipeInOtherSpace = recipeFactory({
          spaceId: otherSpaceId,
        });

        accountsAdapter.getOrganizationById.mockResolvedValue(organization);
        accountsAdapter.getUserById.mockResolvedValue(user);
        spacesPort.getSpaceById.mockResolvedValue(space);
        recipeService.listRecipesBySpace.mockResolvedValue([recipeInSpace]);
        recipeService.listRecipesByOrganization.mockResolvedValue([
          recipeInSpace,
          orgLevelRecipe,
          recipeInOtherSpace,
        ]);

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
        expect(result.recipes).toContainEqual(recipeInSpace);
      });

      it('excludes org-level recipes', () => {
        expect(result.recipes).not.toContainEqual(orgLevelRecipe);
      });

      it('excludes recipes from other spaces', () => {
        expect(result.recipes).not.toContainEqual(recipeInOtherSpace);
      });
    });

    describe('when deduplicating recipes', () => {
      const organizationId = createOrganizationId('org-1');
      const spaceId = createSpaceId('space-1');
      const userId = createUserId('user-1');
      let result: { recipes: ReturnType<typeof recipeFactory>[] };

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

        const recipeInSpace = recipeFactory({ spaceId });
        const orgLevelRecipe = recipeFactory({
          spaceId: createSpaceId('space-1'),
        });

        accountsAdapter.getOrganizationById.mockResolvedValue(organization);
        accountsAdapter.getUserById.mockResolvedValue(user);
        spacesPort.getSpaceById.mockResolvedValue(space);
        recipeService.listRecipesBySpace.mockResolvedValue([recipeInSpace]);
        recipeService.listRecipesByOrganization.mockResolvedValue([
          recipeInSpace,
          orgLevelRecipe,
        ]);

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
        const uniqueRecipeIds = new Set(recipeIds);
        expect(recipeIds.length).toBe(uniqueRecipeIds.size);
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

    describe('when includeDeleted is true', () => {
      const organizationId = createOrganizationId('org-1');
      const spaceId = createSpaceId('space-1');
      const userId = createUserId('user-1');
      let spaceRecipes: ReturnType<typeof recipeFactory>[];
      let result: { recipes: ReturnType<typeof recipeFactory>[] };

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

        spaceRecipes = [recipeFactory({ spaceId }), recipeFactory({ spaceId })];

        accountsAdapter.getOrganizationById.mockResolvedValue(organization);
        accountsAdapter.getUserById.mockResolvedValue(user);
        spacesPort.getSpaceById.mockResolvedValue(space);
        recipeService.listRecipesBySpace.mockResolvedValue(spaceRecipes);

        result = await usecase.execute({
          userId,
          organizationId,
          spaceId,
          includeDeleted: true,
        });
      });

      it('passes includeDeleted option to service', () => {
        expect(recipeService.listRecipesBySpace).toHaveBeenCalledWith(spaceId, {
          includeDeleted: true,
        });
      });

      it('returns the recipes from the space', () => {
        expect(result.recipes).toEqual(spaceRecipes);
      });
    });
  });
});
