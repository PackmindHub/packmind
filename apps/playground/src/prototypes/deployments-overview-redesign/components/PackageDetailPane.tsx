import { useEffect, useMemo, useState } from 'react';
import {
  PMAlert,
  PMBox,
  PMButton,
  PMCheckbox,
  PMHStack,
  PMHeading,
  PMIcon,
  PMText,
  PMVStack,
} from '@packmind/ui';
import {
  LuArrowRight,
  LuBookOpen,
  LuChevronDown,
  LuChevronRight,
  LuClock,
  LuGitBranch,
  LuRotateCw,
  LuTerminal,
  LuWandSparkles,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';
import {
  installDriftEntries,
  packageBehindInstallCount,
  packageMostRecentPush,
  STALE_DAYS_THRESHOLD,
  type InstallDriftEntry,
} from '../data';
import type { ArtifactKind, PackageDrift } from '../types';

const KIND_ICON: Record<ArtifactKind, IconType> = {
  standard: LuBookOpen,
  command: LuTerminal,
  skill: LuWandSparkles,
};

type PackageDetailPaneProps = {
  pkg: PackageDrift;
  onSyncPackage: (pkgId: string, installKeys?: string[]) => void;
};

function installKey(repoId: string, targetId: string): string {
  return `${repoId}::${targetId}`;
}

export function PackageDetailPane({
  pkg,
  onSyncPackage,
}: Readonly<PackageDetailPaneProps>) {
  const totalInstalls = pkg.installLocations.length;
  const behindInstallCount = packageBehindInstallCount(pkg);
  const hasDrift = behindInstallCount > 0;
  const mostRecentPush = useMemo(() => packageMostRecentPush(pkg), [pkg]);

  const entries = useMemo(() => installDriftEntries(pkg), [pkg]);
  const driftedKeys = useMemo(
    () =>
      entries
        .filter((e) => e.behindArtifacts.length > 0)
        .map((e) => installKey(e.repo.id, e.target.id)),
    [entries],
  );

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    setSelectedKeys(new Set());
  }, [pkg.id]);

  const toggleInstall = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedDriftedCount = useMemo(() => {
    let count = 0;
    for (const key of driftedKeys) {
      if (selectedKeys.has(key)) count += 1;
    }
    return count;
  }, [driftedKeys, selectedKeys]);

  return (
    <PMVStack gap={0} align="stretch" minH={0}>
      <PMBox
        paddingX={6}
        paddingY={5}
        borderBottomWidth="1px"
        borderColor="border.tertiary"
        bg="background.primary"
      >
        <PMVStack gap={3} align="stretch">
          <PMHStack gap={3} align="start" justify="space-between">
            <PMVStack gap={1.5} align="start" flex={1} minW={0}>
              <PMHeading size="md" color="text.primary" letterSpacing="-0.01em">
                {pkg.name}
              </PMHeading>
              <PMText fontSize="sm" color="text.secondary" maxW="68ch">
                {pkg.description}
              </PMText>
            </PMVStack>
            {hasDrift && (
              <PMButton
                variant="secondary"
                size="sm"
                onClick={() => onSyncPackage(pkg.id)}
                title={`Distribute package across ${behindInstallCount} distribution${behindInstallCount === 1 ? '' : 's'}`}
              >
                <PMIcon fontSize="sm">
                  <LuRotateCw />
                </PMIcon>
                Distribute package
              </PMButton>
            )}
          </PMHStack>
          <PMHStack gap={5} align="center" wrap="wrap">
            <SummaryStat
              label="Artifacts"
              value={pkg.artifacts.length.toString()}
            />
            <SummaryStat
              label="Distributions"
              value={totalInstalls.toString()}
            />
            {hasDrift ? (
              <SummaryStat
                label="Drift"
                value={`${behindInstallCount} distribution${behindInstallCount === 1 ? '' : 's'} behind`}
                tone="warn"
              />
            ) : (
              <SummaryStat
                label="Latest push"
                value={mostRecentPush?.label ?? '—'}
                tone={
                  mostRecentPush && mostRecentPush.days >= STALE_DAYS_THRESHOLD
                    ? 'warn'
                    : 'ok'
                }
              />
            )}
          </PMHStack>
          {!hasDrift && (
            <PMAlert.Root status="success">
              <PMAlert.Indicator />
              <PMAlert.Title>
                All {totalInstalls} distribution
                {totalInstalls === 1 ? '' : 's'} are on the latest version of
                every bundled artifact.
              </PMAlert.Title>
            </PMAlert.Root>
          )}
        </PMVStack>
      </PMBox>

      <PMBox flex="1" overflow="auto" minH={0}>
        <PMVStack gap={0} align="stretch">
          {entries.map((entry) => {
            const key = installKey(entry.repo.id, entry.target.id);
            return (
              <InstallRow
                key={key}
                entry={entry}
                selected={selectedKeys.has(key)}
                onToggle={() => toggleInstall(key)}
              />
            );
          })}
        </PMVStack>
      </PMBox>

      {hasDrift && (
        <PMBox
          paddingX={6}
          paddingY={4}
          borderTopWidth="1px"
          borderColor="border.tertiary"
          bg="background.secondary"
          position="sticky"
          bottom={0}
        >
          <PMHStack gap={3} align="center" justify="space-between">
            <PMText fontSize="xs" color="text.secondary">
              {selectedDriftedCount === 0
                ? 'Select distributions to redistribute the package.'
                : `${selectedDriftedCount} of ${behindInstallCount} drifted distribution${behindInstallCount === 1 ? '' : 's'} selected.`}
            </PMText>
            <PMButton
              variant="primary"
              size="sm"
              disabled={selectedDriftedCount === 0}
              onClick={() =>
                onSyncPackage(
                  pkg.id,
                  Array.from(selectedKeys).filter((k) =>
                    driftedKeys.includes(k),
                  ),
                )
              }
            >
              <PMIcon fontSize="sm">
                <LuRotateCw />
              </PMIcon>
              Redistribute to selected
            </PMButton>
          </PMHStack>
        </PMBox>
      )}
    </PMVStack>
  );
}

