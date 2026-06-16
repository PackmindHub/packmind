import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  GetMarketplaceDistributionChangesCommand,
  GetMarketplaceDistributionChangesResponse,
  IAccountsPort,
  IGetMarketplaceDistributionChangesUseCase,
  IRecipesPort,
  ISkillsPort,
  IStandardsPort,
  MarketplaceArtifactKind,
  MarketplaceNotFoundError,
  RecipeId,
  SkillId,
  SourcePackageChange,
  StandardId,
  VersionFingerprint,
} from '@packmind/types';
import { IMarketplaceDistributionRepository } from '../../../domain/repositories/IMarketplaceDistributionRepository';
import { IMarketplaceRepository } from '../../../domain/repositories/IMarketplaceRepository';
import { PackageService } from '../../services/PackageService';
import { PackageVersionFingerprintService } from '../../services/PackageVersionFingerprintService';

const origin = 'GetMarketplaceDistributionChangesUseCase';

const FALLBACK_NAME = '(deleted)';

const KIND_ORDER: Record<SourcePackageChange['kind'], number> = {
  added: 0,
  updated: 1,
  removed: 2,
};

const ARTIFACT_KIND_ORDER: Record<MarketplaceArtifactKind, number> = {
  command: 0,
  standard: 1,
  skill: 2,
};

/**
 * Diffs the `VersionFingerprint` a distribution captured at publish time
 * against the source package's current state, returning a flat list of
 * artifact-level changes (added / updated / removed). Drives the marketplace
 * plugin detail "Changes" tab.
 *
 * Returns `[]` when:
 *  - the distribution has no captured fingerprint (legacy row published
 *    before fingerprinting existed),
 *  - the source package has been hard-deleted,
 *  - or the fingerprints are identical (nothing to publish).
 *
 * Open to any organization member — admin permissions are not required for
 * reads.
 */
