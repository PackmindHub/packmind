import { GetRecipeByIdUsecase } from './getRecipeById.usecase';
import { RecipeService } from '../../services/RecipeService';
import { recipeFactory } from '../../../../test/recipeFactory';
import {
  IAccountsPort,
  ISpacesPort,
  Space,
  createRecipeId,
  createSpaceId,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';

describe('GetRecipeByIdUsecase', () => {
  let usecase: GetRecipeByIdUsecase;
  let recipeService: jest.Mocked<RecipeService>;
  let accountsAdapter: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;

  beforeEach(() => {
    recipeService = {
      getRecipeById: jest.fn(),
    } as unknown as jest.Mocked<RecipeService>;

    accountsAdapter = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    spacesPort = {
      getSpaceById: jest.fn(),
    } as unknown as jest.Mocked<ISpacesPort>;

    usecase = new GetRecipeByIdUsecase(
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
    describe('when request is valid', () => {
      const organizationId = createOrganizationId('org-1');
      const spaceId = createSpaceId('space-1');
      const userId = createUserId('user-1');
      const recipeId = createRecipeId('recipe-1');

      let organization: {
        id: typeof organizationId;
        name: string;
        slug: string;
      };
      let user: {
        id: typeof userId;
        email: string;
        passwordHash: string;
        active: boolean;
        memberships: {
          userId: typeof userId;
          organizationId: typeof organizationId;
          role: 'member';
        }[];
      };
      let space: Space;
      let recipe: ReturnType<typeof recipeFactory>;
      let result: { recipe: ReturnType<typeof recipeFactory> | null };

      beforeEach(async () => {
        organization = {
          id: organizationId,
          name: 'Test Org',
          slug: 'test-org',
        };
        user = {
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
        space = {
          id: spaceId,
          name: 'Test Space',
          slug: 'test-space',
          organizationId,
        };
        recipe = recipeFactory({
          id: recipeId,
          spaceId: createSpaceId('space-1'),
        });

        accountsAdapter.getOrganizationById.mockResolvedValue(organization);
        accountsAdapter.getUserById.mockResolvedValue(user);
        spacesPort.getSpaceById.mockResolvedValue(space);
        recipeService.getRecipeById.mockResolvedValue(recipe);

        result = await usecase.execute({
          userId,
          organizationId,
          spaceId,
          recipeId,
        });
      });

      it('fetches organization by id', () => {
        expect(accountsAdapter.getOrganizationById).toHaveBeenCalledWith(
          organizationId,
        );
      });

      it('fetches user by id', () => {
        expect(accountsAdapter.getUserById).toHaveBeenCalledWith(userId);
      });

      it('fetches space by id', () => {
        expect(spacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
      });

      it('fetches recipe by id', () => {
        expect(recipeService.getRecipeById).toHaveBeenCalledWith(recipeId);
      });

      it('returns the recipe', () => {
        expect(result.recipe).toEqual(recipe);
      });
    });

    describe('when recipe does not exist', () => {
      const organizationId = createOrganizationId('org-1');
      const spaceId = createSpaceId('space-1');
      const userId = createUserId('user-1');
      const recipeId = createRecipeId('recipe-1');

      let result: { recipe: ReturnType<typeof recipeFactory> | null };

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
        recipeService.getRecipeById.mockResolvedValue(null);

        result = await usecase.execute({
          userId,
          organizationId,
          spaceId,
          recipeId,
        });
      });

      it('fetches recipe by id', () => {
        expect(recipeService.getRecipeById).toHaveBeenCalledWith(recipeId);
      });

      it('returns null', () => {
        expect(result.recipe).toBeNull();
      });
    });

    describe('when user is not found', () => {
      it('throws error', async () => {
        const organizationId = createOrganizationId('org-1');
        const spaceId = createSpaceId('space-1');
        const userId = createUserId('user-1');
        const recipeId = createRecipeId('recipe-1');

        accountsAdapter.getUserById.mockResolvedValue(null);

        await expect(
          usecase.execute({
            userId,
            organizationId,
            spaceId,
            recipeId,
          }),
        ).rejects.toThrow('User not found');
      });
    });

    describe('when organization is not found', () => {
      it('throws error', async () => {
        const organizationId = createOrganizationId('org-1');
        const spaceId = createSpaceId('space-1');
        const userId = createUserId('user-1');
        const recipeId = createRecipeId('recipe-1');

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
            recipeId,
          }),
        ).rejects.toThrow();
      });
    });

    describe('when space is not found', () => {
      it('throws error', async () => {
        const organizationId = createOrganizationId('org-1');
        const spaceId = createSpaceId('space-1');
        const userId = createUserId('user-1');
        const recipeId = createRecipeId('recipe-1');

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
            recipeId,
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
        const recipeId = createRecipeId('recipe-1');

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
            recipeId,
          }),
        ).rejects.toThrow(
          `Space ${spaceId} does not belong to organization ${organizationId}`,
        );
      });
    });

    describe('when recipe does not belong to organization', () => {
      it('throws error', async () => {
        const organizationId = createOrganizationId('org-1');
        const spaceId = createSpaceId('space-1');
        const userId = createUserId('user-1');
        const recipeId = createRecipeId('recipe-1');

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
        // Space belongs to the correct organization
        const space: Space = {
          id: spaceId,
          name: 'Test Space',
          slug: 'test-space',
          organizationId,
        };
        // But recipe's spaceId doesn't match the requested spaceId
        const differentSpaceId = createSpaceId('space-2');
        const recipe = recipeFactory({
          id: recipeId,
          spaceId: differentSpaceId,
        });

        accountsAdapter.getOrganizationById.mockResolvedValue(organization);
        accountsAdapter.getUserById.mockResolvedValue(user);
        spacesPort.getSpaceById.mockResolvedValue(space);
        recipeService.getRecipeById.mockResolvedValue(recipe);

        await expect(
          usecase.execute({
            userId,
            organizationId,
            spaceId,
            recipeId,
          }),
        ).rejects.toThrow(
          `Recipe ${recipeId} does not belong to space ${spaceId}`,
        );
      });
    });

    describe('when recipe does not belong to space', () => {
      it('throws error for recipe with different spaceId', async () => {
        const organizationId = createOrganizationId('org-1');
        const spaceId = createSpaceId('space-1');
        const differentSpaceId = createSpaceId('space-2');
        const userId = createUserId('user-1');
        const recipeId = createRecipeId('recipe-1');

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
        const recipe = recipeFactory({
          id: recipeId,
          spaceId: differentSpaceId,
        });

        accountsAdapter.getOrganizationById.mockResolvedValue(organization);
        accountsAdapter.getUserById.mockResolvedValue(user);
        spacesPort.getSpaceById.mockResolvedValue(space);
        recipeService.getRecipeById.mockResolvedValue(recipe);

        await expect(
          usecase.execute({
            userId,
            organizationId,
            spaceId,
            recipeId,
          }),
        ).rejects.toThrow(
          `Recipe ${recipeId} does not belong to space ${spaceId}`,
        );
      });
    });

    it('returns recipe with matching spaceId', async () => {
      const organizationId = createOrganizationId('org-1');
      const spaceId = createSpaceId('space-1');
      const userId = createUserId('user-1');
      const recipeId = createRecipeId('recipe-1');

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
      const recipe = recipeFactory({
        id: recipeId,
        spaceId,
      });

      accountsAdapter.getOrganizationById.mockResolvedValue(organization);
      accountsAdapter.getUserById.mockResolvedValue(user);
      spacesPort.getSpaceById.mockResolvedValue(space);
      recipeService.getRecipeById.mockResolvedValue(recipe);

      const result = await usecase.execute({
        userId,
        organizationId,
        spaceId,
        recipeId,
      });

      expect(result.recipe).toEqual(recipe);
    });

    it('returns organization-level recipe (null spaceId)', async () => {
      const organizationId = createOrganizationId('org-1');
      const spaceId = createSpaceId('space-1');
      const userId = createUserId('user-1');
      const recipeId = createRecipeId('recipe-1');

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
      const recipe = recipeFactory({
        id: recipeId,
        spaceId: createSpaceId('space-1'),
      });

      accountsAdapter.getOrganizationById.mockResolvedValue(organization);
      accountsAdapter.getUserById.mockResolvedValue(user);
      spacesPort.getSpaceById.mockResolvedValue(space);
      recipeService.getRecipeById.mockResolvedValue(recipe);

      const result = await usecase.execute({
        userId,
        organizationId,
        spaceId,
        recipeId,
      });

      expect(result.recipe).toEqual(recipe);
    });
  });

  describe('getRecipeById (legacy internal method)', () => {
    describe('when recipe exists', () => {
      const recipeId = createRecipeId('recipe-1');
      let recipe: ReturnType<typeof recipeFactory>;
      let result: ReturnType<typeof recipeFactory> | null;

      beforeEach(async () => {
        recipe = recipeFactory({ id: recipeId });
        recipeService.getRecipeById.mockResolvedValue(recipe);
        result = await usecase.getRecipeById(recipeId);
      });

      it('returns the recipe', () => {
        expect(result).toEqual(recipe);
      });

      it('fetches recipe by id', () => {
        expect(recipeService.getRecipeById).toHaveBeenCalledWith(recipeId);
      });
    });

    describe('when recipe does not exist', () => {
      it('returns null', async () => {
        const recipeId = createRecipeId('recipe-1');

        recipeService.getRecipeById.mockResolvedValue(null);

        const result = await usecase.getRecipeById(recipeId);

        expect(result).toBeNull();
      });
    });
  });
});
