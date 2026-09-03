import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  PMBadge,
  PMBox,
  PMButton,
  PMCheckbox,
  PMHStack,
  PMHeading,
  PMIcon,
  PMSpinner,
  PMText,
  PMTooltip,
  PMVStack,
  pmToaster,
} from '@packmind/ui';
import {
  LuArrowRight,
  LuBookOpen,
  LuCheck,
  LuChevronDown,
  LuChevronRight,
  LuCircleCheck,
  LuClock,
  LuGitBranch,
  LuRotateCw,
  LuStore,
  LuTerminal,
  LuTriangleAlert,
  LuWandSparkles,
  LuX,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';
import { Link } from 'react-router';
import type { GitProviderId, PackageId, TargetId } from '@packmind/types';
import { useDeployPackagesMutation } from '../../../api/queries/DeploymentsQueries';
import {
  installDriftEntries,
  multiLandingRepoIds,
  targetLabel,
  STALE_DAYS_THRESHOLD,
  formatRelativeDate,
  type InstallDriftEntry,
} from '../selectors/installDriftEntries';
import {
  installLockReason,
  type InstallLockReason,
} from '../selectors/installLock';
import type {
  ArtifactKind,
  MarketplaceDrift,
  MarketplacePluginDrift,
  PackageDrift,
} from '../types';

const KIND_ICON: Record<ArtifactKind, IconType> = {
  standard: LuBookOpen,
  command: LuTerminal,
  skill: LuWandSparkles,
};

/**
 * One marketplace of a batch, with the plugins that would go out to it.
 *
 * Carried on the scope rather than derived here: a marketplace's drift is not
 * a fact about a `PackageDrift`, which is what this surface is given, and the
 * rail that made the pick is the only thing that knows which catalogs were
 * ticked.
 */
export type MarketplaceSyncTarget = {
  marketplace: MarketplaceDrift;
  plugins: MarketplacePluginDrift[];
};

/**
 * What a marketplace batch came to.
 *
 * Two numbers rather than a throw, because a plugin the marketplace refused
 * does not undo the commits the repositories of the same batch already
 * received: the receipt has to be able to state both halves.
 */
export type MarketplaceDistributionResult = {
  accepted: number;
  failed: number;
};

export type SyncScope =
  | {
      kind: 'bulk';
      packageIds: PackageId[];
      /**
       * Optional `${repoId}::${targetId}` keys. When provided, only the
       * matching install entries are surfaced and pre-selected. Lets the
       * repository view trigger a scoped bulk sync that does not bleed into
       * other repos' installs of the same package.
       */
      installKeyFilter?: Set<string>;
      /**
       * The marketplace half of the same pick. Absent or empty means the batch
       * is repositories only, which is every caller but the Distribution rail.
       */
      marketplaces?: MarketplaceSyncTarget[];
    }
  | {
      kind: 'package';
      packageId: PackageId;
      installKeys?: string[];
    };

type PackageBlock = {
  pkg: PackageDrift;
  driftedEntries: InstallDriftEntry[];
};

type CliBlock = {
  pkg: PackageDrift;
  cliEntries: InstallDriftEntry[];
};

function installSelectionKey(
  pkgId: PackageId,
  repoId: string,
  targetId: TargetId,
): string {
  return `${pkgId}::${repoId}::${targetId}`;
}

/** A plugin is one package on one marketplace, and its slug says which. */
function pluginSelectionKey(marketplaceId: string, pluginSlug: string): string {
  return `${marketplaceId}::${pluginSlug}`;
}

/*
 * Everything ticked, unlike the install side which drops what a lock holds.
 * A marketplace has no locks: the pull request it opens is rolling, so a
 * plugin whose previous one is still unmerged takes the same update rather
 * than a second request.
 */
function initialPluginSelection(
  targets: readonly MarketplaceSyncTarget[],
): Set<string> {
  const next = new Set<string>();
  for (const target of targets) {
    for (const plugin of target.plugins) {
      next.add(pluginSelectionKey(target.marketplace.id, plugin.pluginSlug));
    }
  }
  return next;
}

function localInstallKey(repoId: string, targetId: TargetId): string {
  return `${repoId}::${targetId}`;
}

type LockReason = InstallLockReason;
const lockReasonFor = installLockReason;

type SyncStep = 'review' | 'syncing' | 'success' | 'error';

type SyncSurfaceProps = {
  packages: PackageDrift[];
  scope: SyncScope;
  providersWithToken: Set<GitProviderId>;
  isProvidersLoading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  /**
   * Where to set up scheduled updates, offered once the distribution has
   * succeeded.
   *
   * Here rather than on the surface that started the flow, because this is the
   * moment the offer means something: the reader has just done by hand the work
   * the scheduler would have done, so the sentence describes what they did
   * rather than advertising a feature. On a listing screen the same link is
   * chrome that competes with the list.
   *
   * Optional, so the callers that have no organization slug to build it from,
   * or no reason to make the offer, pass nothing and lose nothing.
   */
  autoUpdateHref?: string | null;
  /**
   * Sends the marketplace half of the batch.
   *
   * A callback rather than a mutation called from here, because marketplaces
   * are an edition of their own: this surface is compiled into both, and the
   * caller that has a marketplace lane to offer is the one that can already
   * reach it. Must not reject — it reports what was accepted and what was
   * refused instead, since a refused plugin leaves the repositories of the
   * same batch distributed all the same.
   */
  onDistributeMarketplaces?: (
    picks: MarketplaceSyncTarget[],
  ) => Promise<MarketplaceDistributionResult>;
};

export function SyncSurface({
  packages,
  scope,
  providersWithToken,
  isProvidersLoading,
  onCancel,
  onConfirm,
  autoUpdateHref = null,
  onDistributeMarketplaces,
}: Readonly<SyncSurfaceProps>) {
  const blocks = useMemo<PackageBlock[]>(
    () => buildPackageBlocks(packages, scope),
    [packages, scope],
  );

  /*
   * Only the marketplaces that have something to send. A catalog ticked on the
   * rail while every plugin of it matches its package would otherwise arrive
   * here as a block with no rows in it.
   */
  const marketplaceTargets = useMemo<MarketplaceSyncTarget[]>(() => {
    if (scope.kind !== 'bulk' || !onDistributeMarketplaces) return [];
    return (scope.marketplaces ?? []).filter(
      (target) => target.plugins.length > 0,
    );
  }, [scope, onDistributeMarketplaces]);

  const { actionableBlocks, cliBlocks } = useMemo(() => {
    const actionable: PackageBlock[] = [];
    const cli: CliBlock[] = [];
    for (const block of blocks) {
      const gitPush: InstallDriftEntry[] = [];
      const cliEntries: InstallDriftEntry[] = [];
      for (const entry of block.driftedEntries) {
        const reason = lockReasonFor(
          entry,
          providersWithToken,
          isProvidersLoading,
        );
        if (reason === 'no-app-token') cliEntries.push(entry);
        else gitPush.push(entry);
      }
      if (gitPush.length > 0)
        actionable.push({ pkg: block.pkg, driftedEntries: gitPush });
      if (cliEntries.length > 0) cli.push({ pkg: block.pkg, cliEntries });
    }
    return { actionableBlocks: actionable, cliBlocks: cli };
  }, [blocks, providersWithToken, isProvidersLoading]);

  const initialSelection = useMemo<Set<string>>(() => {
    const next = new Set<string>();
    const explicitKeys =
      scope.kind === 'package' && scope.installKeys
        ? new Set(scope.installKeys)
        : null;
    for (const block of actionableBlocks) {
      for (const entry of block.driftedEntries) {
        if (lockReasonFor(entry, providersWithToken, isProvidersLoading))
          continue;
        if (explicitKeys) {
          const local = localInstallKey(entry.repo.id, entry.target.id);
          if (!explicitKeys.has(local)) continue;
        }
        next.add(
          installSelectionKey(block.pkg.id, entry.repo.id, entry.target.id),
        );
      }
    }
    return next;
  }, [actionableBlocks, scope, providersWithToken, isProvidersLoading]);

  const lockCounts = useMemo(() => {
    let inProgress = 0;
    let selectable = 0;
    for (const block of actionableBlocks) {
      for (const entry of block.driftedEntries) {
        const reason = lockReasonFor(
          entry,
          providersWithToken,
          isProvidersLoading,
        );
        if (reason === 'in-progress') inProgress++;
        else selectable++;
      }
    }
    return { inProgress, selectable };
  }, [actionableBlocks, providersWithToken, isProvidersLoading]);

  const hasMarketplaces = marketplaceTargets.length > 0;

  /*
   * The three states below describe the repository side, and each of them used
   * to speak for the whole screen. A batch whose repositories are all locked,
   * or all CLI-only, still has a marketplace half that can go out, so none of
   * them may claim the screen while that half is there.
   */
  const actionableAllLocked =
    !hasMarketplaces &&
    actionableBlocks.length > 0 &&
    lockCounts.selectable === 0;
  const hasNothing =
    !hasMarketplaces && actionableBlocks.length === 0 && cliBlocks.length === 0;
  const cliOnly =
    !hasMarketplaces && actionableBlocks.length === 0 && cliBlocks.length > 0;

  const [selected, setSelected] = useState<Set<string>>(initialSelection);
  /*
   * Kept apart from the install selection rather than folded into one set of
   * keys: every count on this screen walks the package blocks, and a plugin
   * key living in the same set would have to be excluded from each of them.
   */
  const [selectedPlugins, setSelectedPlugins] = useState<Set<string>>(() =>
    initialPluginSelection(marketplaceTargets),
  );
  const [step, setStep] = useState<SyncStep>('review');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [marketplaceOutcome, setMarketplaceOutcome] =
    useState<MarketplaceDistributionResult | null>(null);

  const deployPackages = useDeployPackagesMutation();

  const togglePlugin = useCallback((key: string) => {
    setSelectedPlugins((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleMarketplace = useCallback(
    (target: MarketplaceSyncTarget, on: boolean) => {
      setSelectedPlugins((prev) => {
        const next = new Set(prev);
        for (const plugin of target.plugins) {
          const k = pluginSelectionKey(
            target.marketplace.id,
            plugin.pluginSlug,
          );
          if (on) next.add(k);
          else next.delete(k);
        }
        return next;
      });
    },
    [],
  );

  /** The picks, narrowed to what is still ticked, in the callback's shape. */
  const pickedMarketplaces = useMemo<MarketplaceSyncTarget[]>(
    () =>
      marketplaceTargets
        .map((target) => ({
          marketplace: target.marketplace,
          plugins: target.plugins.filter((plugin) =>
            selectedPlugins.has(
              pluginSelectionKey(target.marketplace.id, plugin.pluginSlug),
            ),
          ),
        }))
        .filter((target) => target.plugins.length > 0),
    [marketplaceTargets, selectedPlugins],
  );

  const toggleInstall = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const togglePackage = useCallback(
    (block: PackageBlock, on: boolean) => {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const entry of block.driftedEntries) {
          if (lockReasonFor(entry, providersWithToken, isProvidersLoading))
            continue;
          const k = installSelectionKey(
            block.pkg.id,
            entry.repo.id,
            entry.target.id,
          );
          if (on) next.add(k);
          else next.delete(k);
        }
        return next;
      });
    },
    [providersWithToken, isProvidersLoading],
  );

  const stats = useMemo(() => {
    const installs = new Set<string>();
    const packagesTouched = new Set<PackageId>();
    let updatedArtifacts = 0;
    for (const block of actionableBlocks) {
      for (const entry of block.driftedEntries) {
        const k = installSelectionKey(
          block.pkg.id,
          entry.repo.id,
          entry.target.id,
        );
        if (selected.has(k)) {
          installs.add(localInstallKey(entry.repo.id, entry.target.id));
          packagesTouched.add(block.pkg.id);
          updatedArtifacts += entry.behindArtifacts.length;
        }
      }
    }
    return {
      installCount: installs.size,
      packageCount: packagesTouched.size,
      artifactUpdateCount: updatedArtifacts,
    };
  }, [actionableBlocks, selected]);

  const marketplaceStats = useMemo(() => {
    let plugins = 0;
    for (const target of pickedMarketplaces) plugins += target.plugins.length;
    return {
      pluginCount: plugins,
      marketplaceCount: pickedMarketplaces.length,
    };
  }, [pickedMarketplaces]);

  /** Anything at all ticked, on either side. */
  const hasPick = stats.installCount > 0 || marketplaceStats.pluginCount > 0;

  const selectionByPackage = useMemo(() => {
    const map = new Map<PackageId, TargetId[]>();
    for (const block of actionableBlocks) {
      const targets: TargetId[] = [];
      for (const entry of block.driftedEntries) {
        const k = installSelectionKey(
          block.pkg.id,
          entry.repo.id,
          entry.target.id,
        );
        if (selected.has(k)) targets.push(entry.target.id);
      }
      if (targets.length > 0) map.set(block.pkg.id, targets);
    }
    return map;
  }, [actionableBlocks, selected]);

  const handleConfirm = useCallback(async () => {
    if (!hasPick) return;
    setStep('syncing');
    setErrorMessage(null);
    try {
      await Promise.all(
        Array.from(selectionByPackage.entries()).map(([packageId, targetIds]) =>
          deployPackages.mutateAsync({
            packageIds: [packageId],
            targetIds,
          }),
        ),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown error while distributing packages.';
      setErrorMessage(message);
      setStep('error');
      pmToaster.create({
        type: 'error',
        title: 'Distribution failed',
        description: message,
      });
      /*
       * The marketplace half is not attempted after this. Half a batch out the
       * door is a state the reader would have to reconstruct from two screens,
       * and the button they land back on offers the whole thing again.
       */
      return;
    }

    if (pickedMarketplaces.length > 0 && onDistributeMarketplaces) {
      setMarketplaceOutcome(await onDistributeMarketplaces(pickedMarketplaces));
    }

    setStep('success');
    onConfirm();
  }, [
    deployPackages,
    hasPick,
    onConfirm,
    onDistributeMarketplaces,
    pickedMarketplaces,
    selectionByPackage,
  ]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && step !== 'syncing') {
        e.preventDefault();
        onCancel();
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key === 'Enter' &&
        step === 'review' &&
        hasPick
      ) {
        e.preventDefault();
        void handleConfirm();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel, handleConfirm, hasPick, step]);

  if (step === 'success') {
    return (
      <SuccessSurface
        stats={stats}
        marketplaceStats={marketplaceStats}
        marketplaceOutcome={marketplaceOutcome}
        onClose={onCancel}
        autoUpdateHref={autoUpdateHref}
      />
    );
  }

  const isSyncing = step === 'syncing';
  const hasError = step === 'error';

  return (
    <PMBox
      bg="background.primary"
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="md"
      overflow="hidden"
      animation="fade-in 120ms ease-out"
    >
      <PMBox
        as="header"
        paddingX={6}
        paddingY={5}
        borderBottomWidth="1px"
        borderColor="border.tertiary"
      >
        <PMHStack justify="space-between" align="flex-start" gap={4}>
          <PMVStack align="flex-start" gap={1}>
            <PMHeading level="h3">
              {titleForScope(scope, blocks, marketplaceTargets)}
            </PMHeading>
            <PMText fontSize="sm" color="secondary" maxW="68ch">
              Selected distributions receive a direct commit on their configured
              branch bringing every bundled component to its Packmind version.
              Distributions without a connected provider are listed separately
              and must be updated via{' '}
              <PMText as="span" fontFamily="mono" fontSize="xs">
                packmind install
              </PMText>
              .
            </PMText>
            {/*
              Said here and not on the marketplace section alone, because it is
              the sentence above that would otherwise describe the whole screen:
              a reader who has ticked a catalog would be told their plugins land
              as a commit on a branch, which is not what happens to them.
            */}
            {hasMarketplaces && (
              <PMText fontSize="sm" color="secondary" maxW="68ch">
                A marketplace is distributed to differently: each selected
                plugin opens a pull request on the marketplace repository, and
                it lands when someone merges it.
              </PMText>
            )}
          </PMVStack>
          <PMBox
            as="button"
            onClick={onCancel}
            aria-disabled={isSyncing}
            display="inline-flex"
            alignItems="center"
            gap={2}
            bg="transparent"
            border="1px solid"
            borderColor="border.tertiary"
            borderRadius="sm"
            paddingX={3}
            paddingY="6px"
            color="text.secondary"
            cursor={isSyncing ? 'not-allowed' : 'pointer'}
            transition="background-color 150ms ease-out, color 150ms ease-out"
            _hover={
              isSyncing
                ? undefined
                : { color: 'text.primary', bg: 'background.tertiary' }
            }
            aria-label="Cancel"
          >
            <PMIcon fontSize="sm">
              <LuX />
            </PMIcon>
            <PMText fontSize="xs">Cancel</PMText>
          </PMBox>
        </PMHStack>
      </PMBox>

      {hasError && errorMessage && (
        <PMBox
          paddingX={6}
          paddingY={3}
          bg="red.subtle"
          borderBottomWidth="1px"
          borderColor="border.tertiary"
        >
          <PMHStack gap={2} align="center">
            <PMIcon fontSize="sm" color="warning">
              <LuTriangleAlert />
            </PMIcon>
            <PMText fontSize="sm" color="error">
              {errorMessage}
            </PMText>
          </PMHStack>
        </PMBox>
      )}

      <PMBox
        opacity={isSyncing ? 0.55 : 1}
        pointerEvents={isSyncing ? 'none' : 'auto'}
        transition="opacity 200ms ease-out"
        padding={6}
      >
        {hasNothing ? (
          <NothingToDistribute />
        ) : (
          <PMVStack gap={4} align="stretch">
            {cliOnly ? (
              <NoActionableNote />
            ) : actionableAllLocked ? (
              <AllInProgressState count={lockCounts.inProgress} />
            ) : (
              <>
                {/*
                  Both belong to the repository side. A marketplace-only batch
                  reaches this branch with nothing on that side, and the
                  summary would have opened the screen with "0 ready to
                  distribute" over a list of catalogs that are ready.
                */}
                {actionableBlocks.length > 0 && (
                  <LockSummary
                    ready={lockCounts.selectable}
                    inProgress={lockCounts.inProgress}
                  />
                )}
                {actionableBlocks.map((block) => (
                  <PackageSyncBlock
                    key={block.pkg.id}
                    block={block}
                    selected={selected}
                    providersWithToken={providersWithToken}
                    isProvidersLoading={isProvidersLoading}
                    onToggleInstall={toggleInstall}
                    onTogglePackage={(on) => togglePackage(block, on)}
                  />
                ))}
              </>
            )}
            {cliBlocks.length > 0 && (
              <CliInstallSection cliBlocks={cliBlocks} />
            )}
            {marketplaceTargets.map((target) => (
              <MarketplaceSyncBlock
                key={target.marketplace.id}
                target={target}
                selectedPlugins={selectedPlugins}
                onTogglePlugin={togglePlugin}
                onToggleMarketplace={(on) => toggleMarketplace(target, on)}
              />
            ))}
          </PMVStack>
        )}
      </PMBox>

      <PMBox
        paddingX={6}
        paddingY={4}
        borderTopWidth="1px"
        borderColor="border.tertiary"
        position="sticky"
        bottom={0}
        bg="background.primary"
      >
        <PMHStack justify="space-between" align="center" gap={4}>
          {isSyncing ? (
            <PMHStack gap={3} align="center">
              <PMSpinner size="sm" />
              <PMText fontSize="sm" color="secondary">
                {syncingLine(stats.installCount, marketplaceStats.pluginCount)}
              </PMText>
            </PMHStack>
          ) : (
            <PMText fontSize="xs" color="faded">
              Esc to cancel · ⌘↵ to confirm
            </PMText>
          )}
          <PMHStack gap={2} align="center">
            <PMButton
              variant="secondary"
              size="sm"
              onClick={onCancel}
              disabled={isSyncing}
            >
              Cancel
            </PMButton>
            <PMButton
              variant="primary"
              size="sm"
              onClick={() => void handleConfirm()}
              disabled={!hasPick || isSyncing}
            >
              <PMIcon fontSize="sm">
                <LuRotateCw />
              </PMIcon>
              {isSyncing
                ? 'Distributing…'
                : cliOnly
                  ? 'Nothing to distribute from the app'
                  : actionableAllLocked
                    ? 'Waiting on in-progress distributions'
                    : !hasPick
                      ? 'Select at least one distribution'
                      : confirmLabel(stats, marketplaceStats)}
            </PMButton>
          </PMHStack>
        </PMHStack>
      </PMBox>
    </PMBox>
  );
}

/** What the footer says while both halves are in flight. */
function syncingLine(installCount: number, pluginCount: number): string {
  const distributions = `${installCount} distribution${installCount === 1 ? '' : 's'}`;
  const plugins = `${pluginCount} plugin${pluginCount === 1 ? '' : 's'}`;
  if (installCount === 0) return `Distributing ${plugins}…`;
  if (pluginCount === 0) return `Distributing to ${distributions}…`;
  return `Distributing to ${distributions}, and ${plugins}…`;
}

/**
 * The confirm button names what it is about to send.
 *
 * The mixed case drops the package count rather than stating four numbers in
 * one button: what the reader needs before clicking is how far this goes, and
 * the two destinations counts carry that.
 */
function confirmLabel(
  stats: Readonly<{ installCount: number; packageCount: number }>,
  marketplaceStats: Readonly<{
    pluginCount: number;
    marketplaceCount: number;
  }>,
): string {
  const { installCount, packageCount } = stats;
  const { pluginCount, marketplaceCount } = marketplaceStats;
  const distributions = `${installCount} distribution${installCount === 1 ? '' : 's'}`;
  const plugins = `${pluginCount} plugin${pluginCount === 1 ? '' : 's'}`;

  if (pluginCount === 0) {
    return `Distribute ${packageCount} package${
      packageCount === 1 ? '' : 's'
    } to ${distributions}`;
  }
  if (installCount === 0) {
    return `Distribute ${plugins} to ${marketplaceCount} marketplace${
      marketplaceCount === 1 ? '' : 's'
    }`;
  }
  return `Distribute to ${distributions} and ${plugins}`;
}

function titleForScope(
  scope: SyncScope,
  blocks: PackageBlock[],
  marketplaceTargets: readonly MarketplaceSyncTarget[],
): string {
  if (scope.kind === 'bulk') {
    const n = blocks.length;
    const m = marketplaceTargets.length;
    const packages = `${n} package${n === 1 ? '' : 's'}`;
    const catalogs = `${m} marketplace${m === 1 ? '' : 's'}`;
    /*
     * The packages counted here are the ones with a drifted landing, and a
     * marketplace's plugins are not among them: a batch of catalogs alone would
     * have been titled "Distribute 0 packages", and a mixed one would have
     * announced half of what the button below it offers to send.
     */
    if (m === 0) return `Distribute ${packages}`;
    if (n === 0) return `Distribute to ${catalogs}`;
    return `Distribute ${packages} and ${catalogs}`;
  }
  const pkg = blocks[0]?.pkg;
  return pkg ? `Distribute ${pkg.name}` : 'Distribute package';
}

function buildPackageBlocks(
  packages: PackageDrift[],
  scope: SyncScope,
): PackageBlock[] {
  const bulkAllowed =
    scope.kind === 'bulk' ? new Set<PackageId>(scope.packageIds) : null;
  const installFilter =
    scope.kind === 'bulk' ? (scope.installKeyFilter ?? null) : null;
  const out: PackageBlock[] = [];
  for (const pkg of packages) {
    if (scope.kind === 'package' && pkg.id !== scope.packageId) continue;
    if (bulkAllowed && !bulkAllowed.has(pkg.id)) continue;
    const driftedEntries = installDriftEntries(pkg).filter((e) => {
      if (e.behindArtifacts.length === 0) return false;
      if (installFilter) {
        return installFilter.has(localInstallKey(e.repo.id, e.target.id));
      }
      return true;
    });
    if (driftedEntries.length === 0) continue;
    out.push({ pkg, driftedEntries });
  }
  return out;
}

type PackageSyncBlockProps = {
  block: PackageBlock;
  selected: Set<string>;
  providersWithToken: Set<GitProviderId>;
  isProvidersLoading: boolean;
  onToggleInstall: (key: string) => void;
  onTogglePackage: (on: boolean) => void;
};

function PackageSyncBlock({
  block,
  selected,
  providersWithToken,
  isProvidersLoading,
  onToggleInstall,
  onTogglePackage,
}: Readonly<PackageSyncBlockProps>) {
  const [expanded, setExpanded] = useState(false);
  /*
   * Read off every landing of the package, not just the drifted ones this
   * block lists: whether a repository holds a second place is a fact about the
   * package, and a row must not lose its label because its sibling happens to
   * be aligned.
   */
  const multiLandingRepos = multiLandingRepoIds(block.pkg.installLocations);
  const entriesWithLock = block.driftedEntries.map((entry) => ({
    entry,
    lock: lockReasonFor(entry, providersWithToken, isProvidersLoading),
  }));
  const selectableEntries = entriesWithLock
    .filter((e) => !e.lock)
    .map((e) => e.entry);
  const total = selectableEntries.length;
  const lockedInBlock = entriesWithLock.filter((e) => e.lock !== null).length;
  const selectedCount = selectableEntries.reduce(
    (acc, entry) =>
      acc +
      (selected.has(
        installSelectionKey(block.pkg.id, entry.repo.id, entry.target.id),
      )
        ? 1
        : 0),
    0,
  );
  const allSelected = total > 0 && selectedCount === total;
  const noneSelected = selectedCount === 0;
  const headerCheckboxDisabled = total === 0;

  return (
    <PMBox
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="md"
      overflow="hidden"
      bg="background.secondary"
    >
      <PMBox
        paddingX={4}
        paddingY={3}
        bg="background.primary"
        borderBottomWidth={expanded ? '1px' : 0}
        borderColor="border.tertiary"
        cursor={headerCheckboxDisabled ? 'default' : 'pointer'}
        onClick={() => {
          if (headerCheckboxDisabled) return;
          onTogglePackage(!allSelected);
        }}
        _hover={
          headerCheckboxDisabled ? undefined : { bg: 'background.tertiary' }
        }
        transition="background-color 120ms ease-out"
      >
        <PMHStack gap={3} align="center" justify="space-between">
          <PMHStack gap={2} align="center" minW={0} flex={1}>
            <PMBox
              as="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              bg="transparent"
              border="none"
              cursor="pointer"
              padding="2px"
              display="inline-flex"
              alignItems="center"
              justifyContent="center"
              color="text.secondary"
              _hover={{ color: 'text.primary' }}
              _focusVisible={{
                outline: '2px solid',
                outlineColor: 'branding.primary',
                outlineOffset: '2px',
                borderRadius: 'sm',
              }}
              aria-expanded={expanded}
              aria-label={`${expanded ? 'Collapse' : 'Expand'} ${block.pkg.name}`}
            >
              <PMIcon fontSize="sm">
                {expanded ? <LuChevronDown /> : <LuChevronRight />}
              </PMIcon>
            </PMBox>
            <PMBox
              onClick={(e) => e.stopPropagation()}
              display="inline-flex"
              alignItems="center"
            >
              <PMCheckbox
                size="sm"
                checked={
                  allSelected ? true : noneSelected ? false : 'indeterminate'
                }
                onCheckedChange={(details) =>
                  onTogglePackage(details.checked === true)
                }
                disabled={headerCheckboxDisabled}
                aria-label={`Select all repositories for ${block.pkg.name}`}
              />
            </PMBox>
            <PMText
              fontSize="sm"
              fontWeight="semibold"
              color="primary"
              truncate
            >
              {block.pkg.name}
            </PMText>
          </PMHStack>
          <PMHStack
            gap={2}
            align="center"
            flexShrink={0}
            fontVariantNumeric="tabular-nums"
          >
            <PMText fontSize="xs" color="faded">
              {selectedCount} of {total} selected
              {lockedInBlock > 0 && ` · ${lockedInBlock} locked`}
            </PMText>
          </PMHStack>
        </PMHStack>
      </PMBox>

      {expanded && (
        <PMVStack gap={0} align="stretch">
          {entriesWithLock.map(({ entry, lock }) => {
            const key = installSelectionKey(
              block.pkg.id,
              entry.repo.id,
              entry.target.id,
            );
            return (
              <InstallSyncRow
                key={key}
                entry={entry}
                showTarget={multiLandingRepos.has(entry.repo.id)}
                selected={selected.has(key)}
                lockReason={lock}
                onToggle={() => {
                  if (lock) return;
                  onToggleInstall(key);
                }}
              />
            );
          })}
        </PMVStack>
      )}
    </PMBox>
  );
}

type MarketplaceSyncBlockProps = {
  target: MarketplaceSyncTarget;
  selectedPlugins: Set<string>;
  onTogglePlugin: (key: string) => void;
  onToggleMarketplace: (on: boolean) => void;
};

/**
 * One catalog of the batch, and the plugins of it that would go out.
 *
 * Deliberately the same shell as `PackageSyncBlock` — a header that ticks
 * everything under it and rows that tick one thing — because the two sections
 * are read one after the other and a second way of picking would be a second
 * thing to learn. What differs is what a row is: there a place a package
 * lands, here a package as this catalog carries it.
 *
 * Open on arrival, where a package block starts closed. A package can hold
 * twenty landings and this holds what a space published to one catalog; more to
 * the point, this section is the only place the marketplace half of the batch
 * is stated at all, and a closed box states nothing.
 */
function MarketplaceSyncBlock({
  target,
  selectedPlugins,
  onTogglePlugin,
  onToggleMarketplace,
}: Readonly<MarketplaceSyncBlockProps>) {
  const [expanded, setExpanded] = useState(true);
  const { marketplace, plugins } = target;
  const total = plugins.length;
  const selectedCount = plugins.reduce(
    (acc, plugin) =>
      acc +
      (selectedPlugins.has(
        pluginSelectionKey(marketplace.id, plugin.pluginSlug),
      )
        ? 1
        : 0),
    0,
  );
  const allSelected = total > 0 && selectedCount === total;
  const noneSelected = selectedCount === 0;

  return (
    <PMBox
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="md"
      overflow="hidden"
      bg="background.secondary"
    >
      <PMBox
        paddingX={4}
        paddingY={3}
        bg="background.primary"
        borderBottomWidth={expanded ? '1px' : 0}
        borderColor="border.tertiary"
        cursor="pointer"
        onClick={() => onToggleMarketplace(!allSelected)}
        _hover={{ bg: 'background.tertiary' }}
        transition="background-color 120ms ease-out"
      >
        <PMHStack gap={3} align="center" justify="space-between">
          <PMHStack gap={2} align="center" minW={0} flex={1}>
            <PMBox
              as="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              bg="transparent"
              border="none"
              cursor="pointer"
              padding="2px"
              display="inline-flex"
              alignItems="center"
              justifyContent="center"
              color="text.secondary"
              _hover={{ color: 'text.primary' }}
              _focusVisible={{
                outline: '2px solid',
                outlineColor: 'branding.primary',
                outlineOffset: '2px',
                borderRadius: 'sm',
              }}
              aria-expanded={expanded}
              aria-label={`${expanded ? 'Collapse' : 'Expand'} ${marketplace.name}`}
            >
              <PMIcon fontSize="sm">
                {expanded ? <LuChevronDown /> : <LuChevronRight />}
              </PMIcon>
            </PMBox>
            <PMBox
              onClick={(e) => e.stopPropagation()}
              display="inline-flex"
              alignItems="center"
            >
              <PMCheckbox
                size="sm"
                checked={
                  allSelected ? true : noneSelected ? false : 'indeterminate'
                }
                onCheckedChange={(details) =>
                  onToggleMarketplace(details.checked === true)
                }
                aria-label={`Select all plugins for ${marketplace.name}`}
              />
            </PMBox>
            <PMIcon fontSize="sm" color="text.secondary" aria-hidden>
              <LuStore />
            </PMIcon>
            <PMText
              fontSize="sm"
              fontWeight="semibold"
              color="primary"
              truncate
            >
              {marketplace.name}
            </PMText>
          </PMHStack>
          <PMText
            fontSize="xs"
            color="faded"
            flexShrink={0}
            fontVariantNumeric="tabular-nums"
          >
            {selectedCount} of {total} selected
          </PMText>
        </PMHStack>
      </PMBox>

      {expanded && (
        <PMVStack gap={0} align="stretch">
          {plugins.map((plugin) => {
            const key = pluginSelectionKey(marketplace.id, plugin.pluginSlug);
            const selected = selectedPlugins.has(key);
            return (
              <PMHStack
                key={key}
                gap={2}
                align="center"
                paddingX={4}
                paddingY={2.5}
                cursor="pointer"
                onClick={() => onTogglePlugin(key)}
                bg={selected ? 'background.secondary' : 'background.primary'}
                borderBottomWidth="1px"
                borderColor="border.tertiary"
                _last={{ borderBottom: 'none' }}
                transition="background-color 120ms ease-out"
              >
                <PMBox
                  onClick={(e) => e.stopPropagation()}
                  display="inline-flex"
                  alignItems="center"
                >
                  <PMCheckbox
                    size="sm"
                    checked={selected}
                    onCheckedChange={() => onTogglePlugin(key)}
                    aria-label={`Select ${plugin.packageName} on ${marketplace.name}`}
                  />
                </PMBox>
                <PMText fontSize="sm" color="primary" truncate>
                  {plugin.packageName}
                </PMText>
                <PMText
                  fontSize="11px"
                  fontFamily="mono"
                  color="faded"
                  lineHeight="1.4"
                  truncate
                >
                  {plugin.pluginSlug}
                </PMText>
                <PMBox flex={1} />
                <PMBadge size="sm" colorPalette="orange" flexShrink={0}>
                  Drift
                </PMBadge>
              </PMHStack>
            );
          })}
        </PMVStack>
      )}
    </PMBox>
  );
}

const LOCK_ROW_TOOLTIP: Record<LockReason, string> = {
  'in-progress': 'Distributing — wait for it to finish.',
  'no-app-token':
    'This provider has no token — use `packmind install` to update this distribution.',
};

const LOCK_ROW_BADGE: Record<
  LockReason,
  { label: string; colorPalette: 'blue' | 'orange' }
> = {
  'in-progress': { label: 'Distributing', colorPalette: 'blue' },
  'no-app-token': { label: 'CLI only', colorPalette: 'orange' },
};

type InstallSyncRowProps = {
  entry: InstallDriftEntry;
  /** The repository holds more than one landing, so the row has to say which. */
  showTarget: boolean;
  selected: boolean;
  lockReason: LockReason | null;
  onToggle: () => void;
};

function InstallSyncRow({
  entry,
  showTarget,
  selected,
  lockReason,
  onToggle,
}: Readonly<InstallSyncRowProps>) {
  const [expanded, setExpanded] = useState(false);
  const locked = lockReason !== null;
  const showArtifacts = selected && expanded;
  const checkbox = (
    <PMCheckbox
      size="sm"
      checked={selected}
      onCheckedChange={() => {
        if (locked) return;
        onToggle();
      }}
      disabled={locked}
      aria-label={`Select ${entry.repo.owner}/${entry.repo.name}${showTarget ? ` (${targetLabel(entry.target)})` : ''}`}
    />
  );
  return (
    <PMVStack
      gap={0}
      align="stretch"
      bg={selected ? 'background.secondary' : 'background.primary'}
      borderBottomWidth="1px"
      borderColor="border.tertiary"
      _last={{ borderBottom: 'none' }}
      opacity={locked ? 0.6 : 1}
      transition="background-color 120ms ease-out, opacity 120ms ease-out"
    >
      <PMHStack
        gap={2}
        align="center"
        paddingX={4}
        paddingY={2.5}
        cursor={locked ? 'not-allowed' : 'pointer'}
        onClick={() => {
          if (locked) return;
          onToggle();
        }}
        _hover={locked ? undefined : { bg: 'background.tertiary' }}
      >
        {lockReason ? (
          <PMTooltip
            label={LOCK_ROW_TOOLTIP[lockReason]}
            showArrow
            openDelay={200}
          >
            <PMBox display="inline-flex" alignItems="center">
              {checkbox}
            </PMBox>
          </PMTooltip>
        ) : (
          checkbox
        )}
        <PMBox
          width="18px"
          flexShrink={0}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          {selected && (
            <PMBox
              as="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              bg="transparent"
              border="none"
              cursor="pointer"
              padding="2px"
              display="inline-flex"
              alignItems="center"
              justifyContent="center"
              color="text.secondary"
              _hover={{ color: 'text.primary' }}
              _focusVisible={{
                outline: '2px solid',
                outlineColor: 'branding.primary',
                outlineOffset: '2px',
                borderRadius: 'sm',
              }}
              aria-expanded={expanded}
              aria-label={`${expanded ? 'Collapse' : 'Expand'} components to update`}
            >
              <PMIcon fontSize="sm">
                {expanded ? <LuChevronDown /> : <LuChevronRight />}
              </PMIcon>
            </PMBox>
          )}
        </PMBox>
        <PMHStack gap={2} align="center" flex={1} minW={0} wrap="wrap">
          <PMText fontSize="sm" color="primary" truncate>
            {entry.repo.owner}/{entry.repo.name}
          </PMText>
          <PMHStack
            gap="4px"
            align="center"
            color={entry.branch === 'main' ? 'text.faded' : 'text.secondary'}
            flexShrink={0}
            aria-label={`Branch ${entry.branch}`}
          >
            <PMIcon fontSize="xs">
              <LuGitBranch />
            </PMIcon>
            <PMText
              fontSize="11px"
              fontFamily="mono"
              fontVariantNumeric="tabular-nums"
              lineHeight="1.4"
            >
              {entry.branch}
            </PMText>
          </PMHStack>
          {showTarget && (
            <PMBox
              paddingX="6px"
              paddingY="1px"
              borderRadius="sm"
              bg="background.tertiary"
              color="text.secondary"
              fontFamily="mono"
              fontSize="11px"
              flexShrink={0}
            >
              {targetLabel(entry.target)}
            </PMBox>
          )}
        </PMHStack>
        <PMVStack gap={0.5} align="flex-end" flexShrink={0}>
          {lockReason && (
            <PMBadge
              size="xs"
              colorPalette={LOCK_ROW_BADGE[lockReason].colorPalette}
              variant="subtle"
            >
              {LOCK_ROW_BADGE[lockReason].label}
            </PMBadge>
          )}
          <PMText fontSize="xs" color="faded" fontVariantNumeric="tabular-nums">
            {entry.behindArtifacts.length} component
            {entry.behindArtifacts.length === 1 ? '' : 's'} to update
          </PMText>
          {entry.mostRecentDeployedAt && (
            <PMHStack
              gap="4px"
              align="center"
              color={
                entry.mostRecentDeployedAtDays >= STALE_DAYS_THRESHOLD
                  ? 'orange.500'
                  : 'text.faded'
              }
            >
              <PMIcon fontSize="11px">
                <LuClock />
              </PMIcon>
              <PMText fontSize="11px" fontVariantNumeric="tabular-nums">
                Last push {formatRelativeDate(entry.mostRecentDeployedAt)}
              </PMText>
            </PMHStack>
          )}
        </PMVStack>
      </PMHStack>
      {showArtifacts && (
        <PMBox
          paddingLeft="44px"
          paddingRight={4}
          paddingBottom={3}
          paddingTop={1}
        >
          <PMVStack gap={0} align="stretch">
            {entry.behindArtifacts.map((b) => {
              const Icon = KIND_ICON[b.artifact.kind];
              return (
                <PMHStack
                  key={b.artifact.id}
                  gap={3}
                  align="center"
                  paddingY={1}
                  paddingX={2}
                >
                  <PMIcon fontSize="sm" color="text.faded">
                    <Icon />
                  </PMIcon>
                  <PMText
                    fontSize="xs"
                    color="secondary"
                    fontFamily={
                      b.artifact.kind === 'command' ? 'mono' : undefined
                    }
                    flex={1}
                    minW={0}
                    truncate
                  >
                    {b.artifact.name}
                  </PMText>
                  <PMText
                    fontSize="xs"
                    color="faded"
                    fontVariantNumeric="tabular-nums"
                  >
                    v{b.deployedVersion}
                  </PMText>
                  <PMIcon fontSize="xs" color="text.faded">
                    <LuArrowRight />
                  </PMIcon>
                  <PMText
                    fontSize="xs"
                    color="primary"
                    fontWeight="medium"
                    fontVariantNumeric="tabular-nums"
                  >
                    v{b.artifact.packmindVersion}
                  </PMText>
                </PMHStack>
              );
            })}
          </PMVStack>
        </PMBox>
      )}
    </PMVStack>
  );
}

function LockSummary({
  ready,
  inProgress,
}: Readonly<{
  ready: number;
  inProgress: number;
}>) {
  const segments: Array<{
    key: string;
    dot: string;
    label: ReactNode;
  }> = [];
  segments.push({
    key: 'ready',
    dot: 'green.500',
    label: (
      <>
        <PMText
          as="span"
          fontWeight="semibold"
          color="primary"
          fontVariantNumeric="tabular-nums"
        >
          {ready}
        </PMText>
        {' ready to distribute'}
      </>
    ),
  });
  if (inProgress > 0) {
    segments.push({
      key: 'in-progress',
      dot: 'blue.300',
      label: (
        <>
          <PMText
            as="span"
            fontWeight="semibold"
            color="primary"
            fontVariantNumeric="tabular-nums"
          >
            {inProgress}
          </PMText>
          {` distributing`}
        </>
      ),
    });
  }

  return (
    <PMHStack
      gap={4}
      align="center"
      wrap="wrap"
      rowGap={2}
      paddingX={1}
      paddingY={1}
    >
      {segments.map((seg, idx) => (
        <PMHStack key={seg.key} gap={2} align="center">
          <PMBox
            width="6px"
            height="6px"
            borderRadius="full"
            bg={seg.dot}
            flexShrink={0}
            aria-hidden
          />
          <PMText fontSize="sm" color="secondary">
            {seg.label}
          </PMText>
          {idx < segments.length - 1 && (
            <PMText fontSize="sm" color="faded" aria-hidden>
              ·
            </PMText>
          )}
        </PMHStack>
      ))}
    </PMHStack>
  );
}

function AllInProgressState({ count }: Readonly<{ count: number }>) {
  return (
    <PMVStack gap={2} align="center" paddingY={6}>
      <PMIcon fontSize="2xl" color="blue.500">
        <LuClock />
      </PMIcon>
      <PMText fontSize="sm" color="primary" fontWeight="medium">
        Nothing to distribute from the app right now.
      </PMText>
      <PMText fontSize="xs" color="secondary" textAlign="center" maxW="56ch">
        {count === 1
          ? 'The only drifted distribution is currently in progress. Wait for it to finish, then come back to distribute.'
          : `All ${count} drifted distributions are currently in progress. Wait for them to finish, then come back to distribute.`}
      </PMText>
    </PMVStack>
  );
}

function NoActionableNote() {
  return (
    <PMBox
      paddingX={4}
      paddingY={3}
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="md"
      bg="background.secondary"
    >
      <PMText fontSize="sm" color="secondary">
        Nothing to distribute from the app — every drifted distribution lives on
        a provider without a connected token. Use the CLI section below.
      </PMText>
    </PMBox>
  );
}

function CliInstallSection({ cliBlocks }: Readonly<{ cliBlocks: CliBlock[] }>) {
  const [expanded, setExpanded] = useState(true);
  const distributionsCount = cliBlocks.reduce(
    (acc, b) => acc + b.cliEntries.length,
    0,
  );
  const reposCount = new Set(
    cliBlocks.flatMap((b) => b.cliEntries.map((e) => e.repo.id)),
  ).size;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText('packmind install');
      pmToaster.create({
        type: 'success',
        title: 'Copied',
        description: '`packmind install` copied to your clipboard.',
      });
    } catch {
      pmToaster.create({
        type: 'error',
        title: 'Copy failed',
        description: 'Could not access the clipboard.',
      });
    }
  }, []);

  return (
    <PMBox
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="md"
      bg="background.secondary"
      overflow="hidden"
    >
      <PMBox
        as="button"
        onClick={() => setExpanded((v) => !v)}
        bg="transparent"
        border="none"
        width="100%"
        paddingX={4}
        paddingY={3}
        cursor="pointer"
        textAlign="left"
        _hover={{ bg: 'background.tertiary' }}
        transition="background-color 120ms ease-out"
        aria-expanded={expanded}
      >
        <PMHStack gap={2} align="center" justify="space-between">
          <PMHStack gap={2} align="center">
            <PMIcon fontSize="sm" color="text.secondary">
              {expanded ? <LuChevronDown /> : <LuChevronRight />}
            </PMIcon>
            <PMIcon fontSize="sm" color="warning">
              <LuTerminal />
            </PMIcon>
            <PMText fontSize="sm" fontWeight="semibold" color="primary">
              {distributionsCount} distribution
              {distributionsCount === 1 ? '' : 's'} need{' '}
              <PMText
                as="span"
                fontFamily="mono"
                fontSize="xs"
                color="warning"
                paddingX={1}
                paddingY="1px"
                bg="background.tertiary"
                borderRadius="sm"
              >
                packmind install
              </PMText>
            </PMText>
          </PMHStack>
          <PMText fontSize="xs" color="faded" fontVariantNumeric="tabular-nums">
            across {reposCount} repositor{reposCount === 1 ? 'y' : 'ies'}
          </PMText>
        </PMHStack>
      </PMBox>

      {expanded && (
        <PMBox
          paddingX={4}
          paddingY={4}
          borderTopWidth="1px"
          borderColor="border.tertiary"
        >
          <PMVStack gap={4} align="stretch">
            <PMHStack
              gap={2}
              align="center"
              justify="space-between"
              bg="background.tertiary"
              paddingX={3}
              paddingY={2}
              borderRadius="sm"
            >
              <PMText as="span" fontFamily="mono" fontSize="sm" color="warning">
                packmind install
              </PMText>
              <PMButton variant="tertiary" size="sm" onClick={handleCopy}>
                Copy
              </PMButton>
            </PMHStack>
            <PMText fontSize="xs" color="secondary">
              Run the command from each repository below — it distributes every
              Packmind package configured on that repository at once.
            </PMText>
            <PMVStack gap={3} align="stretch">
              {cliBlocks.map((block) => {
                const cliMultiLandingRepos = multiLandingRepoIds(
                  block.pkg.installLocations,
                );
                return (
                  <PMVStack key={block.pkg.id} gap={1.5} align="stretch">
                    <PMText fontSize="xs" fontWeight="semibold" color="primary">
                      {block.pkg.name}
                    </PMText>
                    <PMVStack gap={1} align="stretch" paddingLeft={2}>
                      {block.cliEntries.map((entry) => (
                        <PMHStack
                          key={`${entry.repo.id}::${entry.target.id}`}
                          gap={2}
                          align="center"
                          wrap="wrap"
                        >
                          <PMText fontSize="xs" color="secondary">
                            {entry.repo.owner}/{entry.repo.name}
                          </PMText>
                          <PMHStack
                            gap="4px"
                            align="center"
                            color={
                              entry.branch === 'main'
                                ? 'text.faded'
                                : 'text.secondary'
                            }
                          >
                            <PMIcon fontSize="xs">
                              <LuGitBranch />
                            </PMIcon>
                            <PMText
                              fontSize="11px"
                              fontFamily="mono"
                              fontVariantNumeric="tabular-nums"
                            >
                              {entry.branch}
                            </PMText>
                          </PMHStack>
                          {cliMultiLandingRepos.has(entry.repo.id) && (
                            <PMBox
                              paddingX="6px"
                              paddingY="1px"
                              borderRadius="sm"
                              bg="background.tertiary"
                              color="text.secondary"
                              fontFamily="mono"
                              fontSize="11px"
                            >
                              {targetLabel(entry.target)}
                            </PMBox>
                          )}
                          <PMText
                            fontSize="11px"
                            color="faded"
                            fontVariantNumeric="tabular-nums"
                            marginLeft="auto"
                          >
                            {entry.behindArtifacts.length} component
                            {entry.behindArtifacts.length === 1 ? '' : 's'} to
                            update
                          </PMText>
                        </PMHStack>
                      ))}
                    </PMVStack>
                  </PMVStack>
                );
              })}
            </PMVStack>
          </PMVStack>
        </PMBox>
      )}
    </PMBox>
  );
}

