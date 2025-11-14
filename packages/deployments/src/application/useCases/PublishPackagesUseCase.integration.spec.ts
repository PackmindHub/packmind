import { PublishPackagesUseCase } from './PublishPackagesUseCase';
import { PackageService } from '../services/PackageService';
import {
  createUserId,
  createOrganizationId,
  createPackageId,
  createRecipeId,
  createStandardId,
  createTargetId,
  createStandardsDeploymentId,
  createRecipesDeploymentId,
  createStandardVersionId,
  createRecipeVersionId,
  PublishPackagesCommand,
  IRecipesPort,
  IStandardsPort,
  IDeploymentPort,
  StandardsDeployment,
  RecipesDeployment,
  DistributionStatus,
  PackagesDeployment,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { packageFactory } from '../../../test/packageFactory';
import { v4 as uuidv4 } from 'uuid';
import { stubLogger } from '@packmind/test-utils';

describe('PublishPackagesUseCase - Integration behavior', () => {
  let useCase: PublishPackagesUseCase;
  let mockRecipesPort: jest.Mocked<IRecipesPort>;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockDeploymentPort: jest.Mocked<IDeploymentPort>;
  let mockPackageService: jest.Mocked<PackageService>;
  let mockLogger: PackmindLogger;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const targetId = createTargetId(uuidv4());

  beforeEach(() => {
    mockLogger = stubLogger();

    mockRecipesPort = {
      listRecipeVersions: jest.fn(),
    } as unknown as jest.Mocked<IRecipesPort>;

    mockStandardsPort = {
      getLatestStandardVersion: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    mockDeploymentPort = {
      publishRecipes: jest.fn(),
      publishStandards: jest.fn(),
    } as unknown as jest.Mocked<IDeploymentPort>;

    mockPackageService = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<PackageService>;

    useCase = new PublishPackagesUseCase(
      mockRecipesPort,
      mockStandardsPort,
      mockDeploymentPort,
      mockPackageService,
      mockLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when deployments return with no_changes status', () => {
    it('returns deployments that can be analyzed by frontend notification utils', async () => {
      const recipeId = createRecipeId(uuidv4());
      const standardId = createStandardId(uuidv4());
      const packageId = createPackageId(uuidv4());

      const pkg = packageFactory({
        id: packageId,
        recipes: [recipeId],
        standards: [standardId],
      });

      // Mock a no_changes deployment (content already deployed)
      const standardsDeployment: Partial<StandardsDeployment> = {
        id: createStandardsDeploymentId(uuidv4()),
        status: DistributionStatus.no_changes,
        target: { id: targetId } as StandardsDeployment['target'],
      };

      const recipesDeployment: Partial<RecipesDeployment> = {
        id: createRecipesDeploymentId(uuidv4()),
        status: DistributionStatus.no_changes,
        target: { id: targetId } as RecipesDeployment['target'],
      };

      mockPackageService.findById.mockResolvedValue(pkg);
      mockRecipesPort.listRecipeVersions.mockResolvedValue([
        {
          id: createRecipeVersionId(uuidv4()),
          recipeId,
          version: 1,
        } as Awaited<ReturnType<IRecipesPort['listRecipeVersions']>>[0],
      ]);
      mockStandardsPort.getLatestStandardVersion.mockResolvedValue({
        id: createStandardVersionId(uuidv4()),
        standardId,
        version: 1,
      } as NonNullable<
        Awaited<ReturnType<IStandardsPort['getLatestStandardVersion']>>
      >);

      mockDeploymentPort.publishStandards.mockResolvedValue([
        standardsDeployment as StandardsDeployment,
      ]);
      mockDeploymentPort.publishRecipes.mockResolvedValue([
        recipesDeployment as RecipesDeployment,
      ]);

      const command: PublishPackagesCommand = {
        userId,
        organizationId,
        packageIds: [packageId],
        targetIds: [targetId],
      };

      const result = await useCase.execute(command);

      // Should return 2 deployments (1 standards, 1 recipes)
      expect(result).toHaveLength(2);

      // Both should have status no_changes
      expect(result[0]).toHaveProperty('status', DistributionStatus.no_changes);
      expect(result[1]).toHaveProperty('status', DistributionStatus.no_changes);

      // Both should have target property
      expect(result[0]).toHaveProperty('target');
      expect(result[1]).toHaveProperty('target');

      // This simulates what the frontend does:
      // It should be able to count deployments and analyze their status
      const allDeployments = result;
      const noChangesDeployments = allDeployments.filter(
        (d: PackagesDeployment) => d.status === DistributionStatus.no_changes,
      );

      expect(allDeployments.length).toBe(2);
      expect(noChangesDeployments.length).toBe(2);
    });
  });
});
