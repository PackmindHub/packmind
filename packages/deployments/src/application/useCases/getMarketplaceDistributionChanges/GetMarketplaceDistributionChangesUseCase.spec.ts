import { v4 as uuidv4 } from 'uuid';
import { stubLogger } from '@packmind/test-utils';
import {
  createMarketplaceDistributionId,
  createMarketplaceId,
  createOrganizationId,
  createPackageId,
  createRecipeId,
  createSkillId,
  createStandardId,
  createUserId,
  DistributionStatus,
  IAccountsPort,
  IRecipesPort,
  ISkillsPort,
  IStandardsPort,
  Marketplace,
  MarketplaceDistribution,
  MarketplaceNotFoundError,
  Organization,
  Package,
  Recipe,
  Skill,
  Standard,
  User,
  VersionFingerprint,
} from '@packmind/types';
import { IMarketplaceRepository } from '../../../domain/repositories/IMarketplaceRepository';
import { IMarketplaceDistributionRepository } from '../../../domain/repositories/IMarketplaceDistributionRepository';
import { PackageService } from '../../services/PackageService';
import { PackageVersionFingerprintService } from '../../services/PackageVersionFingerprintService';
import { GetMarketplaceDistributionChangesUseCase } from './GetMarketplaceDistributionChangesUseCase';

