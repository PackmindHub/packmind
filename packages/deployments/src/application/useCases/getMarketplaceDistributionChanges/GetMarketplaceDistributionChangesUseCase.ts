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
  SourcePackagePublishState,
  StandardId,
  VersionFingerprint,
  versionFingerprintsEqual,
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
      return emptyResponse('in_sync_main');
    }

    // The drift signal driving the UI's "Changes ready" pill is computed by the
    // reconciler against the *latest success* distribution for the package
    // (see `MarketplaceReconciliationDelayedJob`). The frontend, by contrast,
    // hands us the latest *non-removed* row — which can be a `no_changes`
    // republish that already captured the post-edit fingerprint. Diffing
    // against that would mask the drift the reconciler just flagged.
    //
    // We also look up the latest pending_merge row for the same package — if
    // one exists, this package is part of an open sync PR, and the action
    // button needs to switch to "View pull request" when the source matches
    // that PR's content.
    const [successDistributions, pendingMergeDistributions] = await Promise.all(
      [
        this.marketplaceDistributionRepository.findSuccessfulByMarketplaceId(
          marketplaceId,
        ),
        this.marketplaceDistributionRepository.findPendingMergesByMarketplaceId(
          marketplaceId,
        ),
      ],
    );
    const latestSuccess = successDistributions.find(
      (d) => d.packageId === distribution.packageId,
    );
    const latestPendingMerge = pendingMergeDistributions.find(
      (d) => d.packageId === distribution.packageId,
    );

    const publishedFingerprint = latestSuccess?.versionFingerprint;
    if (!publishedFingerprint) {
      this.logger.info(
        'No success distribution with captured fingerprint; skipping diff',
        { distributionId, packageId: distribution.packageId },
      );
      // We still surface a usable state even without a `success` baseline.
      // First-time publishes spend their lifecycle in `pending_merge` until
      // the reconciler promotes them, so the View PR button must still appear.
      if (latestPendingMerge?.prUrl) {
        return {
          state: 'in_sync_pr',
          changes: [],
          prUrl: latestPendingMerge.prUrl,
        };
      }
      return emptyResponse('in_sync_main');
    }

    const pkg = await this.packageService.findById(distribution.packageId);
    if (!pkg) {
      this.logger.info('Source package not found; skipping diff', {
        packageId: distribution.packageId,
        distributionId,
      });
      return emptyResponse('in_sync_main');
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

    const changes = [
      ...recipeChanges,
      ...standardChanges,
      ...skillChanges,
    ].sort(compareChanges);

    const state = resolvePublishState({
      currentFingerprint,
      successFingerprint: publishedFingerprint,
      pendingMergeFingerprint: latestPendingMerge?.versionFingerprint,
    });
    const prUrl =
      state === 'in_sync_pr' || state === 'outdated_pr'
        ? (latestPendingMerge?.prUrl ?? null)
        : null;

    return { state, changes, prUrl };
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

function emptyResponse(
  state: SourcePackagePublishState,
): GetMarketplaceDistributionChangesResponse {
  return { state, changes: [], prUrl: null };
}

/**
 * Bucket the source package into one of the four publish-state cases the
 * Changes-tab footer cares about.
 *
 *   in sync vs success          → in_sync_main (no button)
 *   in sync vs pending_merge    → in_sync_pr   (View pull request)
 *   drifted vs pending_merge    → outdated_pr  (Publish, amends PR)
 *   drifted vs both, no PR row  → outdated_main (Publish, opens PR)
 */
function resolvePublishState(params: {
  currentFingerprint: VersionFingerprint;
  successFingerprint: VersionFingerprint;
  pendingMergeFingerprint: VersionFingerprint | undefined;
}): SourcePackagePublishState {
  const { currentFingerprint, successFingerprint, pendingMergeFingerprint } =
    params;
  if (versionFingerprintsEqual(currentFingerprint, successFingerprint)) {
    return 'in_sync_main';
  }
  if (
    pendingMergeFingerprint &&
    versionFingerprintsEqual(currentFingerprint, pendingMergeFingerprint)
  ) {
    return 'in_sync_pr';
  }
  if (pendingMergeFingerprint) {
    return 'outdated_pr';
  }
  return 'outdated_main';
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
