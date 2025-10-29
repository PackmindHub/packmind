import { GetRecipeByIdUsecase } from './getRecipeById.usecase';
import { RecipeService } from '../../services/RecipeService';
import { recipeFactory } from '../../../../test/recipeFactory';
import { createOrganizationId, createUserId } from '@packmind/accounts';
import { createSpaceId } from '@packmind/spaces';
import { createRecipeId } from '@packmind/shared';
import {
  UserProvider,
  OrganizationProvider,
  ISpacesPort,
  Space,
} from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';

describe('GetRecipeByIdUsecase', () => {
  let usecase: GetRecipeByIdUsecase;
  let recipeService: jest.Mocked<RecipeService>;
  let userProvider: jest.Mocked<UserProvider>;
  let organizationProvider: jest.Mocked<OrganizationProvider>;
  let spacesPort: jest.Mocked<ISpacesPort>;

  beforeEach(() => {
    recipeService = {
      getRecipeById: jest.fn(),
    } as unknown as jest.Mocked<RecipeService>;

    userProvider = {
      getUserById: jest.fn(),
    } as jest.Mocked<UserProvider>;

    organizationProvider = {
      getOrganizationById: jest.fn(),
    } as jest.Mocked<OrganizationProvider>;

    spacesPort = {
      getSpaceById: jest.fn(),
    } as unknown as jest.Mocked<ISpacesPort>;

    usecase = new GetRecipeByIdUsecase(
      userProvider,
      organizationProvider,
      recipeService,
      spacesPort,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeForMembers', () => {
    it('returns recipe for valid request', async () => {
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

      organizationProvider.getOrganizationById.mockResolvedValue(organization);
      userProvider.getUserById.mockResolvedValue(user);
      spacesPort.getSpaceById.mockResolvedValue(space);
      recipeService.getRecipeById.mockResolvedValue(recipe);

      const result = await usecase.execute({
        userId,
        organizationId,
        spaceId,
        recipeId,
      });

      expect(organizationProvider.getOrganizationById).toHaveBeenCalledWith(
        organizationId,
      );
      expect(userProvider.getUserById).toHaveBeenCalledWith(userId);
      expect(spacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
      expect(recipeService.getRecipeById).toHaveBeenCalledWith(recipeId);

      expect(result.recipe).toEqual(recipe);
    });

    it('returns null for non-existent recipe', async () => {
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

      organizationProvider.getOrganizationById.mockResolvedValue(organization);
      userProvider.getUserById.mockResolvedValue(user);
      spacesPort.getSpaceById.mockResolvedValue(space);
      recipeService.getRecipeById.mockResolvedValue(null);

      const result = await usecase.execute({
        userId,
        organizationId,
        spaceId,
        recipeId,
      });

      expect(recipeService.getRecipeById).toHaveBeenCalledWith(recipeId);
      expect(result.recipe).toBeNull();
    });

    describe('when user is not found', () => {
      it('throws error', async () => {
        const organizationId = createOrganizationId('org-1');
        const spaceId = createSpaceId('space-1');
        const userId = createUserId('user-1');
        const recipeId = createRecipeId('recipe-1');

        userProvider.getUserById.mockResolvedValue(null);

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

        userProvider.getUserById.mockResolvedValue(user);
        organizationProvider.getOrganizationById.mockResolvedValue(null);

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

        organizationProvider.getOrganizationById.mockResolvedValue(
          organization,
        );
        userProvider.getUserById.mockResolvedValue(user);
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

        organizationProvider.getOrganizationById.mockResolvedValue(
          organization,
        );
        userProvider.getUserById.mockResolvedValue(user);
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

        organizationProvider.getOrganizationById.mockResolvedValue(
          organization,
        );
        userProvider.getUserById.mockResolvedValue(user);
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

        organizationProvider.getOrganizationById.mockResolvedValue(
          organization,
        );
        userProvider.getUserById.mockResolvedValue(user);
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

      organizationProvider.getOrganizationById.mockResolvedValue(organization);
      userProvider.getUserById.mockResolvedValue(user);
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

      organizationProvider.getOrganizationById.mockResolvedValue(organization);
      userProvider.getUserById.mockResolvedValue(user);
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

    describe('when SpacesPort is not available', () => {
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

        const usecaseWithoutSpacesPort = new GetRecipeByIdUsecase(
          userProvider,
          organizationProvider,
          recipeService,
          null,
          stubLogger(),
        );

        organizationProvider.getOrganizationById.mockResolvedValue(
          organization,
        );
        userProvider.getUserById.mockResolvedValue(user);

        await expect(
          usecaseWithoutSpacesPort.execute({
            userId,
            organizationId,
            spaceId,
            recipeId,
          }),
        ).rejects.toThrow('SpacesPort not available');
      });
    });
  });

  describe('getRecipeById (legacy internal method)', () => {
    it('returns recipe without access control', async () => {
      const recipeId = createRecipeId('recipe-1');
      const recipe = recipeFactory({ id: recipeId });

      recipeService.getRecipeById.mockResolvedValue(recipe);

      const result = await usecase.getRecipeById(recipeId);

      expect(result).toEqual(recipe);
      expect(recipeService.getRecipeById).toHaveBeenCalledWith(recipeId);
    });

    it('returns null for non-existent recipe', async () => {
      const recipeId = createRecipeId('recipe-1');

      recipeService.getRecipeById.mockResolvedValue(null);

      const result = await usecase.getRecipeById(recipeId);

      expect(result).toBeNull();
    });
  });
});
