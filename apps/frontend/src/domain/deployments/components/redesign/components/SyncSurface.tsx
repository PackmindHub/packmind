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
  LuTerminal,
  LuTriangleAlert,
  LuWandSparkles,
  LuX,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';
import type { GitProviderId, PackageId, TargetId } from '@packmind/types';
import { useDeployPackagesMutation } from '../../../api/queries/DeploymentsQueries';
import {
  installDriftEntries,
  STALE_DAYS_THRESHOLD,
  formatRelativeDate,
  type InstallDriftEntry,
} from '../selectors/installDriftEntries';
import {
  installLockReason,
  type InstallLockReason,
} from '../selectors/installLock';
import type { ArtifactKind, PackageDrift } from '../types';

const KIND_ICON: Record<ArtifactKind, IconType> = {
  standard: LuBookOpen,
  command: LuTerminal,
  skill: LuWandSparkles,
};

export type SyncScope =
  | { kind: 'bulk'; packageIds: PackageId[] }
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
};

export function SyncSurface({
  packages,
  scope,
  providersWithToken,
  isProvidersLoading,
  onCancel,
  onConfirm,
}: Readonly<SyncSurfaceProps>) {
  const blocks = useMemo<PackageBlock[]>(
    () => buildPackageBlocks(packages, scope),
    [packages, scope],
  );

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

  const actionableAllLocked =
    actionableBlocks.length > 0 && lockCounts.selectable === 0;
  const hasNothing = actionableBlocks.length === 0 && cliBlocks.length === 0;
  const cliOnly = actionableBlocks.length === 0 && cliBlocks.length > 0;

  const [selected, setSelected] = useState<Set<string>>(initialSelection);
  const [step, setStep] = useState<SyncStep>('review');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const deployPackages = useDeployPackagesMutation();

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
    if (stats.installCount === 0) return;
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
      setStep('success');
      onConfirm();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown error while redistributing packages.';
      setErrorMessage(message);
      setStep('error');
      pmToaster.create({
        type: 'error',
        title: 'Redistribution failed',
        description: message,
      });
    }
  }, [deployPackages, onConfirm, selectionByPackage, stats.installCount]);

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
        stats.installCount > 0
      ) {
        e.preventDefault();
        void handleConfirm();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel, handleConfirm, stats.installCount, step]);

  if (step === 'success') {
    return <SuccessSurface stats={stats} onClose={onCancel} />;
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
            <PMHeading level="h3">{titleForScope(scope, blocks)}</PMHeading>
            <PMText fontSize="sm" color="secondary" maxW="68ch">
              Selected distributions receive a direct commit on their configured
              branch bringing every bundled artifact to its Packmind version.
              Distributions without a connected provider are listed separately
              and must be updated via{' '}
              <PMText as="span" fontFamily="mono" fontSize="xs">
                packmind-cli install
              </PMText>
              .
            </PMText>
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
            aria-label="Cancel sync"
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
          <NothingToSync />
        ) : (
          <PMVStack gap={4} align="stretch">
            {cliOnly ? (
              <NoActionableNote />
            ) : actionableAllLocked ? (
              <AllInProgressState count={lockCounts.inProgress} />
            ) : (
              <>
                <LockSummary
                  ready={lockCounts.selectable}
                  inProgress={lockCounts.inProgress}
                />
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
                Pushing to {stats.installCount} distribution
                {stats.installCount === 1 ? '' : 's'}…
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
              disabled={stats.installCount === 0 || isSyncing}
            >
              <PMIcon fontSize="sm">
                <LuRotateCw />
              </PMIcon>
              {isSyncing
                ? 'Redistributing…'
                : cliOnly
                  ? 'Nothing to redistribute from the app'
                  : actionableAllLocked
                    ? 'Waiting on in-progress distributions'
                    : stats.installCount === 0
                      ? 'Select at least one distribution'
                      : `Redistribute ${stats.packageCount} package${
                          stats.packageCount === 1 ? '' : 's'
                        } to ${stats.installCount} distribution${
                          stats.installCount === 1 ? '' : 's'
                        }`}
            </PMButton>
          </PMHStack>
        </PMHStack>
      </PMBox>
    </PMBox>
  );
}

function titleForScope(scope: SyncScope, blocks: PackageBlock[]): string {
  if (scope.kind === 'bulk') {
    const n = blocks.length;
    return `Distribute ${n} package${n === 1 ? '' : 's'}`;
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
  const out: PackageBlock[] = [];
  for (const pkg of packages) {
    if (scope.kind === 'package' && pkg.id !== scope.packageId) continue;
    if (bulkAllowed && !bulkAllowed.has(pkg.id)) continue;
    const driftedEntries = installDriftEntries(pkg).filter(
      (e) => e.behindArtifacts.length > 0,
    );
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
                aria-label={`Select all repos for ${block.pkg.name}`}
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

const LOCK_ROW_TOOLTIP: Record<LockReason, string> = {
  'in-progress':
    'Distribution currently in progress — wait for it to finish before redistributing.',
  'no-app-token':
    'This provider has no token — use `packmind-cli install` to update this distribution.',
};

const LOCK_ROW_BADGE: Record<
  LockReason,
  { label: string; colorPalette: 'blue' | 'orange' }
> = {
  'in-progress': { label: 'In progress', colorPalette: 'blue' },
  'no-app-token': { label: 'CLI only', colorPalette: 'orange' },
};

type InstallSyncRowProps = {
  entry: InstallDriftEntry;
  selected: boolean;
  lockReason: LockReason | null;
  onToggle: () => void;
};

function InstallSyncRow({
  entry,
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
      aria-label={`Select ${entry.repo.owner}/${entry.repo.name}${entry.target.isDefault ? '' : ' (' + entry.target.name + ')'}`}
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
              aria-label={`${expanded ? 'Collapse' : 'Expand'} artifacts to update`}
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
          {!entry.target.isDefault && (
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
              {entry.target.name}
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
            {entry.behindArtifacts.length} artifact
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
          {` in progress`}
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
        Nothing to redistribute from the app right now.
      </PMText>
      <PMText fontSize="xs" color="secondary" textAlign="center" maxW="56ch">
        {count === 1
          ? 'The only drifted distribution is currently in progress. Wait for it to finish, then come back to redistribute.'
          : `All ${count} drifted distributions are currently in progress. Wait for them to finish, then come back to redistribute.`}
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
        Nothing to push from the app — every drifted distribution lives on a
        provider without a connected token. Use the CLI section below.
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
      await navigator.clipboard.writeText('packmind-cli install');
      pmToaster.create({
        type: 'success',
        title: 'Copied',
        description: '`packmind-cli install` copied to your clipboard.',
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
                packmind-cli install
              </PMText>
            </PMText>
          </PMHStack>
          <PMText fontSize="xs" color="faded" fontVariantNumeric="tabular-nums">
            across {reposCount} repo{reposCount === 1 ? '' : 's'}
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
                packmind-cli install
              </PMText>
              <PMButton variant="tertiary" size="sm" onClick={handleCopy}>
                Copy
              </PMButton>
            </PMHStack>
            <PMText fontSize="xs" color="secondary">
              Run the command from each repo below — it syncs every Packmind
              package configured on that repo at once.
            </PMText>
            <PMVStack gap={3} align="stretch">
              {cliBlocks.map((block) => (
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
                        {!entry.target.isDefault && (
                          <PMBox
                            paddingX="6px"
                            paddingY="1px"
                            borderRadius="sm"
                            bg="background.tertiary"
                            color="text.secondary"
                            fontFamily="mono"
                            fontSize="11px"
                          >
                            {entry.target.name}
                          </PMBox>
                        )}
                        <PMText
                          fontSize="11px"
                          color="faded"
                          fontVariantNumeric="tabular-nums"
                          marginLeft="auto"
                        >
                          {entry.behindArtifacts.length} artifact
                          {entry.behindArtifacts.length === 1 ? '' : 's'} behind
                        </PMText>
                      </PMHStack>
                    ))}
                  </PMVStack>
                </PMVStack>
              ))}
            </PMVStack>
          </PMVStack>
        </PMBox>
      )}
    </PMBox>
  );
}

function NothingToSync() {
  return (
    <PMVStack gap={2} align="center" paddingY={10}>
      <PMIcon fontSize="2xl" color="success">
        <LuCircleCheck />
      </PMIcon>
      <PMText fontSize="sm" color="primary" fontWeight="medium">
        Nothing to distribute.
      </PMText>
      <PMText fontSize="xs" color="secondary">
        Every artifact is on its latest version on every distribution.
      </PMText>
    </PMVStack>
  );
}

function SuccessSurface({
  stats,
  onClose,
}: Readonly<{
  stats: {
    installCount: number;
    packageCount: number;
    artifactUpdateCount: number;
  };
  onClose: () => void;
}>) {
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
          <PMHeading level="h3">Distributions updated</PMHeading>
        </PMHStack>
        <PMText fontSize="sm" color="secondary">
          {stats.packageCount} package{stats.packageCount === 1 ? '' : 's'}{' '}
          redistributed on {stats.installCount} distribution
          {stats.installCount === 1 ? '' : 's'} ({stats.artifactUpdateCount}{' '}
          artifact update{stats.artifactUpdateCount === 1 ? '' : 's'} in total).
          Each distribution received a direct commit on its configured branch
          bringing the bundled artifacts to their Packmind version. Those
          distributions are now back in line.
        </PMText>
        <PMHStack gap={2} paddingTop={2}>
          <PMButton variant="primary" size="sm" onClick={onClose}>
            Back to overview
          </PMButton>
        </PMHStack>
      </PMVStack>
    </PMBox>
  );
}