function SummaryStat({
  label,
  value,
  tone = 'neutral',
}: Readonly<{
  label: string;
  value: string;
  tone?: 'neutral' | 'ok' | 'warn';
}>) {
  const color =
    tone === 'warn'
      ? 'orange.500'
      : tone === 'ok'
        ? 'green.500'
        : 'text.primary';
  return (
    <PMHStack gap={1.5} align="baseline">
      <PMText
        fontSize="11px"
        textTransform="uppercase"
        letterSpacing="wider"
        color="text.faded"
        fontWeight="semibold"
      >
        {label}
      </PMText>
      <PMText
        fontSize="sm"
        fontWeight="medium"
        color={color}
        fontVariantNumeric="tabular-nums"
      >
        {value}
      </PMText>
    </PMHStack>
  );
}

type InstallRowProps = {
  entry: InstallDriftEntry;
  selected: boolean;
  onToggle: () => void;
};

function InstallRow({ entry, selected, onToggle }: Readonly<InstallRowProps>) {
  const behindCount = entry.behindArtifacts.length;
  const hasDrift = behindCount > 0;
  const [expanded, setExpanded] = useState(false);
  const totalArtifactsOnInstall = behindCount + entry.alignedArtifactCount;

  return (
    <PMBox
      borderBottomWidth="1px"
      borderColor="border.tertiary"
      bg={hasDrift && selected ? 'background.secondary' : 'background.primary'}
      transition="background-color 120ms ease-out"
    >
      <PMHStack gap={3} align="center" paddingX={6} paddingY={3}>
        <PMBox flexShrink={0} display="flex" alignItems="center" width="20px">
          {hasDrift ? (
            <PMCheckbox
              size="sm"
              checked={selected}
              onCheckedChange={(details) => {
                void details;
                onToggle();
              }}
              aria-label={`Select ${entry.repo.owner}/${entry.repo.name}${entry.target.isDefault ? '' : ' (' + entry.target.name + ')'}`}
            />
          ) : null}
        </PMBox>

        <PMBox
          as="button"
          type="button"
          onClick={() => setExpanded((v) => !v)}
          bg="transparent"
          border="none"
          cursor="pointer"
          flex={1}
          minW={0}
          textAlign="left"
          paddingY={1}
          _hover={{ color: 'text.primary' }}
          _focusVisible={{
            outline: '2px solid',
            outlineColor: 'branding.primary',
            outlineOffset: '2px',
            borderRadius: 'sm',
          }}
          aria-expanded={expanded}
          disabled={!hasDrift}
        >
          <PMHStack gap={2} align="center" wrap="wrap">
            {hasDrift && (
              <PMIcon fontSize="sm" color="text.secondary">
                {expanded ? <LuChevronDown /> : <LuChevronRight />}
              </PMIcon>
            )}
            <PMText
              fontSize="sm"
              fontWeight="medium"
              color="text.primary"
              truncate
            >
              {entry.repo.owner}/{entry.repo.name}
            </PMText>
            <BranchChip branch={entry.branch} />
            {!entry.target.isDefault && <TargetChip name={entry.target.name} />}
          </PMHStack>
        </PMBox>

        <PMVStack gap={0.5} align="flex-end" flexShrink={0}>
          <PMHStack gap={1.5} align="center">
            <PMBox
              width="6px"
              height="6px"
              borderRadius="full"
              bg={hasDrift ? 'orange.500' : 'green.500'}
              aria-hidden
            />
            {hasDrift ? (
              <PMText
                fontSize="xs"
                color="orange.500"
                fontVariantNumeric="tabular-nums"
              >
                {behindCount} of {totalArtifactsOnInstall} artifact
                {totalArtifactsOnInstall === 1 ? '' : 's'} behind
              </PMText>
            ) : (
              <PMText fontSize="xs" color="text.faded">
                All aligned
              </PMText>
            )}
          </PMHStack>
          <LastPushLabel
            value={entry.mostRecentDeployedAt}
            days={entry.mostRecentDeployedAtDays}
          />
        </PMVStack>
      </PMHStack>

      {expanded && hasDrift && (
        <PMBox
          paddingLeft="56px"
          paddingRight={6}
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
                  paddingY={1.5}
                  paddingX={2}
                  borderBottomWidth="1px"
                  borderColor="border.tertiary"
                  _last={{ borderBottom: 'none' }}
                >
                  <PMIcon fontSize="sm" color="text.faded">
                    <Icon />
                  </PMIcon>
                  <PMText
                    fontSize="sm"
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
                  <PMHStack gap={2} align="center">
                    <PMText
                      fontSize="xs"
                      color="orange.500"
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
                </PMHStack>
              );
            })}
          </PMVStack>
        </PMBox>
      )}
    </PMBox>
  );
}

