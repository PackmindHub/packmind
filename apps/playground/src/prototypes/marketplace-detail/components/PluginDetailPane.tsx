import { useEffect, useMemo, useState } from 'react';
import {
  PMBadge,
  PMBox,
  PMButton,
  PMHStack,
  PMHeading,
  PMIcon,
  PMInput,
  PMStatus,
  PMSwitch,
  PMTable,
  PMText,
  PMVStack,
  type PMTableColumn,
  type PMTableRow,
} from '@packmind/ui';
import { getSpaceColorPalette } from '../spaceColor';
import {
  LuBot,
  LuChevronRight,
  LuMinus,
  LuPencil,
  LuPin,
  LuPinOff,
  LuPlug,
  LuPlus,
  LuRefreshCw,
  LuRefreshCwOff,
  LuRotateCw,
  LuSearch,
  LuTerminal,
  LuTriangleAlert,
  LuWandSparkles,
  LuWebhook,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';
import type {
  Artifact,
  ArtifactKind,
  Installer,
  Plugin,
  PolicyKey,
  RepoAdoption,
  SourcePackageChange,
  SourcePackageSync,
} from '../types';

type PluginDetailPaneProps = {
  plugin: Plugin;
  unreachable: boolean;
  onChangePolicy: (key: PolicyKey, value: boolean) => void;
};

const KIND_ICON: Record<ArtifactKind, IconType> = {
  command: LuTerminal,
  skill: LuWandSparkles,
  subagent: LuBot,
  hook: LuWebhook,
  'mcp-server': LuPlug,
};

const KIND_LABEL: Record<ArtifactKind, string> = {
  command: 'Commands',
  skill: 'Skills',
  subagent: 'Subagents',
  hook: 'Hooks',
  'mcp-server': 'MCP servers',
};

const KIND_LABEL_SINGULAR: Record<ArtifactKind, string> = {
  command: 'Command',
  skill: 'Skill',
  subagent: 'Subagent',
  hook: 'Hook',
  'mcp-server': 'MCP server',
};

const KIND_ORDER: ArtifactKind[] = [
  'command',
  'skill',
  'subagent',
  'hook',
  'mcp-server',
];

const MONO_KINDS: ReadonlySet<ArtifactKind> = new Set<ArtifactKind>([
  'command',
  'hook',
  'mcp-server',
]);

type DetailTabId = 'overview' | 'changes' | 'adoption' | 'settings';

export function PluginDetailPane({
  plugin,
  unreachable,
  onChangePolicy,
}: Readonly<PluginDetailPaneProps>) {
  const {
    name,
    version,
    mandatory,
    autoUpdate,
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
          autoUpdate={autoUpdate}
          ownerName={owner.name}
          lastPublishedRelative={lastPublishedRelative}
        />

        <VersionTrail
          publishedVersion={version}
          sourceSync={sourceSync}
          adoption={adoption}
          autoUpdate={autoUpdate}
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
            autoUpdate={autoUpdate}
            unreachable={unreachable}
            outdatedOnly={outdatedOnly}
            onClearFilter={() => setOutdatedOnly(false)}
          />
        )}
        {tab === 'settings' && (
          <SettingsBlock
            autoUpdate={autoUpdate}
            mandatory={mandatory}
            ownerName={owner.name}
            unreachable={unreachable}
            onChangePolicy={onChangePolicy}
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
      <TabButton
        active={active === 'settings'}
        onClick={() => onChange('settings')}
        paddingY={3}
      >
        Settings
      </TabButton>
    </PMHStack>
  );
}

type IdentityStripProps = {
  name: string;
  mandatory: boolean;
  autoUpdate: boolean;
  ownerName: string;
  lastPublishedRelative: string;
};

function IdentityStrip({
  name,
  mandatory,
  autoUpdate,
  ownerName,
  lastPublishedRelative,
}: Readonly<IdentityStripProps>) {
  return (
    <PMVStack gap={2} align="start">
      <PMHStack gap={3} align="center" wrap="wrap">
        <PMHeading size="lg" color="primary">
          {name}
        </PMHeading>
        <PolicyChip
          on={autoUpdate}
          label="auto-update"
          OnIcon={LuRefreshCw}
          OffIcon={LuRefreshCwOff}
        />
        <PolicyChip
          on={mandatory}
          label="mandatory"
          OnIcon={LuPin}
          OffIcon={LuPinOff}
        />
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

type PolicyChipProps = {
  on: boolean;
  label: string;
  OnIcon: IconType;
  OffIcon: IconType;
};

function PolicyChip({ on, label, OnIcon, OffIcon }: Readonly<PolicyChipProps>) {
  const Icon = on ? OnIcon : OffIcon;
  const color = on ? 'text.secondary' : 'text.faded';
  return (
    <PMHStack
      gap={1}
      align="center"
      bg="background.tertiary"
      paddingX="6px"
      paddingY="2px"
      borderRadius="sm"
      aria-label={`${label} ${on ? 'on' : 'off'}`}
    >
      <PMIcon fontSize="11px" color={color}>
        <Icon />
      </PMIcon>
      <PMText
        fontSize="xs"
        color={color}
        fontWeight="medium"
        letterSpacing="0.025em"
      >
        {label}
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
  autoUpdate: boolean;
  unreachable: boolean;
  onViewChanges: () => void;
  onViewOutdated: () => void;
};

function VersionTrail({
  publishedVersion,
  sourceSync,
  adoption,
  autoUpdate,
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
  const adoptionAutoSyncing = autoUpdate && !unreachable;
  const showAdoptionDrift = behindCount > 0 && !adoptionAutoSyncing;

  const installedValue =
    totalCount === 0
      ? 'no repos'
      : behindCount === 0
        ? `${latestCount} / ${latestCount}`
        : `${latestCount} / ${totalCount}`;

  const installedSub =
    totalCount === 0
      ? 'no consumers yet'
      : adoptionAutoSyncing
        ? 'syncs on next publish'
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
          drift={showAdoptionDrift}
          autoSyncing={adoptionAutoSyncing}
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
            showAdoptionDrift
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
  autoSyncing?: boolean;
  driftLabel: string;
  inSyncLabel: string;
  action?: { label: string; onClick: () => void };
  dimmed: boolean;
};

function TrailConnector({
  drift,
  autoSyncing = false,
  driftLabel,
  inSyncLabel,
  action,
  dimmed,
}: Readonly<TrailConnectorProps>) {
  if (autoSyncing) {
    return (
      <PMVStack gap={2} align="center" minW="120px" paddingTop="18px">
        <PMIcon fontSize="lg" color="text.secondary" aria-hidden>
          <LuRefreshCw />
        </PMIcon>
        <PMHStack gap={1.5} align="center">
          <PMBox
            width="6px"
            height="6px"
            borderRadius="full"
            bg="branding.primary"
            aria-hidden
          />
          <PMText fontSize="xs" color="text.secondary">
            auto-syncing
          </PMText>
        </PMHStack>
      </PMVStack>
    );
  }

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
        fontFamily={MONO_KINDS.has(change.artifactKind) ? 'mono' : undefined}
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
  autoUpdate: boolean;
  unreachable: boolean;
  outdatedOnly: boolean;
  onClearFilter: () => void;
};

function AdoptionBlock({
  adoption,
  version,
  autoUpdate,
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
      {autoUpdate && (
        <PMHStack
          gap={2}
          align="center"
          bg="background.secondary"
          paddingX={3}
          paddingY={2}
          borderRadius="sm"
        >
          <PMIcon fontSize="sm" color="text.secondary">
            <LuRefreshCw />
          </PMIcon>
          <PMText fontSize="xs" color="text.secondary">
            Auto-update is on. Repos sync to the published version on the next
            pull.
          </PMText>
        </PMHStack>
      )}
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
          {!autoUpdate && (
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
          )}
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
            ? autoUpdate
              ? 'Auto-update is on. Repos sync to the published version on the next pull.'
              : 'No repos behind. Everyone is on the published version.'
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

type SettingsBlockProps = {
  autoUpdate: boolean;
  mandatory: boolean;
  ownerName: string;
  unreachable: boolean;
  onChangePolicy: (key: PolicyKey, value: boolean) => void;
};

type PendingChange = { key: PolicyKey; nextValue: boolean };
type RecentChange = { key: PolicyKey; previousValue: boolean };

function SettingsBlock({
  autoUpdate,
  mandatory,
  ownerName,
  unreachable,
  onChangePolicy,
}: Readonly<SettingsBlockProps>) {
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [recent, setRecent] = useState<RecentChange | null>(null);

  useEffect(() => {
    if (!recent) return;
    const timer = window.setTimeout(() => setRecent(null), 4000);
    return () => window.clearTimeout(timer);
  }, [recent]);

  const valueOf = (key: PolicyKey) =>
    key === 'autoUpdate' ? autoUpdate : mandatory;

  const requiresConfirm = (key: PolicyKey, nextValue: boolean) =>
    key === 'autoUpdate' ? true : nextValue === true;

  const handleAttempt = (key: PolicyKey, nextValue: boolean) => {
    setRecent(null);
    if (nextValue === valueOf(key)) return;
    if (requiresConfirm(key, nextValue)) {
      setPending({ key, nextValue });
      return;
    }
    onChangePolicy(key, nextValue);
    setRecent({ key, previousValue: !nextValue });
  };

  const handleConfirm = () => {
    if (!pending) return;
    const previousValue = valueOf(pending.key);
    onChangePolicy(pending.key, pending.nextValue);
    setRecent({ key: pending.key, previousValue });
    setPending(null);
  };

  const handleCancel = () => setPending(null);

  const handleUndo = () => {
    if (!recent) return;
    onChangePolicy(recent.key, recent.previousValue);
    setRecent(null);
  };

  return (
    <PMVStack gap={6} align="stretch" maxW="70ch">
      <PMVStack gap={1} align="start">
        <SectionLabel>Distribution policy</SectionLabel>
        <PMText fontSize="xs" color="text.faded">
          Owned by {ownerName}. Changes apply to every consumer repo.
        </PMText>
      </PMVStack>

      <PMVStack gap={6} align="stretch">
        <SettingRow
          label="Auto-update"
          explanation="Consumers receive every new version on their next sync."
          checked={autoUpdate}
          disabled={unreachable}
          onAttempt={(next) => handleAttempt('autoUpdate', next)}
          footer={
            <>
              {pending?.key === 'autoUpdate' && (
                <ConfirmFooter
                  body={
                    pending.nextValue
                      ? 'Consumers will receive every new version you publish, automatically. They will not be asked.'
                      : 'Consumers will stay on whatever version they currently have installed until they update manually.'
                  }
                  confirmLabel={
                    pending.nextValue
                      ? 'Turn on auto-update'
                      : 'Turn off auto-update'
                  }
                  onConfirm={handleConfirm}
                  onCancel={handleCancel}
                />
              )}
              {recent?.key === 'autoUpdate' && !pending && (
                <UndoFooter
                  message={
                    valueOf('autoUpdate')
                      ? 'Auto-update is on.'
                      : 'Auto-update is off.'
                  }
                  onUndo={handleUndo}
                />
              )}
            </>
          }
        />
        <SettingRow
          label="Mandatory"
          explanation="Consumers cannot uninstall this plugin from their repo."
          checked={mandatory}
          disabled={unreachable}
          onAttempt={(next) => handleAttempt('mandatory', next)}
          footer={
            <>
              {pending?.key === 'mandatory' && (
                <ConfirmFooter
                  body="Turning this on locks the plugin in every consumer repo. Existing installs cannot be removed until you turn it off."
                  confirmLabel="Make mandatory"
                  onConfirm={handleConfirm}
                  onCancel={handleCancel}
                />
              )}
              {recent?.key === 'mandatory' && !pending && (
                <UndoFooter
                  message={
                    valueOf('mandatory')
                      ? 'Plugin is now mandatory.'
                      : 'Plugin is no longer mandatory.'
                  }
                  onUndo={handleUndo}
                />
              )}
            </>
          }
        />
      </PMVStack>
    </PMVStack>
  );
}

type SettingRowProps = {
  label: string;
  explanation: string;
  checked: boolean;
  disabled: boolean;
  onAttempt: (nextValue: boolean) => void;
  footer: React.ReactNode;
};

function SettingRow({
  label,
  explanation,
  checked,
  disabled,
  onAttempt,
  footer,
}: Readonly<SettingRowProps>) {
  return (
    <PMVStack gap={3} align="stretch">
      <PMHStack gap={4} align="center" justify="space-between">
        <PMVStack gap={1} align="start" flex={1} minW={0}>
          <PMText fontSize="sm" color="text.primary" fontWeight="medium">
            {label}
          </PMText>
          <PMText fontSize="xs" color="text.secondary">
            {explanation}
          </PMText>
        </PMVStack>
        <PMSwitch
          checked={checked}
          disabled={disabled}
          onCheckedChange={(details) => onAttempt(details.checked)}
          colorPalette="blue"
          aria-label={label}
        />
      </PMHStack>
      {footer}
    </PMVStack>
  );
}

type ConfirmFooterProps = {
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

function ConfirmFooter({
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: Readonly<ConfirmFooterProps>) {
  return (
    <PMVStack
      gap={3}
      align="stretch"
      bg="background.secondary"
      paddingX={4}
      paddingY={3}
      borderRadius="sm"
    >
      <PMText fontSize="sm" color="text.secondary" lineHeight={1.5}>
        {body}
      </PMText>
      <PMHStack gap={2} justify="flex-end">
        <PMButton variant="tertiary" size="sm" onClick={onCancel}>
          Cancel
        </PMButton>
        <PMButton variant="primary" size="sm" onClick={onConfirm}>
          {confirmLabel}
        </PMButton>
      </PMHStack>
    </PMVStack>
  );
}

type UndoFooterProps = {
  message: string;
  onUndo: () => void;
};

function UndoFooter({ message, onUndo }: Readonly<UndoFooterProps>) {
  return (
    <PMHStack
      gap={3}
      align="center"
      justify="space-between"
      bg="background.secondary"
      paddingX={3}
      paddingY={2}
      borderRadius="sm"
    >
      <PMText fontSize="xs" color="text.secondary">
        {message}
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
        onClick={onUndo}
        transition="color 120ms ease-out"
        _hover={{ color: 'blue.300' }}
        _focusVisible={{
          outline: '2px solid',
          outlineColor: 'branding.primary',
          outlineOffset: '2px',
          borderRadius: 'sm',
        }}
      >
        Undo
      </PMBox>
    </PMHStack>
  );
}

type ArtifactsBlockProps = {
  grouped: Record<ArtifactKind, Artifact[]>;
};

type ArtifactFilter = ArtifactKind | 'all';

function ArtifactsBlock({ grouped }: Readonly<ArtifactsBlockProps>) {
  const total = KIND_ORDER.reduce((sum, k) => sum + grouped[k].length, 0);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ArtifactFilter>('all');

  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = (a: Artifact) =>
    !normalizedQuery ||
    a.name.toLowerCase().includes(normalizedQuery) ||
    a.summary.toLowerCase().includes(normalizedQuery);

  const visibleKinds: ArtifactKind[] =
    activeFilter === 'all' ? KIND_ORDER : [activeFilter];

  const filteredGroups = visibleKinds.map((kind) => ({
    kind,
    items: grouped[kind].filter(matchesQuery),
  }));

  const visibleCount = filteredGroups.reduce((s, g) => s + g.items.length, 0);
  const isFiltering = normalizedQuery.length > 0 || activeFilter !== 'all';

  const handleReset = () => {
    setQuery('');
    setActiveFilter('all');
  };

  return (
    <PMVStack gap={4} align="stretch">
      <PMHStack gap={3} align="baseline" justify="space-between">
        <SectionLabel>Bundled artifacts</SectionLabel>
        <PMText
          fontSize="xs"
          color="text.faded"
          fontVariantNumeric="tabular-nums"
        >
          {isFiltering
            ? `${visibleCount} of ${total}`
            : `${total} ${total === 1 ? 'item' : 'items'}`}
        </PMText>
      </PMHStack>

      <ArtifactToolbar
        query={query}
        onQueryChange={setQuery}
        total={total}
        grouped={grouped}
        active={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {visibleCount === 0 ? (
        <ArtifactsEmpty query={normalizedQuery} onReset={handleReset} />
      ) : (
        <PMVStack gap={5} align="stretch">
          {filteredGroups.map(({ kind, items }) =>
            items.length === 0 ? null : (
              <ArtifactGroup
                key={kind}
                kind={kind}
                items={items}
                totalInKind={grouped[kind].length}
                showHeader={activeFilter === 'all'}
              />
            ),
          )}
        </PMVStack>
      )}
    </PMVStack>
  );
}

type ArtifactToolbarProps = {
  query: string;
  onQueryChange: (next: string) => void;
  total: number;
  grouped: Record<ArtifactKind, Artifact[]>;
  active: ArtifactFilter;
  onFilterChange: (next: ArtifactFilter) => void;
};

function ArtifactToolbar({
  query,
  onQueryChange,
  total,
  grouped,
  active,
  onFilterChange,
}: Readonly<ArtifactToolbarProps>) {
  return (
    <PMVStack gap={2.5} align="stretch">
      <PMBox position="relative">
        <PMBox
          position="absolute"
          left="10px"
          top="50%"
          transform="translateY(-50%)"
          color="text.faded"
          pointerEvents="none"
          display="flex"
          alignItems="center"
          zIndex={1}
          aria-hidden
        >
          <PMIcon fontSize="sm">
            <LuSearch />
          </PMIcon>
        </PMBox>
        <PMInput
          placeholder="Filter artifacts by name or description"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          size="sm"
          paddingLeft="32px"
          aria-label="Filter artifacts"
        />
      </PMBox>
      <PMHStack gap={1.5} wrap="wrap" align="center">
        <FacetChip
          active={active === 'all'}
          onClick={() => onFilterChange('all')}
          count={total}
        >
          All
        </FacetChip>
        {KIND_ORDER.map((kind) => {
          const count = grouped[kind].length;
          if (count === 0) return null;
          const Icon = KIND_ICON[kind];
          return (
            <FacetChip
              key={kind}
              active={active === kind}
              onClick={() => onFilterChange(kind)}
              count={count}
              icon={Icon}
            >
              {KIND_LABEL[kind]}
            </FacetChip>
          );
        })}
      </PMHStack>
    </PMVStack>
  );
}

type FacetChipProps = {
  active: boolean;
  onClick: () => void;
  count: number;
  icon?: IconType;
  children: React.ReactNode;
};

function FacetChip({
  active,
  onClick,
  count,
  icon: Icon,
  children,
}: Readonly<FacetChipProps>) {
  return (
    <PMBox
      as="button"
      type="button"
      onClick={onClick}
      display="inline-flex"
      alignItems="center"
      gap={1.5}
      paddingX="10px"
      paddingY="3px"
      borderRadius="sm"
      bg={active ? 'branding.primary' : 'background.tertiary'}
      color={active ? 'beige.1000' : 'text.secondary'}
      fontSize="xs"
      fontWeight="medium"
      cursor="pointer"
      border="none"
      transition="background-color 120ms ease-out, color 120ms ease-out"
      _hover={
        active
          ? { bg: 'branding.primary' }
          : { bg: 'background.secondary', color: 'text.primary' }
      }
      _focusVisible={{
        outline: '2px solid',
        outlineColor: 'branding.primary',
        outlineOffset: '2px',
      }}
      aria-pressed={active}
    >
      {Icon && (
        <PMIcon fontSize="11px" color="inherit">
          <Icon />
        </PMIcon>
      )}
      <PMBox as="span" color="inherit">
        {children}
      </PMBox>
      <PMBox
        as="span"
        color="inherit"
        opacity={active ? 0.7 : 0.65}
        fontVariantNumeric="tabular-nums"
      >
        {count}
      </PMBox>
    </PMBox>
  );
}

type ArtifactGroupProps = {
  kind: ArtifactKind;
  items: Artifact[];
  totalInKind: number;
  showHeader: boolean;
};

function ArtifactGroup({
  kind,
  items,
  totalInKind,
  showHeader,
}: Readonly<ArtifactGroupProps>) {
  const Icon = KIND_ICON[kind];
  return (
    <PMVStack gap={0} align="stretch">
      {showHeader && (
        <PMHStack
          gap={2}
          align="center"
          paddingY={1.5}
          paddingX={2}
          marginX={-2}
          borderBottom="1px solid"
          borderColor="border.tertiary"
          position="sticky"
          top={0}
          bg="background.primary"
          zIndex={1}
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
            {items.length === totalInKind
              ? items.length
              : `${items.length} / ${totalInKind}`}
          </PMText>
        </PMHStack>
      )}
      <PMVStack gap={0} align="stretch">
        {items.map((a) => (
          <ArtifactRow key={a.id} artifact={a} />
        ))}
      </PMVStack>
    </PMVStack>
  );
}

function ArtifactRow({ artifact }: Readonly<{ artifact: Artifact }>) {
  const Icon = KIND_ICON[artifact.kind];
  const mono = MONO_KINDS.has(artifact.kind);
  return (
    <PMBox
      as="button"
      type="button"
      bg="transparent"
      border="none"
      textAlign="left"
      width="100%"
      paddingY="6px"
      paddingX={2}
      cursor="pointer"
      borderRadius="sm"
      display="grid"
      gridTemplateColumns="14px minmax(0, 32ch) minmax(0, 1fr) 14px"
      alignItems="center"
      columnGap={3}
      transition="background-color 120ms ease-out"
      _hover={{ bg: 'background.secondary' }}
      _focusVisible={{
        outline: '2px solid',
        outlineColor: 'branding.primary',
        outlineOffset: '-2px',
      }}
      sx={{
        '&:hover [data-row-chevron]': { opacity: 1 },
        '&:focus-visible [data-row-chevron]': { opacity: 1 },
      }}
      aria-label={`Open ${artifact.name}`}
    >
      <PMBox
        as="span"
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        color="text.faded"
        aria-hidden
      >
        <PMIcon fontSize="sm">
          <Icon />
        </PMIcon>
      </PMBox>
      <PMText
        fontSize="sm"
        fontWeight="medium"
        color="text.primary"
        truncate
        fontFamily={mono ? 'mono' : undefined}
      >
        {artifact.name}
      </PMText>
      <PMText fontSize="xs" color="text.secondary" lineHeight={1.4} truncate>
        {artifact.summary}
      </PMText>
      <PMBox
        as="span"
        data-row-chevron
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        color="text.faded"
        opacity={0}
        transition="opacity 120ms ease-out"
        aria-hidden
      >
        <PMIcon fontSize="sm">
          <LuChevronRight />
        </PMIcon>
      </PMBox>
    </PMBox>
  );
}

type ArtifactsEmptyProps = {
  query: string;
  onReset: () => void;
};

function ArtifactsEmpty({ query, onReset }: Readonly<ArtifactsEmptyProps>) {
  return (
    <PMVStack
      gap={2}
      align="start"
      paddingY={6}
      paddingX={3}
      bg="background.secondary"
      borderRadius="sm"
    >
      <PMText fontSize="sm" color="text.secondary">
        {query
          ? `Nothing in this bundle matches "${query}".`
          : 'No artifacts in the selected kind.'}
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
        onClick={onReset}
        transition="color 120ms ease-out"
        _hover={{ color: 'blue.300' }}
        _focusVisible={{
          outline: '2px solid',
          outlineColor: 'branding.primary',
          outlineOffset: '2px',
          borderRadius: 'sm',
        }}
      >
        Clear filters
      </PMBox>
    </PMVStack>
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
    command: [],
    skill: [],
    subagent: [],
    hook: [],
    'mcp-server': [],
  };
  for (const a of artifacts) {
    init[a.kind].push(a);
  }
  return init;
}
