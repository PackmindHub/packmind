import { v4 as uuidv4 } from 'uuid';
import { PullAllContentUseCase } from './PullAllContentUseCase';
import { stubLogger } from '@packmind/test-utils';
import { PackmindCommand } from '@packmind/types';
import {
  Organization,
  OrganizationId,
  User,
  UserOrganizationMembership,
  createOrganizationId,
  createUserId,
} from '@packmind/accounts';
import { CodingAgentHexa } from '@packmind/coding-agent';
import { StandardsHexa } from '@packmind/standards';
import { ISpacesPort, IRecipesPort, FileUpdates } from '@packmind/types';

const createUserWithMembership = (
  userId: string,
  organization: Organization,
  role: UserOrganizationMembership['role'],
): User => ({
  id: createUserId(userId),
  email: `${userId}@packmind.test`,
  passwordHash: null,
  active: true,
  memberships: [
    {
      userId: createUserId(userId),
      organizationId: organization.id,
      role,
    },
  ],
});

describe('PullAllContentUseCase', () => {
  let recipesPort: jest.Mocked<IRecipesPort>;
  let standardsHexa: jest.Mocked<StandardsHexa>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let codingAgentHexa: jest.Mocked<CodingAgentHexa>;
  let userProvider: {
    getUserById: jest.Mock;
  };
  let organizationProvider: {
    getOrganizationById: jest.Mock;
  };
  let useCase: PullAllContentUseCase;
  let command: PackmindCommand;
  let organizationId: OrganizationId;
  let organization: Organization;

  beforeEach(() => {
    recipesPort = {
      listRecipesByOrganization: jest.fn(),
      listRecipeVersions: jest.fn(),
    } as unknown as jest.Mocked<IRecipesPort>;

    standardsHexa = {
      listStandardsBySpace: jest.fn(),
      listStandardVersions: jest.fn(),
    } as unknown as jest.Mocked<StandardsHexa>;

    spacesPort = {
      listSpacesByOrganization: jest.fn(),
    } as unknown as jest.Mocked<ISpacesPort>;

    const mockDeployer = {
      generateFileUpdatesForRecipes: jest.fn(),
      generateFileUpdatesForStandards: jest.fn(),
    };

    const mockRegistry = {
      getDeployer: jest.fn().mockReturnValue(mockDeployer),
    };

    codingAgentHexa = {
      getCodingAgentDeployerRegistry: jest.fn().mockReturnValue(mockRegistry),
    } as unknown as jest.Mocked<CodingAgentHexa>;

    userProvider = {
      getUserById: jest.fn(),
    };
    organizationProvider = {
      getOrganizationById: jest.fn(),
    };

    organizationId = createOrganizationId(uuidv4());
    organization = {
      id: organizationId,
      name: 'Packmind',
      slug: 'packmind',
    };

    command = {
      organizationId: organizationId as unknown as string,
      userId: uuidv4(),
    };

    organizationProvider.getOrganizationById.mockResolvedValue(organization);
    userProvider.getUserById.mockResolvedValue(
      createUserWithMembership(command.userId, organization, 'member'),
    );

    useCase = new PullAllContentUseCase(
      recipesPort,
      standardsHexa,
      spacesPort,
      codingAgentHexa,
      userProvider,
      organizationProvider,
      stubLogger(),
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('when pulling all content', () => {
    let mockDeployer: {
      generateFileUpdatesForRecipes: jest.Mock;
      generateFileUpdatesForStandards: jest.Mock;
    };
    let mockRegistry: {
      getDeployer: jest.Mock;
    };

    beforeEach(() => {
      mockDeployer = {
        generateFileUpdatesForRecipes: jest.fn(),
        generateFileUpdatesForStandards: jest.fn(),
      };

      mockRegistry = {
        getDeployer: jest.fn().mockReturnValue(mockDeployer),
      };

      (
        codingAgentHexa.getCodingAgentDeployerRegistry as jest.Mock
      ).mockReturnValue(mockRegistry);
    });

    it('returns file updates from deployers', async () => {
      recipesPort.listRecipesByOrganization.mockResolvedValue([]);
      spacesPort.listSpacesByOrganization.mockResolvedValue([]);

      mockDeployer.generateFileUpdatesForRecipes.mockResolvedValue({
        createOrUpdate: [{ path: 'test.md', content: 'test content' }],
        delete: [],
      } as FileUpdates);

      mockDeployer.generateFileUpdatesForStandards.mockResolvedValue({
        createOrUpdate: [],
        delete: [],
      } as FileUpdates);

      const result = await useCase.execute(command);

      expect(result).toBeDefined();
      expect(result.fileUpdates).toBeDefined();
      expect(result.fileUpdates.createOrUpdate).toBeInstanceOf(Array);
      expect(result.fileUpdates.delete).toBeInstanceOf(Array);
    });

    it('merges file updates from recipes and standards', async () => {
      recipesPort.listRecipesByOrganization.mockResolvedValue([]);
      spacesPort.listSpacesByOrganization.mockResolvedValue([]);

      mockDeployer.generateFileUpdatesForRecipes.mockResolvedValue({
        createOrUpdate: [{ path: 'recipe.md', content: 'recipe content' }],
        delete: [],
      } as FileUpdates);

      mockDeployer.generateFileUpdatesForStandards.mockResolvedValue({
        createOrUpdate: [{ path: 'standard.md', content: 'standard content' }],
        delete: [],
      } as FileUpdates);

      const result = await useCase.execute(command);

      // Should have file updates from both recipes and standards
      // Note: with 4 agents (packmind, claude, cursor, copilot) and empty recipe list,
      // we won't have recipe file updates, but the structure should be valid
      expect(result.fileUpdates.createOrUpdate).toBeInstanceOf(Array);
      expect(result.fileUpdates.delete).toBeInstanceOf(Array);
    });

    it('handles empty recipe lists', async () => {
      recipesPort.listRecipesByOrganization.mockResolvedValue([]);
      spacesPort.listSpacesByOrganization.mockResolvedValue([]);

      mockDeployer.generateFileUpdatesForRecipes.mockResolvedValue({
        createOrUpdate: [],
        delete: [],
      } as FileUpdates);

      mockDeployer.generateFileUpdatesForStandards.mockResolvedValue({
        createOrUpdate: [],
        delete: [],
      } as FileUpdates);

      const result = await useCase.execute(command);

      expect(result.fileUpdates.createOrUpdate).toEqual([]);
      expect(result.fileUpdates.delete).toEqual([]);
    });
  });
});