function BranchChip({ branch }: Readonly<{ branch: string }>) {
  const isDefault = branch === 'main';
  return (
    <PMHStack
      gap="4px"
      align="center"
      color={isDefault ? 'text.faded' : 'text.secondary'}
      flexShrink={0}
      aria-label={`Branch ${branch}`}
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
        {branch}
      </PMText>
    </PMHStack>
  );
}

function LastPushLabel({
  value,
  days,
}: Readonly<{ value: string | null; days: number }>) {
  if (!value) return null;
  const stale = days >= STALE_DAYS_THRESHOLD;
  return (
    <PMHStack
      gap="4px"
      align="center"
      color={stale ? 'orange.500' : 'text.faded'}
      aria-label={`Last push ${value}`}
    >
      <PMIcon fontSize="11px">
        <LuClock />
      </PMIcon>
      <PMText fontSize="11px" fontVariantNumeric="tabular-nums">
        Last push {value}
      </PMText>
    </PMHStack>
  );
}

function TargetChip({ name }: Readonly<{ name: string }>) {
  return (
    <PMBox
      paddingX="6px"
      paddingY="1px"
      borderRadius="sm"
      bg="background.tertiary"
      color="text.secondary"
      fontFamily="mono"
      fontSize="11px"
      fontVariantNumeric="tabular-nums"
      lineHeight="1.4"
      flexShrink={0}
      aria-label={`Target ${name}`}
    >
      {name}
    </PMBox>
  );
}
