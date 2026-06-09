import { stubLogger } from '@packmind/test-utils';
import {
  IRecipesPort,
  ISkillsPort,
  IStandardsPort,
  Package,
  createPackageId,
  createRecipeId,
  createSkillId,
  createStandardId,
} from '@packmind/types';
import { PackageVersionFingerprintService } from './PackageVersionFingerprintService';

describe('PackageVersionFingerprintService', () => {
  const recipeIdA = createRecipeId('recipe-a');
  const recipeIdB = createRecipeId('recipe-b');
  const standardId = createStandardId('standard-a');
  const skillId = createSkillId('skill-a');

  const pkg = {
    id: createPackageId('pkg-1'),
    recipes: [recipeIdA, recipeIdB],
    standards: [standardId],
    skills: [skillId],
  } as unknown as Package;

  let mockRecipesPort: jest.Mocked<IRecipesPort>;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockSkillsPort: jest.Mocked<ISkillsPort>;
  let service: PackageVersionFingerprintService;

  beforeEach(() => {
    mockRecipesPort = {
      listRecipeVersions: jest.fn().mockImplementation(async (id) => {
        if (id === recipeIdA) {
          return [{ version: 1 }, { version: 3 }, { version: 2 }];
        }
        return [{ version: 5 }];
      }),
    } as unknown as jest.Mocked<IRecipesPort>;

    mockStandardsPort = {
      getLatestStandardVersion: jest.fn().mockResolvedValue({ version: 7 }),
    } as unknown as jest.Mocked<IStandardsPort>;

    mockSkillsPort = {
      getLatestSkillVersion: jest.fn().mockResolvedValue({ version: 4 }),
    } as unknown as jest.Mocked<ISkillsPort>;

    service = new PackageVersionFingerprintService(
      mockRecipesPort,
      mockStandardsPort,
      mockSkillsPort,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when computing the fingerprint of a package', () => {
    it('picks the highest recipe version when multiple exist', async () => {
      const result = await service.compute(pkg);
      expect(result.recipes[recipeIdA]).toBe(3);
    });

    it('records each recipe latest version', async () => {
      const result = await service.compute(pkg);
      expect(result.recipes[recipeIdB]).toBe(5);
    });

    it('records the latest standard version', async () => {
      const result = await service.compute(pkg);
      expect(result.standards[standardId]).toBe(7);
    });

    it('records the latest skill version', async () => {
      const result = await service.compute(pkg);
      expect(result.skills[skillId]).toBe(4);
    });
  });

  describe('when an artifact has no version', () => {
    it('records 0 for a standard with no latest version', async () => {
      mockStandardsPort.getLatestStandardVersion.mockResolvedValue(null);
      const result = await service.compute(pkg);
      expect(result.standards[standardId]).toBe(0);
    });
  });
});
