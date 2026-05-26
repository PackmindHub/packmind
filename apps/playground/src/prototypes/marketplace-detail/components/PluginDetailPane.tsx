import { useMemo, useState } from 'react';
import {
  PMBadge,
  PMBox,
  PMButton,
  PMHStack,
  PMHeading,
  PMIcon,
  PMStatus,
  PMTable,
  PMText,
  PMVStack,
  type PMTableColumn,
  type PMTableRow,
} from '@packmind/ui';
import { getSpaceColorPalette } from '../spaceColor';
import {
  LuBookCheck,
  LuChevronRight,
  LuLock,
  LuMinus,
  LuPencil,
  LuPlus,
  LuRotateCw,
  LuTerminal,
  LuTriangleAlert,
  LuWandSparkles,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';
import type {
  Artifact,
  ArtifactKind,
  Installer,
  Plugin,
  RepoAdoption,
  SourcePackageChange,
  SourcePackageSync,
} from '../types';

type PluginDetailPaneProps = {
  plugin: Plugin;
  unreachable: boolean;
};

const KIND_ICON: Record<ArtifactKind, IconType> = {
  standard: LuBookCheck,
  command: LuTerminal,
  skill: LuWandSparkles,
};

const KIND_LABEL: Record<ArtifactKind, string> = {
  standard: 'Standards',
  command: 'Commands',
  skill: 'Skills',
};

const KIND_LABEL_SINGULAR: Record<ArtifactKind, string> = {
  standard: 'Standard',
  command: 'Command',
  skill: 'Skill',
};

const KIND_ORDER: ArtifactKind[] = ['standard', 'command', 'skill'];

type DetailTabId = 'overview' | 'changes' | 'adoption';

export function PluginDetailPane({
  plugin,
  unreachable,
}: Readonly<PluginDetailPaneProps>) {
  const {
    name,
    version,
    mandatory,
    owner,
    description,
    lastPublishedRelative,
    sourceSync,
    adoption,
    artifacts,
  } = plugin;

  const grouped = groupArtifacts(artifacts);
  const [tab, setTab] = useState<DetailTabId>('overview');
  const [outdatedOnly, setOutdatedOnly] = useState(false);

  const handleViewOutdated = () => {
    setOutdatedOnly(true);
    setTab('adoption');
  };

  const handleViewChanges = () => {
    setTab('changes');
  };

  return (
    <PMBox
      paddingX={8}
      paddingY={6}
      maxW="960px"
      opacity={unreachable ? 0.7 : 1}
    >
      <PMVStack gap={5} align="stretch">
        <IdentityStrip
          name={name}
          mandatory={mandatory}
          ownerName={owner.name}
          lastPublishedRelative={lastPublishedRelative}
        />

        <VersionTrail
          publishedVersion={version}
          sourceSync={sourceSync}
          adoption={adoption}
          unreachable={unreachable}
          onViewChanges={handleViewChanges}
          onViewOutdated={handleViewOutdated}
        />

        <DetailTabs active={tab} onChange={setTab} />

        {tab === 'overview' && (
          <PMVStack gap={6} align="stretch">
            <DescriptionBlock description={description} />
            <ArtifactsBlock grouped={grouped} />
          </PMVStack>
        )}
        {tab === 'changes' && (
          <ChangesBlock sourceSync={sourceSync} unreachable={unreachable} />
        )}
        {tab === 'adoption' && (
          <AdoptionBlock
            adoption={adoption}
            version={version}
            unreachable={unreachable}
            outdatedOnly={outdatedOnly}
            onClearFilter={() => setOutdatedOnly(false)}
          />
        )}
      </PMVStack>
    </PMBox>
  );
}

type DetailTabsProps = {
  active: DetailTabId;
  onChange: (next: DetailTabId) => void;
};

function DetailTabs({ active, onChange }: Readonly<DetailTabsProps>) {
  return (
    <PMHStack
      gap={6}
      align="center"
      borderBottom="1px solid"
      borderColor="border.tertiary"
    >
      <TabButton
        active={active === 'overview'}
        onClick={() => onChange('overview')}
        paddingY={3}
      >
        Overview
      </TabButton>
      <TabButton
        active={active === 'changes'}
        onClick={() => onChange('changes')}
        paddingY={3}
      >
        Changes
      </TabButton>
      <TabButton
        active={active === 'adoption'}
        onClick={() => onChange('adoption')}
        paddingY={3}
      >
        Adoption
      </TabButton>
    </PMHStack>
  );
}

type IdentityStripProps = {
  name: string;
  mandatory: boolean;
  ownerName: string;
  lastPublishedRelative: string;
};

function IdentityStrip({
  name,
  mandatory,
  ownerName,
  lastPublishedRelative,
}: Readonly<IdentityStripProps>) {
  return (
    <PMVStack gap={2} align="start">
      <PMHStack gap={3} align="center" wrap="wrap">
        <PMHeading size="lg" color="primary">
          {name}
        </PMHeading>
        {mandatory && <MandatoryChip />}
      </PMHStack>
      <PMHStack gap={2} align="center" wrap="wrap">
        <OwnerChip name={ownerName} />
        <Dot />
        <PMText fontSize="xs" color="text.faded">
          last published {lastPublishedRelative}
        </PMText>
      </PMHStack>
    </PMVStack>
  );
}

function MandatoryChip() {
  return (
    <PMHStack
      gap={1}
      align="center"
      bg="background.tertiary"
      paddingX="6px"
      paddingY="2px"
      borderRadius="sm"
    >
      <PMIcon fontSize="11px" color="text.secondary">
        <LuLock />
      </PMIcon>
      <PMText
        fontSize="xs"
        color="text.secondary"
        fontWeight="medium"
        letterSpacing="0.025em"
      >
        mandatory
      </PMText>
    </PMHStack>
  );
}

function OwnerChip({ name }: Readonly<{ name: string }>) {
  return (
    <PMBadge size="md">
      <PMStatus.Root colorPalette={getSpaceColorPalette(name)}>
        <PMStatus.Indicator />
      </PMStatus.Root>
      {name}
    </PMBadge>
  );
}

function Dot() {
  return (
    <PMText fontSize="xs" color="faded" aria-hidden>
      &middot;
    </PMText>
  );
}

function DescriptionBlock({ description }: Readonly<{ description: string }>) {
  return (
    <PMText fontSize="md" color="text.secondary" lineHeight={1.55} maxW="70ch">
      {description}
    </PMText>
  );
}

type VersionTrailProps = {
  publishedVersion: string;
  sourceSync: SourcePackageSync;
  adoption: Plugin['adoption'];
  unreachable: boolean;
  onViewChanges: () => void;
  onViewOutdated: () => void;
};

function VersionTrail({
  publishedVersion,
  sourceSync,
  adoption,
  unreachable,
  onViewChanges,
  onViewOutdated,
}: Readonly<VersionTrailProps>) {
  const curatedVersion = sourceSync.sourceVersion;
  const hasPublishDrift = sourceSync.state === 'behind';
  const publishDriftCount = hasPublishDrift ? sourceSync.changes.length : 0;

  const { reposOnVersion, outdatedRepos } = adoption;
  const latestCount = reposOnVersion;
  const behindCount = outdatedRepos;
  const totalCount = latestCount + behindCount;
  const hasAdoptionDrift = behindCount > 0;

  const installedValue =
    totalCount === 0
      ? 'no repos'
      : behindCount === 0
        ? `${latestCount} / ${latestCount}`
        : `${latestCount} / ${totalCount}`;

  const installedSub =
    totalCount === 0
      ? 'no consumers yet'
      : behindCount === 0
        ? 'all on latest'
        : 'on latest';

  return (
    <PMVStack
      gap={4}
      align="stretch"
      paddingY={5}
      borderTopWidth="1px"
      borderBottomWidth="1px"
      borderColor="border.tertiary"
    >
      <PMBox
        display="grid"
        gridTemplateColumns="auto 1fr auto 1fr auto"
        alignItems="start"
        columnGap={4}
        rowGap={2}
      >
        <TrailTier
          label="Curated"
          value={`v${curatedVersion}`}
          sub="in space"
        />
        <TrailConnector
          drift={hasPublishDrift && !unreachable}
          driftLabel={
            publishDriftCount === 1
              ? '1 change ready'
              : `${publishDriftCount} changes ready`
          }
          inSyncLabel={unreachable ? 'coverage unavailable' : 'in sync'}
          dimmed={unreachable}
          action={
            hasPublishDrift && !unreachable
              ? {
                  label:
                    publishDriftCount === 1
                      ? 'View 1 change'
                      : `View ${publishDriftCount} changes`,
                  onClick: onViewChanges,
                }
              : undefined
          }
        />
        <TrailTier
          label="Published"
          value={`v${publishedVersion}`}
          sub="in marketplace"
        />
        <TrailConnector
          drift={hasAdoptionDrift && !unreachable}
          driftLabel={
            behindCount === 1 ? '1 repo behind' : `${behindCount} repos behind`
          }
          inSyncLabel={
            unreachable
              ? 'coverage unavailable'
              : totalCount === 0
                ? 'no consumers'
                : 'all on latest'
          }
          action={
            hasAdoptionDrift && !unreachable
              ? {
                  label: `View ${behindCount} behind`,
                  onClick: onViewOutdated,
                }
              : undefined
          }
          dimmed={unreachable}
        />
        <TrailTier
          label="Installed"
          value={installedValue}
          sub={installedSub}
        />
      </PMBox>
    </PMVStack>
  );
}

type TrailTierProps = {
  label: string;
  value: string;
  sub: string;
};

function TrailTier({ label, value, sub }: Readonly<TrailTierProps>) {
  return (
    <PMVStack gap={1} align="start" minW="100px">
      <PMText
        fontSize="11px"
        color="text.faded"
        textTransform="uppercase"
        letterSpacing="wider"
        fontWeight="semibold"
      >
        {label}
      </PMText>
      <PMText
        fontSize="md"
        color="text.primary"
        fontWeight="medium"
        fontVariantNumeric="tabular-nums"
      >
        {value}
      </PMText>
      <PMText fontSize="11px" color="text.faded">
        {sub}
      </PMText>
    </PMVStack>
  );
}

type TrailConnectorProps = {
  drift: boolean;
  driftLabel: string;
  inSyncLabel: string;
  action?: { label: string; onClick: () => void };
  dimmed: boolean;
};

function TrailConnector({
  drift,
  driftLabel,
  inSyncLabel,
  action,
  dimmed,
}: Readonly<TrailConnectorProps>) {
  return (
    <PMVStack gap={2} align="center" minW="120px" paddingTop="18px">
      <PMIcon
        fontSize="lg"
        color={dimmed ? 'text.faded' : drift ? 'orange.500' : 'text.faded'}
        aria-hidden
      >
        <LuChevronRight />
      </PMIcon>
      {drift ? (
        <PMVStack gap={1} align="center">
          <PMHStack gap={1.5} align="center">
            <PMIcon fontSize="xs" color="orange.500">
              <LuTriangleAlert />
            </PMIcon>
            <PMText
              fontSize="xs"
              color="orange.500"
              fontWeight="medium"
              fontVariantNumeric="tabular-nums"
            >
              {driftLabel}
            </PMText>
          </PMHStack>
          {action && (
            <PMBox
              as="button"
              type="button"
              fontSize="11px"
              color="branding.primary"
              bg="transparent"
              border="none"
              cursor="pointer"
              padding={0}
              onClick={action.onClick}
              transition="color 120ms ease-out"
              _hover={{ color: 'blue.300' }}
              _focusVisible={{
                outline: '2px solid',
                outlineColor: 'branding.primary',
                outlineOffset: '2px',
                borderRadius: 'sm',
              }}
            >
              {action.label} →
            </PMBox>
          )}
        </PMVStack>
      ) : (
        <PMHStack gap={1.5} align="center">
          <PMBox
            width="6px"
            height="6px"
            borderRadius="full"
            bg={dimmed ? 'text.faded' : 'green.500'}
            aria-hidden
          />
          <PMText fontSize="xs" color="text.faded">
            {inSyncLabel}
          </PMText>
        </PMHStack>
      )}
    </PMVStack>
  );
}

type ChangesBlockProps = {
  sourceSync: SourcePackageSync;
  unreachable: boolean;
};

function ChangesBlock({
  sourceSync,
  unreachable,
}: Readonly<ChangesBlockProps>) {
  if (unreachable) {
    return (
      <PMText fontSize="sm" color="text.faded">
        Coverage unavailable while the repo is unreachable.
      </PMText>
    );
  }

  if (sourceSync.state === 'in-sync') {
    return (
      <PMHStack gap={2} align="center">
        <PMBox
          width="6px"
          height="6px"
          borderRadius="full"
          bg="green.500"
          aria-hidden
        />
        <PMText fontSize="sm" color="text.secondary">
          In sync with the marketplace.
        </PMText>
      </PMHStack>
    );
  }

  const { changes, sourceVersion } = sourceSync;
  const countLabel =
    changes.length === 1 ? '1 change' : `${changes.length} changes`;

  return (
    <PMVStack gap={4} align="stretch">
      <PMText fontSize="md" color="text.primary" fontWeight="medium">
        {countLabel} ready to publish
      </PMText>
      <PMVStack gap={2.5} align="stretch">
        {changes.map((change, index) => (
          <ChangeRow
            key={`${change.kind}-${change.target}-${index}`}
            change={change}
          />
        ))}
      </PMVStack>
      <PMBox>
        <PMButton variant="primary" size="sm">
          <PMIcon fontSize="sm">
            <LuRotateCw />
          </PMIcon>
          Publish v{sourceVersion}
        </PMButton>
      </PMBox>
    </PMVStack>
  );
}

function ChangeRow({ change }: Readonly<{ change: SourcePackageChange }>) {
  const { Icon, color, verb } = changeStyle(change.kind);
  return (
    <PMBox
      display="grid"
      gridTemplateColumns="16px 96px 1fr"
      alignItems="center"
      columnGap={3}
    >
      <PMBox
        as="span"
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        color={color}
        aria-label={verb}
      >
        <PMIcon fontSize="sm">
          <Icon />
        </PMIcon>
      </PMBox>
      <PMBox>
        <PMBadge size="sm" colorPalette="gray">
          {KIND_LABEL_SINGULAR[change.artifactKind]}
        </PMBadge>
      </PMBox>
      <PMText
        fontSize="sm"
        color="text.primary"
        fontWeight="medium"
        truncate
        fontFamily={change.artifactKind === 'command' ? 'mono' : undefined}
      >
        {change.target}
      </PMText>
    </PMBox>
  );
}

function changeStyle(kind: SourcePackageChange['kind']): {
  Icon: IconType;
  color: string;
  verb: string;
} {
  switch (kind) {
    case 'added':
      return { Icon: LuPlus, color: 'green.500', verb: 'Added' };
    case 'removed':
      return { Icon: LuMinus, color: 'red.500', verb: 'Removed' };
    case 'updated':
      return { Icon: LuPencil, color: 'text.secondary', verb: 'Updated' };
  }
}

type AdoptionAxis = 'repo' | 'person';

type AdoptionBlockProps = {
  adoption: Plugin['adoption'];
  version: string;
  unreachable: boolean;
  outdatedOnly: boolean;
  onClearFilter: () => void;
};

function AdoptionBlock({
  adoption,
  version,
  unreachable,
  outdatedOnly,
  onClearFilter,
}: Readonly<AdoptionBlockProps>) {
  const [axis, setAxis] = useState<AdoptionAxis>('repo');

  const { repos } = adoption;
  const visibleRepos = useMemo(
    () => (outdatedOnly ? repos.filter((r) => r.isOutdated) : repos),
    [repos, outdatedOnly],
  );
  const persons = useMemo(
    () => aggregateByPerson(visibleRepos),
    [visibleRepos],
  );

  if (unreachable) {
    return (
      <PMVStack gap={2} align="start">
        <SectionLabel>Adoption</SectionLabel>
        <PMText fontSize="sm" color="text.faded">
          coverage unavailable while the repo is unreachable
        </PMText>
      </PMVStack>
    );
  }

  const outdatedRepoCount = repos.filter((r) => r.isOutdated).length;
  const reposOnLatest = adoption.reposOnVersion;
  const shownLatest = repos.filter((r) => !r.isOutdated).length;
  const remainingLatest = Math.max(reposOnLatest - shownLatest, 0);

  return (
    <PMVStack gap={3} align="stretch">
      {outdatedOnly && (
        <PMHStack
          gap={3}
          align="center"
          bg="background.secondary"
          paddingX={3}
          paddingY={2}
          borderRadius="sm"
        >
          <PMText
            fontSize="xs"
            color="text.secondary"
            fontVariantNumeric="tabular-nums"
          >
            Showing {outdatedRepoCount}{' '}
            {outdatedRepoCount === 1 ? 'repo' : 'repos'} behind
          </PMText>
          <PMBox
            as="button"
            type="button"
            fontSize="xs"
            color="branding.primary"
            bg="transparent"
            border="none"
            cursor="pointer"
            padding={0}
            onClick={onClearFilter}
            transition="color 120ms ease-out"
            _hover={{ color: 'blue.300' }}
          >
            Show all
          </PMBox>
        </PMHStack>
      )}
      {visibleRepos.length > 0 ? (
        <PMVStack gap={3} align="stretch">
          <AdoptionTabs active={axis} onChange={setAxis} />
          {axis === 'repo' ? (
            <PMVStack gap={1} align="stretch">
              <PMTable
                columns={ADOPTION_COLUMNS}
                data={visibleRepos.map((repo) => toRepoRow(repo, version))}
                size="sm"
                striped={false}
                hoverable={false}
              />
              {!outdatedOnly && remainingLatest > 0 && (
                <CollapsedTail count={remainingLatest} />
              )}
            </PMVStack>
          ) : (
            <PMTable
              columns={ADOPTION_COLUMNS}
              data={persons.map((entry) => toPersonRow(entry, version))}
              size="sm"
              striped={false}
              hoverable={false}
            />
          )}
        </PMVStack>
      ) : (
        <PMText fontSize="sm" color="text.faded">
          {outdatedOnly
            ? 'No repos behind. Everyone is on the published version.'
            : 'No consumers yet.'}
        </PMText>
      )}
    </PMVStack>
  );
}

const ADOPTION_COLUMNS: PMTableColumn[] = [
  { key: 'name', header: 'Name', grow: true },
  {
    key: 'version',
    header: 'Version (installed → published)',
    align: 'center',
    grow: true,
  },
  { key: 'status', header: 'Status', align: 'center' },
];

function toRepoRow(repo: RepoAdoption, latestVersion: string): PMTableRow {
  return {
    name: (
      <PMText fontSize="sm" fontFamily="mono" color="text.primary" truncate>
        {repo.repoPath}
      </PMText>
    ),
    version: renderVersionCell(
      repo.installedVersion,
      latestVersion,
      repo.isOutdated,
    ),
    status: renderStatusCell(repo.isOutdated),
  };
}

function toPersonRow(entry: PersonEntry, latestVersion: string): PMTableRow {
  return {
    name: (
      <PMText fontSize="sm" color="text.primary" truncate>
        {entry.installer.name}
      </PMText>
    ),
    version: renderVersionCell(
      entry.oldestInstalledVersion,
      latestVersion,
      entry.isOutdated,
    ),
    status: renderStatusCell(entry.isOutdated),
  };
}

function renderVersionCell(
  installed: string,
  latest: string,
  isOutdated: boolean,
) {
  if (!isOutdated) {
    return (
      <PMBadge colorPalette="gray" size="sm">
        {installed}
      </PMBadge>
    );
  }
  const palette = getVersionGapPalette(installed, latest);
  return (
    <PMHStack gap={2} justify="center" align="center">
      <PMBadge colorPalette="gray" size="sm">
        {installed}
      </PMBadge>
      <PMText fontSize="xs" color="text.faded">
        →
      </PMText>
      <PMBadge colorPalette={palette} size="sm">
        {latest}
      </PMBadge>
    </PMHStack>
  );
}

function renderStatusCell(isOutdated: boolean) {
  return isOutdated ? (
    <PMBadge colorPalette="red" size="sm">
      Outdated
    </PMBadge>
  ) : (
    <PMBadge colorPalette="green" size="sm">
      Up-to-date
    </PMBadge>
  );
}

type AdoptionTabsProps = {
  active: AdoptionAxis;
  onChange: (next: AdoptionAxis) => void;
};

function AdoptionTabs({ active, onChange }: Readonly<AdoptionTabsProps>) {
  return (
    <PMHStack
      gap={5}
      align="center"
      borderBottom="1px solid"
      borderColor="border.tertiary"
    >
      <TabButton active={active === 'repo'} onClick={() => onChange('repo')}>
        By repo
      </TabButton>
      <TabButton
        active={active === 'person'}
        onClick={() => onChange('person')}
      >
        By person
      </TabButton>
    </PMHStack>
  );
}

type TabButtonProps = {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  paddingY?: number;
};

function TabButton({
  active,
  onClick,
  children,
  paddingY = 2,
}: Readonly<TabButtonProps>) {
  return (
    <PMBox
      as="button"
      type="button"
      onClick={onClick}
      bg="transparent"
      border="none"
      cursor="pointer"
      paddingY={paddingY}
      paddingX={0}
      fontSize="sm"
      fontWeight="medium"
      color={active ? 'text.primary' : 'text.faded'}
      borderBottom="2px solid"
      borderColor={active ? 'branding.primary' : 'transparent'}
      marginBottom="-1px"
      transition="color 150ms ease-out"
      _hover={active ? undefined : { color: 'text.secondary' }}
      _focusVisible={{
        outline: '2px solid',
        outlineColor: 'branding.primary',
        outlineOffset: '2px',
        borderRadius: 'sm',
      }}
      aria-pressed={active}
    >
      {children}
    </PMBox>
  );
}

type PersonEntry = {
  installer: Installer;
  oldestInstalledVersion: string;
  isOutdated: boolean;
  outdatedCount: number;
};

function CollapsedTail({ count }: Readonly<{ count: number }>) {
  return (
    <PMText
      fontSize="xs"
      color="text.faded"
      paddingY={1}
      paddingX={2}
      fontVariantNumeric="tabular-nums"
    >
      + {count} more
    </PMText>
  );
}

function parseVersion(v: string): [number, number, number] {
  const parts = v.split('.').map((p) => parseInt(p, 10));
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

function compareVersions(a: string, b: string): number {
  const [a1, a2, a3] = parseVersion(a);
  const [b1, b2, b3] = parseVersion(b);
  if (a1 !== b1) return a1 - b1;
  if (a2 !== b2) return a2 - b2;
  return a3 - b3;
}

function getVersionGapPalette(
  installed: string,
  latest: string,
): 'blue' | 'orange' | 'red' {
  const [im, in_] = parseVersion(installed);
  const [lm, ln] = parseVersion(latest);
  if (lm > im) return 'red';
  if (ln > in_) return 'orange';
  return 'blue';
}

function aggregateByPerson(repos: RepoAdoption[]): PersonEntry[] {
  const map = new Map<
    string,
    { installer: Installer; entries: RepoAdoption[] }
  >();
  for (const repo of repos) {
    const key = repo.installer.name;
    const bucket = map.get(key);
    if (bucket) {
      bucket.entries.push(repo);
    } else {
      map.set(key, { installer: repo.installer, entries: [repo] });
    }
  }
  return Array.from(map.values())
    .map(({ installer, entries }) => {
      const oldest = entries.reduce((acc, entry) =>
        compareVersions(entry.installedVersion, acc.installedVersion) < 0
          ? entry
          : acc,
      );
      const outdatedCount = entries.filter((e) => e.isOutdated).length;
      return {
        installer,
        oldestInstalledVersion: oldest.installedVersion,
        isOutdated: outdatedCount > 0,
        outdatedCount,
      };
    })
    .sort((a, b) => {
      if (a.isOutdated !== b.isOutdated) return a.isOutdated ? -1 : 1;
      return a.installer.name.localeCompare(b.installer.name);
    });
}

type ArtifactsBlockProps = {
  grouped: Record<ArtifactKind, Artifact[]>;
};

function ArtifactsBlock({ grouped }: Readonly<ArtifactsBlockProps>) {
  const total = KIND_ORDER.reduce((sum, k) => sum + grouped[k].length, 0);

  return (
    <PMVStack gap={4} align="stretch">
      <PMHStack gap={2} align="baseline">
        <SectionLabel>Bundled artifacts</SectionLabel>
        <PMText
          fontSize="xs"
          color="text.faded"
          fontVariantNumeric="tabular-nums"
        >
          {total} {total === 1 ? 'item' : 'items'}
        </PMText>
      </PMHStack>

      {KIND_ORDER.map((kind) => {
        const items = grouped[kind];
        if (items.length === 0) return null;
        return <ArtifactGroup key={kind} kind={kind} items={items} />;
      })}
    </PMVStack>
  );
}

type ArtifactGroupProps = {
  kind: ArtifactKind;
  items: Artifact[];
};

function ArtifactGroup({ kind, items }: Readonly<ArtifactGroupProps>) {
  const Icon = KIND_ICON[kind];
  return (
    <PMVStack gap={1} align="stretch">
      <PMHStack
        gap={2}
        align="center"
        paddingY={1.5}
        borderBottom="1px solid"
        borderColor="border.tertiary"
      >
        <PMIcon fontSize="sm" color="text.faded">
          <Icon />
        </PMIcon>
        <PMText
          fontSize="xs"
          color="text.secondary"
          textTransform="uppercase"
          letterSpacing="wider"
          fontWeight="semibold"
        >
          {KIND_LABEL[kind]}
        </PMText>
        <PMText
          fontSize="xs"
          color="text.faded"
          fontVariantNumeric="tabular-nums"
        >
          {items.length}
        </PMText>
      </PMHStack>
      <PMVStack gap={0} align="stretch">
        {items.map((a) => (
          <ArtifactRow key={a.id} artifact={a} />
        ))}
      </PMVStack>
    </PMVStack>
  );
}

function ArtifactRow({ artifact }: Readonly<{ artifact: Artifact }>) {
  return (
    <PMBox
      as="button"
      type="button"
      bg="transparent"
      border="none"
      textAlign="left"
      width="100%"
      paddingY={2.5}
      paddingX={2}
      cursor="pointer"
      borderRadius="sm"
      transition="background-color 120ms ease-out"
      _hover={{ bg: 'background.secondary' }}
      _focusVisible={{
        outline: '2px solid',
        outlineColor: 'branding.primary',
        outlineOffset: '-2px',
      }}
      aria-label={`Open ${artifact.name}`}
    >
      <PMHStack gap={3} align="center" justify="space-between">
        <PMVStack gap={0.5} align="start" flex={1} minW={0}>
          <PMText
            fontSize="sm"
            fontWeight="medium"
            color="text.primary"
            truncate
            fontFamily={artifact.kind === 'command' ? 'mono' : undefined}
          >
            {artifact.name}
          </PMText>
          <PMText fontSize="xs" color="text.secondary" lineHeight={1.5}>
            {artifact.summary}
          </PMText>
        </PMVStack>
        <PMIcon fontSize="sm" color="text.faded" flexShrink={0}>
          <LuChevronRight />
        </PMIcon>
      </PMHStack>
    </PMBox>
  );
}

function SectionLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <PMText
      fontSize="xs"
      color="text.secondary"
      textTransform="uppercase"
      letterSpacing="wider"
      fontWeight="semibold"
    >
      {children}
    </PMText>
  );
}

function groupArtifacts(
  artifacts: Artifact[],
): Record<ArtifactKind, Artifact[]> {
  const init: Record<ArtifactKind, Artifact[]> = {
    standard: [],
    command: [],
    skill: [],
  };
  for (const a of artifacts) {
    init[a.kind].push(a);
  }
  return init;
}