describe('GetMarketplaceDistributionChangesUseCase', () => {
  const organizationId = createOrganizationId(uuidv4());
  const otherOrganizationId = createOrganizationId(uuidv4());
  const userId = createUserId(uuidv4());
  const marketplaceId = createMarketplaceId(uuidv4());
  const otherMarketplaceId = createMarketplaceId(uuidv4());
  const distributionId = createMarketplaceDistributionId(uuidv4());
  const packageId = createPackageId(uuidv4());

  const recipeStableId = createRecipeId(uuidv4());
  const recipeUpdatedId = createRecipeId(uuidv4());
  const recipeAddedId = createRecipeId(uuidv4());
  const recipeRemovedId = createRecipeId(uuidv4());
  const standardUpdatedId = createStandardId(uuidv4());
  const skillRemovedId = createSkillId(uuidv4());

  const existingMarketplace = {
    id: marketplaceId,
    organizationId,
    name: 'ACME Plugins',
  } as unknown as Marketplace;

  const memberUser = {
    id: userId,
    email: 'admin@example.com',
    displayName: 'Author Person',
    passwordHash: null,
    active: true,
    memberships: [{ userId, organizationId, role: 'member' as const }],
    trial: false,
  } as unknown as User;

  const organization: Organization = {
    id: organizationId,
    name: 'Test Org',
    slug: 'test-org',
  };

  const publishedFingerprint: VersionFingerprint = {
    recipes: {
      [recipeStableId]: 3,
      [recipeUpdatedId]: 1,
      [recipeRemovedId]: 2,
    },
    standards: {
      [standardUpdatedId]: 4,
    },
    skills: {
      [skillRemovedId]: 1,
    },
  };

  const currentFingerprint: VersionFingerprint = {
    recipes: {
      [recipeStableId]: 3,
      [recipeUpdatedId]: 2,
      [recipeAddedId]: 1,
    },
    standards: {
      [standardUpdatedId]: 5,
    },
    skills: {},
  };

  const baseDistribution = {
    id: distributionId,
    organizationId,
    marketplaceId,
    packageId,
    pluginSlug: 'my-plugin',
    authorId: userId,
    status: DistributionStatus.success,
    source: 'app',
    versionFingerprint: publishedFingerprint,
  } as unknown as MarketplaceDistribution;

  const sourcePackage = {
    id: packageId,
    name: 'My Package',
    slug: 'my-package',
  } as unknown as Package;

  let mockMarketplaceRepository: jest.Mocked<IMarketplaceRepository>;
  let mockMarketplaceDistributionRepository: jest.Mocked<IMarketplaceDistributionRepository>;
  let mockPackageService: jest.Mocked<PackageService>;
  let mockFingerprintService: jest.Mocked<PackageVersionFingerprintService>;
  let mockRecipesPort: jest.Mocked<IRecipesPort>;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockSkillsPort: jest.Mocked<ISkillsPort>;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let useCase: GetMarketplaceDistributionChangesUseCase;

  beforeEach(() => {
    mockMarketplaceRepository = {
      findByOrganizationAndId: jest.fn().mockResolvedValue(existingMarketplace),
    } as unknown as jest.Mocked<IMarketplaceRepository>;

    mockMarketplaceDistributionRepository = {
      findById: jest.fn().mockResolvedValue(baseDistribution),
      findSuccessfulByMarketplaceId: jest
        .fn()
        .mockResolvedValue([baseDistribution]),
    } as unknown as jest.Mocked<IMarketplaceDistributionRepository>;

    mockPackageService = {
      findById: jest.fn().mockResolvedValue(sourcePackage),
    } as unknown as jest.Mocked<PackageService>;

    mockFingerprintService = {
      compute: jest.fn().mockResolvedValue(currentFingerprint),
    } as unknown as jest.Mocked<PackageVersionFingerprintService>;

    mockRecipesPort = {
      getRecipeByIdInternal: jest.fn(async (id) => {
        const map: Record<string, Recipe> = {
          [recipeUpdatedId]: {
            name: 'Format Code',
            slug: 'format-code',
          } as unknown as Recipe,
          [recipeAddedId]: {
            name: 'Lint Strict',
            slug: 'lint-strict',
          } as unknown as Recipe,
          [recipeRemovedId]: {
            name: 'Legacy Recipe',
            slug: 'legacy-recipe',
          } as unknown as Recipe,
        };
        return map[id as string] ?? null;
      }),
    } as unknown as jest.Mocked<IRecipesPort>;

    mockStandardsPort = {
      getStandard: jest.fn(async (id) => {
        return id === standardUpdatedId
          ? ({
              name: 'TypeScript Style',
              slug: 'typescript-style',
            } as unknown as Standard)
          : null;
      }),
    } as unknown as jest.Mocked<IStandardsPort>;

    mockSkillsPort = {
      getSkill: jest.fn(async (id) => {
        return id === skillRemovedId
          ? ({
              name: 'Onboarding Skill',
              slug: 'onboarding-skill',
            } as unknown as Skill)
          : null;
      }),
    } as unknown as jest.Mocked<ISkillsPort>;

    mockAccountsPort = {
      getUserById: jest.fn().mockResolvedValue(memberUser),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    useCase = new GetMarketplaceDistributionChangesUseCase(
      mockMarketplaceRepository,
      mockMarketplaceDistributionRepository,
      mockPackageService,
      mockFingerprintService,
      mockRecipesPort,
      mockStandardsPort,
      mockSkillsPort,
      mockAccountsPort,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('happy path with drift', () => {
    let result: Awaited<
      ReturnType<GetMarketplaceDistributionChangesUseCase['execute']>
    >;

    beforeEach(async () => {
      result = await useCase.execute({
        userId,
        organizationId,
        marketplaceId,
        distributionId,
      });
    });

    it('returns one entry per added/updated/removed artifact', () => {
      expect(result).toHaveLength(5);
    });

    it('orders the changes added → updated → removed, then by artifact kind, then by name', () => {
      expect(result.map((c) => ({ kind: c.kind, name: c.name }))).toEqual([
        { kind: 'added', name: 'Lint Strict' },
        { kind: 'updated', name: 'Format Code' },
        { kind: 'updated', name: 'TypeScript Style' },
        { kind: 'removed', name: 'Legacy Recipe' },
        { kind: 'removed', name: 'Onboarding Skill' },
      ]);
    });

    it('attaches null publishedVersion to added artifacts', () => {
      const added = result.find((c) => c.kind === 'added');
      expect(added?.publishedVersion).toBeNull();
    });

    it('attaches null currentVersion to removed artifacts', () => {
      const removed = result.find((c) => c.kind === 'removed');
      expect(removed?.currentVersion).toBeNull();
    });

    it('exposes both versions for an updated artifact', () => {
      const updated = result.find((c) => c.name === 'Format Code');
      expect(updated).toMatchObject({
        kind: 'updated',
        publishedVersion: 1,
        currentVersion: 2,
      });
    });

    it('labels recipes with the marketplace "command" artifact kind', () => {
      const updated = result.find((c) => c.name === 'Format Code');
      expect(updated?.artifactKind).toBe('command');
    });
  });

  describe('when a removed artifact has been hard-deleted', () => {
    let result: Awaited<
      ReturnType<GetMarketplaceDistributionChangesUseCase['execute']>
    >;

    beforeEach(async () => {
      mockSkillsPort.getSkill = jest.fn().mockResolvedValue(null);
      result = await useCase.execute({
        userId,
        organizationId,
        marketplaceId,
        distributionId,
      });
    });

    it('falls back to a placeholder name rather than crashing', () => {
      const removedSkill = result.find((c) => c.artifactKind === 'skill');
      expect(removedSkill?.name).toBe('(deleted)');
    });
  });

  describe('when published and current fingerprints match', () => {
    let result: Awaited<
      ReturnType<GetMarketplaceDistributionChangesUseCase['execute']>
    >;

    beforeEach(async () => {
      mockFingerprintService.compute.mockResolvedValue(publishedFingerprint);
      result = await useCase.execute({
        userId,
        organizationId,
        marketplaceId,
        distributionId,
      });
    });

    it('returns no changes', () => {
      expect(result).toEqual([]);
    });
  });

  describe('when no success distribution exists for the package', () => {
    let result: Awaited<
      ReturnType<GetMarketplaceDistributionChangesUseCase['execute']>
    >;

    beforeEach(async () => {
      mockMarketplaceDistributionRepository.findSuccessfulByMarketplaceId.mockResolvedValue(
        [],
      );
      result = await useCase.execute({
        userId,
        organizationId,
        marketplaceId,
        distributionId,
      });
    });

    it('returns no changes rather than guessing', () => {
      expect(result).toEqual([]);
    });
  });

  describe('when the latest success row has no captured fingerprint', () => {
    let result: Awaited<
      ReturnType<GetMarketplaceDistributionChangesUseCase['execute']>
    >;

    beforeEach(async () => {
      mockMarketplaceDistributionRepository.findSuccessfulByMarketplaceId.mockResolvedValue(
        [
          {
            ...baseDistribution,
            versionFingerprint: undefined,
          } as unknown as MarketplaceDistribution,
        ],
      );
      result = await useCase.execute({
        userId,
        organizationId,
        marketplaceId,
        distributionId,
      });
    });

    it('returns no changes rather than guessing', () => {
      expect(result).toEqual([]);
    });
  });

  describe('when the latest non-removed row is a no_changes republish that already captured the post-edit fingerprint', () => {
    let result: Awaited<
      ReturnType<GetMarketplaceDistributionChangesUseCase['execute']>
    >;

    beforeEach(async () => {
      // The frontend hands us a no_changes row that has already absorbed the
      // post-edit fingerprint. The latest success row, however, still carries
      // the pre-edit fingerprint — that is what the reconciler diffs against
      // when it flips the slug to outdated. Our use case must follow suit.
      const noChangesRow = {
        ...baseDistribution,
        id: createMarketplaceDistributionId(uuidv4()),
        status: DistributionStatus.no_changes,
        versionFingerprint: currentFingerprint,
      } as unknown as MarketplaceDistribution;
      mockMarketplaceDistributionRepository.findById.mockResolvedValue(
        noChangesRow,
      );
      mockMarketplaceDistributionRepository.findSuccessfulByMarketplaceId.mockResolvedValue(
        [baseDistribution],
      );
      result = await useCase.execute({
        userId,
        organizationId,
        marketplaceId,
        distributionId,
      });
    });

    it('still surfaces the drift from the latest success row', () => {
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('when the source package has been hard-deleted', () => {
    let result: Awaited<
      ReturnType<GetMarketplaceDistributionChangesUseCase['execute']>
    >;

    beforeEach(async () => {
      mockPackageService.findById.mockResolvedValue(null);
      result = await useCase.execute({
        userId,
        organizationId,
        marketplaceId,
        distributionId,
      });
    });

    it('returns no changes', () => {
      expect(result).toEqual([]);
    });
  });

  describe('when the distribution belongs to another marketplace', () => {
    let result: Awaited<
      ReturnType<GetMarketplaceDistributionChangesUseCase['execute']>
    >;

    beforeEach(async () => {
      mockMarketplaceDistributionRepository.findById.mockResolvedValue({
        ...baseDistribution,
        marketplaceId: otherMarketplaceId,
      } as unknown as MarketplaceDistribution);
      result = await useCase.execute({
        userId,
        organizationId,
        marketplaceId,
        distributionId,
      });
    });

    it('refuses to leak data across marketplaces', () => {
      expect(result).toEqual([]);
    });
  });

  describe('when the distribution belongs to another organization', () => {
    let result: Awaited<
      ReturnType<GetMarketplaceDistributionChangesUseCase['execute']>
    >;

    beforeEach(async () => {
      mockMarketplaceDistributionRepository.findById.mockResolvedValue({
        ...baseDistribution,
        organizationId: otherOrganizationId,
      } as unknown as MarketplaceDistribution);
      result = await useCase.execute({
        userId,
        organizationId,
        marketplaceId,
        distributionId,
      });
    });

    it('refuses to leak data across organizations', () => {
      expect(result).toEqual([]);
    });
  });

  describe('when the marketplace does not belong to the caller', () => {
    beforeEach(() => {
      mockMarketplaceRepository.findByOrganizationAndId.mockResolvedValue(null);
    });

    it('throws MarketplaceNotFoundError', async () => {
      await expect(
        useCase.execute({
          userId,
          organizationId,
          marketplaceId,
          distributionId,
        }),
      ).rejects.toThrow(MarketplaceNotFoundError);
    });
  });
});
