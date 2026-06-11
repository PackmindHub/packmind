import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PMBox,
  PMButton,
  PMCheckbox,
  PMHStack,
  PMHeading,
  PMIcon,
  PMSpinner,
  PMText,
  PMVStack,
} from '@packmind/ui';
import {
  LuArrowRight,
  LuBookOpen,
  LuCheck,
  LuCircleCheck,
  LuClock,
  LuGitBranch,
  LuRotateCw,
  LuTerminal,
  LuWandSparkles,
  LuX,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';
import {
  installDriftEntries,
  STALE_DAYS_THRESHOLD,
  type InstallDriftEntry,
} from '../data';
import type { ArtifactKind, PackageDrift } from '../types';

const KIND_ICON: Record<ArtifactKind, IconType> = {
  standard: LuBookOpen,
  command: LuTerminal,
  skill: LuWandSparkles,
};

export type SyncScope =
  | { kind: 'all' }
  | { kind: 'package'; packageId: string; installKeys?: string[] };

type PackageBlock = {
  pkg: PackageDrift;
  driftedEntries: InstallDriftEntry[];
};

function installSelectionKey(
  pkgId: string,
  repoId: string,
  targetId: string,
): string {
  return `${pkgId}::${repoId}::${targetId}`;
}

function localInstallKey(repoId: string, targetId: string): string {
  return `${repoId}::${targetId}`;
}

type SyncStep = 'review' | 'syncing' | 'success';

type SyncSurfaceProps = {
  packages: PackageDrift[];
  scope: SyncScope;
  onCancel: () => void;
  onConfirm: () => void;
};

export function SyncSurface({
  packages,
  scope,
  onCancel,
  onConfirm,
}: Readonly<SyncSurfaceProps>) {
  const blocks = useMemo<PackageBlock[]>(
    () => buildPackageBlocks(packages, scope),
    [packages, scope],
  );

  const initialSelection = useMemo<Set<string>>(() => {
    const next = new Set<string>();
    const explicitKeys =
      scope.kind === 'package' && scope.installKeys
        ? new Set(scope.installKeys)
        : null;
    for (const block of blocks) {
      for (const entry of block.driftedEntries) {
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
  }, [blocks, scope]);

  const [selected, setSelected] = useState<Set<string>>(initialSelection);
  const [step, setStep] = useState<SyncStep>('review');

  const toggleInstall = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const togglePackage = useCallback((block: PackageBlock, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const entry of block.driftedEntries) {
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
  }, []);

  const stats = useMemo(() => {
    const installs = new Set<string>();
    const packagesTouched = new Set<string>();
    let updatedArtifacts = 0;
    for (const block of blocks) {
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
  }, [blocks, selected]);

  const handleConfirm = useCallback(() => {
    if (stats.installCount === 0) return;
    setStep('syncing');
  }, [stats.installCount]);

  useEffect(() => {
    if (step !== 'syncing') return;
    const id = window.setTimeout(() => {
      setStep('success');
      onConfirm();
    }, 1400);
    return () => window.clearTimeout(id);
  }, [step, onConfirm]);

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
        handleConfirm();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel, handleConfirm, stats.installCount, step]);

  if (step === 'success') {
    return <SuccessSurface stats={stats} onClose={onCancel} />;
  }

  const isSyncing = step === 'syncing';

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
              Each selected distribution receives a direct commit on its
              configured branch bringing every bundled artifact to its Packmind
              version. Packages are redistributed as a whole, not artifact by
              artifact.
            </PMText>
          </PMVStack>
          <PMBox
            as="button"
            type="button"
            onClick={onCancel}
            disabled={isSyncing}
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

      <PMBox
        opacity={isSyncing ? 0.55 : 1}
        pointerEvents={isSyncing ? 'none' : 'auto'}
        transition="opacity 200ms ease-out"
        padding={6}
      >
        {blocks.length === 0 ? (
          <NothingToSync />
        ) : (
          <PMVStack gap={4} align="stretch">
            {blocks.map((block) => (
              <PackageSyncBlock
                key={block.pkg.id}
                block={block}
                selected={selected}
                onToggleInstall={toggleInstall}
                onTogglePackage={(on) => togglePackage(block, on)}
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
              <PMSpinner size="sm" color="branding.primary" />
              <PMText fontSize="sm" color="secondary">
                Pushing to {stats.installCount} distribution
                {stats.installCount === 1 ? '' : 's'}…
              </PMText>
            </PMHStack>
          ) : (
            <PMText fontSize="xs" color="text.faded">
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
              onClick={handleConfirm}
              disabled={stats.installCount === 0 || isSyncing}
            >
              <PMIcon fontSize="sm">
                <LuRotateCw />
              </PMIcon>
              {isSyncing
                ? 'Redistributing…'
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
  if (scope.kind === 'all') return 'Distribute all packages';
  const pkg = blocks[0]?.pkg;
  return pkg ? `Distribute ${pkg.name}` : 'Distribute package';
}

function buildPackageBlocks(
  packages: PackageDrift[],
  scope: SyncScope,
): PackageBlock[] {
  const out: PackageBlock[] = [];
  for (const pkg of packages) {
    if (scope.kind === 'package' && pkg.id !== scope.packageId) continue;
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
  onToggleInstall: (key: string) => void;
  onTogglePackage: (on: boolean) => void;
};

function PackageSyncBlock({
  block,
  selected,
  onToggleInstall,
  onTogglePackage,
}: Readonly<PackageSyncBlockProps>) {
  const total = block.driftedEntries.length;
  const selectedCount = block.driftedEntries.reduce(
    (acc, entry) =>
      acc +
      (selected.has(
        installSelectionKey(block.pkg.id, entry.repo.id, entry.target.id),
      )
        ? 1
        : 0),
    0,
  );
  const allSelected = selectedCount === total;
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
        borderBottomWidth="1px"
        borderColor="border.tertiary"
      >
        <PMHStack gap={3} align="center" justify="space-between">
          <PMHStack gap={3} align="center" minW={0} flex={1}>
            <PMCheckbox
              size="sm"
              checked={
                allSelected ? true : noneSelected ? false : 'indeterminate'
              }
              onCheckedChange={(details) =>
                onTogglePackage(details.checked === true)
              }
              aria-label={`Select all repos for ${block.pkg.name}`}
            />
            <PMText
              fontSize="sm"
              fontWeight="semibold"
              color="text.primary"
              truncate
            >
              {block.pkg.name}
            </PMText>
          </PMHStack>
          <PMText
            fontSize="xs"
            color="text.faded"
            fontVariantNumeric="tabular-nums"
            flexShrink={0}
          >
            {selectedCount} of {total} distribution{total === 1 ? '' : 's'}{' '}
            selected
          </PMText>
        </PMHStack>
      </PMBox>

      <PMVStack gap={0} align="stretch">
        {block.driftedEntries.map((entry) => {
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
              onToggle={() => onToggleInstall(key)}
            />
          );
        })}
      </PMVStack>
    </PMBox>
  );
}

type InstallSyncRowProps = {
  entry: InstallDriftEntry;
  selected: boolean;
  onToggle: () => void;
};

function InstallSyncRow({
  entry,
  selected,
  onToggle,
}: Readonly<InstallSyncRowProps>) {
  return (
    <PMVStack
      gap={0}
      align="stretch"
      bg={selected ? 'background.secondary' : 'background.primary'}
      borderBottomWidth="1px"
      borderColor="border.tertiary"
      _last={{ borderBottom: 'none' }}
      transition="background-color 120ms ease-out"
    >
      <PMHStack
        gap={3}
        align="center"
        paddingX={4}
        paddingY={2.5}
        cursor="pointer"
        onClick={onToggle}
        _hover={{ bg: 'background.tertiary' }}
      >
        <PMCheckbox
          size="sm"
          checked={selected}
          onCheckedChange={() => onToggle()}
          aria-label={`Select ${entry.repo.owner}/${entry.repo.name}${entry.target.isDefault ? '' : ' (' + entry.target.name + ')'}`}
        />
        <PMHStack gap={2} align="center" flex={1} minW={0} wrap="wrap">
          <PMText fontSize="sm" color="text.primary" truncate>
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
          <PMText
            fontSize="xs"
            color="text.faded"
            fontVariantNumeric="tabular-nums"
          >
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
                Last push {entry.mostRecentDeployedAt}
              </PMText>
            </PMHStack>
          )}
        </PMVStack>
      </PMHStack>
      {selected && (
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
                    color="text.secondary"
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
                    color="text.faded"
                    fontVariantNumeric="tabular-nums"
                  >
                    v{b.deployedVersion}
                  </PMText>
                  <PMIcon fontSize="xs" color="text.faded">
                    <LuArrowRight />
                  </PMIcon>
                  <PMText
                    fontSize="xs"
                    color="text.primary"
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

function NothingToSync() {
  return (
    <PMVStack gap={2} align="center" paddingY={10}>
      <PMIcon fontSize="2xl" color="green.500">
        <LuCircleCheck />
      </PMIcon>
      <PMText fontSize="sm" color="text.primary" fontWeight="medium">
        Nothing to distribute.
      </PMText>
      <PMText fontSize="xs" color="text.secondary">
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
          <PMIcon fontSize="xl" color="green.500">
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