function NothingToDistribute() {
  return (
    <PMVStack gap={2} align="center" paddingY={10}>
      <PMIcon fontSize="2xl" color="success">
        <LuCircleCheck />
      </PMIcon>
      <PMText fontSize="sm" color="primary" fontWeight="medium">
        Nothing to distribute.
      </PMText>
      <PMText fontSize="xs" color="secondary">
        Every component is on its latest version on every distribution.
      </PMText>
    </PMVStack>
  );
}

function SuccessSurface({
  stats,
  marketplaceStats,
  marketplaceOutcome,
  onClose,
  autoUpdateHref,
}: Readonly<{
  stats: {
    installCount: number;
    packageCount: number;
    artifactUpdateCount: number;
  };
  marketplaceStats: { pluginCount: number; marketplaceCount: number };
  marketplaceOutcome: MarketplaceDistributionResult | null;
  onClose: () => void;
  autoUpdateHref: string | null;
}>) {
  const started = marketplaceOutcome?.accepted ?? 0;
  const refused = marketplaceOutcome?.failed ?? 0;
  const hadMarketplaces = marketplaceStats.pluginCount > 0;
  const hadRepositories = stats.installCount > 0;
  return (
    <PMBox
      bg="background.primary"
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="md"
      overflow="hidden"
      padding={8}
      animation="fade-in 120ms ease-out"
    >
      <PMVStack gap={4} align="start" maxW="68ch">
        <PMHStack gap={3} align="center">
          <PMIcon fontSize="xl" color="success">
            <LuCheck />
          </PMIcon>
          {/*
            "Updated" is a claim about the end state, and it only holds for the
            repository half: a plugin's pull request has to be merged by someone
            before anything on the catalog changes. So the heading steps back to
            what is true of both as soon as a catalog is in the batch.
          */}
          <PMHeading level="h3">
            {hadMarketplaces ? 'Distribution started' : 'Distributions updated'}
          </PMHeading>
        </PMHStack>
        {hadRepositories && (
          <PMText fontSize="sm" color="secondary">
            {stats.packageCount} package{stats.packageCount === 1 ? '' : 's'}{' '}
            distributed on {stats.installCount} distribution
            {stats.installCount === 1 ? '' : 's'} ({stats.artifactUpdateCount}{' '}
            component update{stats.artifactUpdateCount === 1 ? '' : 's'} in
            total). Each distribution received a direct commit on its configured
            branch bringing the bundled components to their Packmind version.
            Those distributions are now aligned.
          </PMText>
        )}
        {/*
          Stated apart from the sentence above, and in the present continuous,
          because this half is not finished: the reader who reads "now aligned"
          and then looks at the catalog would find the old version there until
          the pull request lands. The rail goes on reporting these plugins as
          drifted until it does, which is the honest reading and not a bug.
        */}
        {hadMarketplaces && started > 0 && (
          <PMText fontSize="sm" color="secondary">
            {started} plugin{started === 1 ? '' : 's'} on{' '}
            {marketplaceStats.marketplaceCount} marketplace
            {marketplaceStats.marketplaceCount === 1 ? '' : 's'}{' '}
            {started === 1 ? 'is' : 'are'} being distributed. Each opens a pull
            request on the marketplace repository, and stays drifted until
            someone merges it.
          </PMText>
        )}
        {refused > 0 && (
          <PMText fontSize="sm" color="error">
            {refused} plugin{refused === 1 ? '' : 's'} could not be sent. The
            marketplace refused {refused === 1 ? 'it' : 'them'}, and the reason
            was reported when it happened.
          </PMText>
        )}
        {/*
          The offer, made here and nowhere else on the way in.

          It reads as a description of what just happened rather than as a
          pitch, which is the whole reason it waits for this screen: the reader
          has done the scheduler's job by hand and the sentence names it. Above,
          on the listing that started the flow, the same link was a control in
          the header competing with the list it sat on.

          Second sentence, not a heading and not an alert. Nothing has gone
          wrong, so nothing here raises its voice.
        */}
        {autoUpdateHref && hadRepositories && (
          <PMText fontSize="sm" color="tertiary">
            Auto-update makes this same commit on a schedule, so the next
            version lands without anyone opening this screen.
          </PMText>
        )}
        <PMHStack gap={2} paddingTop={2}>
          {/*
            "Done", not "Back to overview". This surface is mounted from four
            places and none of them is an overview any more: two are tabs of a
            package, which is where it returns to, and the space-level one is
            Distribution. A control should name what it does rather than the
            screen it happens to land on, and here it dismisses the receipt.
          */}
          <PMButton variant="primary" size="sm" onClick={onClose}>
            Done
          </PMButton>
          {/*
            Offered against the commit it just described. A batch of catalogs
            alone made no commit, so the sentence above has nothing to point at
            and the offer would be a feature pitch on a receipt.
          */}
          {autoUpdateHref && hadRepositories && (
            <PMButton variant="secondary" size="sm" asChild>
              <Link to={autoUpdateHref}>Set up Auto-update</Link>
            </PMButton>
          )}
        </PMHStack>
      </PMVStack>
    </PMBox>
  );
}
