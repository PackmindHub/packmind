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
    it('returns recipes from space and organization-level recipes', async () => {
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

      const spaceRecipes = [
        recipeFactory({ spaceId }),
        recipeFactory({ spaceId }),
      ];
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

      const result = await usecase.execute({
        userId,
        organizationId,
        spaceId,
      });

      expect(recipeService.listRecipesBySpace).toHaveBeenCalledWith(spaceId);
      // listRecipesByOrganization is no longer called - recipes are space-specific only
      expect(recipeService.listRecipesByOrganization).not.toHaveBeenCalled();

      expect(result.recipes).toHaveLength(2);
      expect(result.recipes).toContainEqual(spaceRecipes[0]);
      expect(result.recipes).toContainEqual(spaceRecipes[1]);
    });

    it('returns empty array for organization with no recipes', async () => {
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
      recipeService.listRecipesBySpace.mockResolvedValue([]);
      recipeService.listRecipesByOrganization.mockResolvedValue([]);

      const result = await usecase.execute({
        userId,
        organizationId,
        spaceId,
      });

      expect(recipeService.listRecipesBySpace).toHaveBeenCalledWith(spaceId);
      // listRecipesByOrganization is no longer called - recipes are space-specific only
      expect(recipeService.listRecipesByOrganization).not.toHaveBeenCalled();
      expect(result.recipes).toEqual([]);
    });

    it('includes only organization-level recipes without spaceId', async () => {
      const organizationId = createOrganizationId('org-1');
      const spaceId = createSpaceId('space-1');
      const otherSpaceId = createSpaceId('space-2');
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

      const recipeInSpace = recipeFactory({ spaceId });
      const orgLevelRecipe = recipeFactory({
        spaceId: createSpaceId('space-1'),
      });
      const recipeInOtherSpace = recipeFactory({
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

      const result = await usecase.execute({
        userId,
        organizationId,
        spaceId,
      });

      expect(result.recipes).toHaveLength(1);
      expect(result.recipes).toContainEqual(recipeInSpace);
      expect(result.recipes).not.toContainEqual(orgLevelRecipe);
      expect(result.recipes).not.toContainEqual(recipeInOtherSpace);
    });

    it('deduplicates recipes correctly', async () => {
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

      const result = await usecase.execute({
        userId,
        organizationId,
        spaceId,
      });

      expect(result.recipes).toHaveLength(1);
      const recipeIds = result.recipes.map((r) => r.id);
      const uniqueRecipeIds = new Set(recipeIds);
      expect(recipeIds.length).toBe(uniqueRecipeIds.size);
    });

    describe('when user is not found', () => {
      it('throws error', async () => {
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
      it('throws error', async () => {
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
      it('throws error', async () => {
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
      it('throws error', async () => {
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

    describe('when SpacesPort is not available', () => {
      it('throws error', async () => {
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

        const usecaseWithoutSpacesPort = new ListRecipesBySpaceUsecase(
          accountsAdapter,
          recipeService,
          null,
          stubLogger(),
        );

        accountsAdapter.getOrganizationById.mockResolvedValue(organization);
        accountsAdapter.getUserById.mockResolvedValue(user);

        await expect(
          usecaseWithoutSpacesPort.execute({
            userId,
            organizationId,
            spaceId,
          }),
        ).rejects.toThrow('SpacesPort not available');
      });
    });
  });
});