export class GetMarketplaceDistributionChangesUseCase
  extends AbstractMemberUseCase<
    GetMarketplaceDistributionChangesCommand,
    GetMarketplaceDistributionChangesResponse
  >
  implements IGetMarketplaceDistributionChangesUseCase
{
  constructor(
    private readonly marketplaceRepository: IMarketplaceRepository,
    private readonly marketplaceDistributionRepository: IMarketplaceDistributionRepository,
    private readonly packageService: PackageService,
    private readonly packageVersionFingerprintService: PackageVersionFingerprintService,
    private readonly recipesPort: IRecipesPort,
    private readonly standardsPort: IStandardsPort,
    private readonly skillsPort: ISkillsPort,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForMembers(
    command: GetMarketplaceDistributionChangesCommand & MemberContext,
  ): Promise<GetMarketplaceDistributionChangesResponse> {
    const { marketplaceId, distributionId, organization } = command;

    const marketplace =
      await this.marketplaceRepository.findByOrganizationAndId(
        organization.id,
        marketplaceId,
      );
    if (!marketplace) {
      throw new MarketplaceNotFoundError(marketplaceId);
    }

    const distribution =
      await this.marketplaceDistributionRepository.findById(distributionId);
    if (
      !distribution ||
      distribution.marketplaceId !== marketplaceId ||
      distribution.organizationId !== organization.id
    ) {
      return [];
    }

    // The drift signal driving the UI's "Changes ready" pill is computed by the
    // reconciler against the *latest success* distribution for the package
    // (see `MarketplaceReconciliationDelayedJob`). The frontend, by contrast,
    // hands us the latest *non-removed* row — which can be a `no_changes`
    // republish that already captured the post-edit fingerprint. Diffing
    // against that would mask the drift the reconciler just flagged.
    //
    // To stay in lockstep with the reconciler, we resolve the baseline from
    // the latest success row for the same package.
    const successDistributions =
      await this.marketplaceDistributionRepository.findSuccessfulByMarketplaceId(
        marketplaceId,
      );
    const latestSuccess = successDistributions.find(
      (d) => d.packageId === distribution.packageId,
    );

    const publishedFingerprint = latestSuccess?.versionFingerprint;
    if (!publishedFingerprint) {
      this.logger.info(
        'No success distribution with captured fingerprint; skipping diff',
        { distributionId, packageId: distribution.packageId },
      );
      return [];
    }

    const pkg = await this.packageService.findById(distribution.packageId);
    if (!pkg) {
      this.logger.info('Source package not found; skipping diff', {
        packageId: distribution.packageId,
        distributionId,
      });
      return [];
    }

    const currentFingerprint =
      await this.packageVersionFingerprintService.compute(pkg);

    const recipeChanges = await this.diffRecipes(
      publishedFingerprint,
      currentFingerprint,
    );
    const standardChanges = await this.diffStandards(
      publishedFingerprint,
      currentFingerprint,
    );
    const skillChanges = await this.diffSkills(
      publishedFingerprint,
      currentFingerprint,
    );

    return [...recipeChanges, ...standardChanges, ...skillChanges].sort(
      compareChanges,
    );
  }

  private async diffRecipes(
    published: VersionFingerprint,
    current: VersionFingerprint,
  ): Promise<SourcePackageChange[]> {
    const diffs = diffMaps(published.recipes, current.recipes);
    return Promise.all(
      diffs.map(async (diff) => {
        const recipe = await this.recipesPort.getRecipeByIdInternal(
          diff.id as RecipeId,
        );
        return toChange(diff, 'command', recipe?.name, recipe?.slug);
      }),
    );
  }

  private async diffStandards(
    published: VersionFingerprint,
    current: VersionFingerprint,
  ): Promise<SourcePackageChange[]> {
    const diffs = diffMaps(published.standards, current.standards);
    return Promise.all(
      diffs.map(async (diff) => {
        const standard = await this.standardsPort.getStandard(
          diff.id as StandardId,
        );
        return toChange(diff, 'standard', standard?.name, standard?.slug);
      }),
    );
  }

  private async diffSkills(
    published: VersionFingerprint,
    current: VersionFingerprint,
  ): Promise<SourcePackageChange[]> {
    const diffs = diffMaps(published.skills, current.skills);
    return Promise.all(
      diffs.map(async (diff) => {
        const skill = await this.skillsPort.getSkill(diff.id as SkillId);
        return toChange(diff, 'skill', skill?.name, skill?.slug);
      }),
    );
  }
}

type RawDiff = {
  id: string;
  kind: SourcePackageChange['kind'];
  publishedVersion: number | null;
  currentVersion: number | null;
};

function diffMaps(
  published: Record<string, number>,
  current: Record<string, number>,
): RawDiff[] {
  const diffs: RawDiff[] = [];
  for (const [id, currentVersion] of Object.entries(current)) {
    if (!(id in published)) {
      diffs.push({ id, kind: 'added', publishedVersion: null, currentVersion });
      continue;
    }
    if (published[id] !== currentVersion) {
      diffs.push({
        id,
        kind: 'updated',
        publishedVersion: published[id],
        currentVersion,
      });
    }
  }
  for (const [id, publishedVersion] of Object.entries(published)) {
    if (!(id in current)) {
      diffs.push({
        id,
        kind: 'removed',
        publishedVersion,
        currentVersion: null,
      });
    }
  }
  return diffs;
}

function toChange(
  diff: RawDiff,
  artifactKind: MarketplaceArtifactKind,
  name: string | undefined,
  slug: string | undefined,
): SourcePackageChange {
  return {
    kind: diff.kind,
    artifactKind,
    name: name ?? FALLBACK_NAME,
    slug: slug ?? diff.id,
    publishedVersion: diff.publishedVersion,
    currentVersion: diff.currentVersion,
  };
}

function compareChanges(
  a: SourcePackageChange,
  b: SourcePackageChange,
): number {
  if (a.kind !== b.kind) return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
  if (a.artifactKind !== b.artifactKind) {
    return (
      ARTIFACT_KIND_ORDER[a.artifactKind] - ARTIFACT_KIND_ORDER[b.artifactKind]
    );
  }
  return a.name.localeCompare(b.name);
}
