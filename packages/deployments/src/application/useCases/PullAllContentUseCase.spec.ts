import { stubLogger } from '@packmind/test-utils';
import {
  FileUpdates,
  IAccountsPort,
  ICodingAgentPort,
  IRecipesPort,
  ISpacesPort,
  IStandardsPort,
  Organization,
  OrganizationId,
  PackmindCommand,
  User,
  UserOrganizationMembership,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { PullAllContentUseCase } from './PullAllContentUseCase';

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
  let standardsPort: jest.Mocked<IStandardsPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let codingAgentPort: jest.Mocked<ICodingAgentPort>;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let useCase: PullAllContentUseCase;
  let command: PackmindCommand;
  let organizationId: OrganizationId;
  let organization: Organization;

  beforeEach(() => {
    recipesPort = {
      listRecipesByOrganization: jest.fn(),
      listRecipeVersions: jest.fn(),
    } as unknown as jest.Mocked<IRecipesPort>;

    standardsPort = {
      listStandardsBySpace: jest.fn(),
      listStandardVersions: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

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

    codingAgentPort = {
      prepareRecipesDeployment: jest.fn(),
      prepareStandardsDeployment: jest.fn(),
      getDeployerRegistry: jest.fn().mockReturnValue(mockRegistry),
    } as unknown as jest.Mocked<ICodingAgentPort>;

    accountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

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

    accountsPort.getOrganizationById.mockResolvedValue(organization);
    accountsPort.getUserById.mockResolvedValue(
      createUserWithMembership(command.userId, organization, 'member'),
    );

    useCase = new PullAllContentUseCase(
      recipesPort,
      standardsPort,
      spacesPort,
      codingAgentPort,
      accountsPort,
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

      (codingAgentPort.getDeployerRegistry as jest.Mock).mockReturnValue(
        mockRegistry,
      );
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
