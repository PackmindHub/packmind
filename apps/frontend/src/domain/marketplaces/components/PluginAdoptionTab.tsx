import { useMemo, useState } from 'react';
import {
  PMBadge,
  PMBox,
  PMHStack,
  PMSpinner,
  PMText,
  PMVStack,
  PMTable,
  type PMTableColumn,
  type PMTableRow,
} from '@packmind/ui';
import type {
  MarketplaceId,
  OrganizationId,
  PluginInstallationListItem,
} from '@packmind/types';
import { useMarketplacePluginInstalls } from '../api/queries';

// ---------------------------------------------------------------------------
// Adoption tab — ports the playground prototype's version-gap table
// (apps/playground/src/prototypes/marketplace-detail) onto real install
// tracking data. Two axes: "By repo" and "By person", each a two-column table
// of Name | Version (installed → published).
//
// The prototype's auto-update / outdated-filter banners and the collapsed
// "+ N more" tail are intentionally omitted — they depend on data the backend
// does not expose (an auto-update flag and a "repos on latest" count).
// ---------------------------------------------------------------------------

type AdoptionAxis = 'repo' | 'person';

type AdoptionEntry = {
  /** Stable React key. */
  key: string;
  /** Display label (repo path or person name). */
  name: string;
  /** Render the label in a monospace font (repo paths). */
  mono: boolean;
  /** Oldest installed version across the grouped installs; null when unknown. */
  installedVersion: string | null;
  isOutdated: boolean;
};

// ── Version helpers (ported verbatim from the prototype) ────────────────────

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

// ── Identity / grouping helpers ─────────────────────────────────────────────

function resolveDisplayName(item: PluginInstallationListItem): string {
  if (item.userDisplayName) return item.userDisplayName;
  if (item.anonymousEmailMasked) return item.anonymousEmailMasked;
  if (item.identityKey === '') return 'Unknown installer';
  return item.identityKey;
}

/**
 * Oldest installed version among a group of installs. Installs that did not
 * report a version are ignored; returns null when none reported one.
 */
function oldestInstalledVersion(
  items: PluginInstallationListItem[],
): string | null {
  return items.reduce<string | null>((oldest, item) => {
    const v = item.installedVersion;
    if (!v) return oldest;
    if (oldest === null) return v;
    return compareVersions(v, oldest) < 0 ? v : oldest;
  }, null);
}

function isBehind(installed: string | null, published: string | null): boolean {
  if (!installed || !published) return false;
  return compareVersions(installed, published) < 0;
}

function sortEntries(a: AdoptionEntry, b: AdoptionEntry): number {
  if (a.isOutdated !== b.isOutdated) return a.isOutdated ? -1 : 1;
  return a.name.localeCompare(b.name);
}

function groupBy(
  items: PluginInstallationListItem[],
  keyOf: (item: PluginInstallationListItem) => string,
): Map<string, PluginInstallationListItem[]> {
  const map = new Map<string, PluginInstallationListItem[]>();
  for (const item of items) {
    const key = keyOf(item);
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return map;
}

function aggregateByRepo(
  items: PluginInstallationListItem[],
  published: string | null,
): AdoptionEntry[] {
  // Repo-bound installs only — user-scope installs are global and surface
  // under the "By person" axis instead.
  const repoItems = items.filter((i) => i.scope !== 'user');
  return Array.from(groupBy(repoItems, (i) => i.repoKey).entries())
    .map(([repoKey, group]) => {
      const installedVersion = oldestInstalledVersion(group);
      return {
        key: repoKey === '' ? '__unidentified__' : repoKey,
        name: repoKey === '' ? 'Unidentified repository' : repoKey,
        mono: repoKey !== '',
        installedVersion,
        isOutdated: isBehind(installedVersion, published),
      };
    })
    .sort(sortEntries);
}

function aggregateByPerson(
  items: PluginInstallationListItem[],
  published: string | null,
): AdoptionEntry[] {
  return Array.from(groupBy(items, (i) => i.identityKey).entries())
    .map(([identityKey, group]) => {
      const installedVersion = oldestInstalledVersion(group);
      return {
        key: identityKey === '' ? '__unknown__' : identityKey,
        name: resolveDisplayName(group[0]),
        mono: false,
        installedVersion,
        isOutdated: isBehind(installedVersion, published),
      };
    })
    .sort(sortEntries);
}

// ── Rendering ───────────────────────────────────────────────────────────────

const ADOPTION_COLUMNS: PMTableColumn[] = [
  { key: 'name', header: 'Name', grow: true },
  {
    key: 'version',
    header: 'Version (installed → published)',
    align: 'center',
    grow: true,
  },
];

function renderVersionCell(
  installed: string | null,
  published: string | null,
  isOutdated: boolean,
) {
  if (!installed) {
    return (
      <PMBadge colorPalette="gray" size="sm" variant="outline">
        unknown
      </PMBadge>
    );
  }
  if (!isOutdated || !published) {
    return (
      <PMBadge colorPalette="gray" size="sm">
        {installed}
      </PMBadge>
    );
  }
  const palette = getVersionGapPalette(installed, published);
  return (
    <PMHStack gap={2} justify="center" align="center">
      <PMBadge colorPalette="gray" size="sm">
        {installed}
      </PMBadge>
      <PMText fontSize="xs" color="faded" aria-hidden>
        →
      </PMText>
      <PMBadge colorPalette={palette} size="sm">
        {published}
      </PMBadge>
    </PMHStack>
  );
}

function toRow(entry: AdoptionEntry, published: string | null): PMTableRow {
  return {
    name: (
      <PMText
        fontSize="sm"
        fontFamily={entry.mono ? 'mono' : undefined}
        color="primary"
        truncate
      >
        {entry.name}
      </PMText>
    ),
    version: renderVersionCell(
      entry.installedVersion,
      published,
      entry.isOutdated,
    ),
  };
}

interface AxisTabsProps {
  active: AdoptionAxis;
  onChange: (next: AdoptionAxis) => void;
}

function AxisTabs({ active, onChange }: Readonly<AxisTabsProps>) {
  return (
    <PMHStack
      gap={5}
      align="center"
      borderBottom="1px solid"
      borderColor="border.tertiary"
    >
      <AxisTabButton
        active={active === 'repo'}
        onClick={() => onChange('repo')}
      >
        By repo
      </AxisTabButton>
      <AxisTabButton
        active={active === 'person'}
        onClick={() => onChange('person')}
      >
        By person
      </AxisTabButton>
    </PMHStack>
  );
}

interface AxisTabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function AxisTabButton({
  active,
  onClick,
  children,
}: Readonly<AxisTabButtonProps>) {
  return (
    <PMBox
      as="button"
      onClick={onClick}
      bg="transparent"
      border="none"
      cursor="pointer"
      paddingY={2}
      paddingX={0}
      fontSize="sm"
      fontWeight="medium"
      color={active ? 'text.primary' : 'text.faded'}
      borderBottom="2px solid"
      borderColor={active ? 'branding.primary' : 'transparent'}
      marginBottom="-1px"
      transition="color 150ms ease-out"
      _hover={active ? undefined : { color: 'text.primary' }}
      aria-pressed={active}
    >
      {children}
    </PMBox>
  );
}

export interface PluginAdoptionTabProps {
  organizationId: OrganizationId | string;
  marketplaceId: MarketplaceId | string;
  pluginSlug: string;
  /** Currently-published version of this plugin, used as the comparison tier. */
  publishedVersion: string | null;
  /** Defers the install fetch until the Adoption tab is active. */
  active: boolean;
}

/**
 * Adoption tab for the plugin detail pane. Shows who/where the plugin is
 * installed and which version they are on, compared against the published
 * version. Fetches all installs for the marketplace once (shared TanStack
 * Query cache) and filters down to `pluginSlug`.
 */
export function PluginAdoptionTab({
  organizationId,
  marketplaceId,
  pluginSlug,
  publishedVersion,
  active,
}: Readonly<PluginAdoptionTabProps>) {
  const [axis, setAxis] = useState<AdoptionAxis>('repo');
  const { data, isLoading } = useMarketplacePluginInstalls(
    organizationId,
    marketplaceId,
    active,
  );

  const pluginItems = useMemo(
    () => (data ?? []).filter((i) => i.pluginSlug === pluginSlug),
    [data, pluginSlug],
  );

  const repoEntries = useMemo(
    () => aggregateByRepo(pluginItems, publishedVersion),
    [pluginItems, publishedVersion],
  );
  const personEntries = useMemo(
    () => aggregateByPerson(pluginItems, publishedVersion),
    [pluginItems, publishedVersion],
  );

  if (isLoading) {
    return (
      <PMHStack gap={2} align="center" data-testid="plugin-adoption-loading">
        <PMSpinner size="sm" />
        <PMText fontSize="sm" color="secondary">
          Loading adoption…
        </PMText>
      </PMHStack>
    );
  }

  if (pluginItems.length === 0) {
    return (
      <PMBox
        bg="background.secondary"
        borderRadius="sm"
        padding={3}
        data-testid="plugin-adoption-empty"
      >
        <PMText fontSize="sm" color="faded">
          No consumers yet. Installs appear after someone starts a Claude Code
          session with this plugin enabled; plugins published before install
          tracking shipped must be republished first.
        </PMText>
      </PMBox>
    );
  }

  const entries = axis === 'repo' ? repoEntries : personEntries;

  return (
    <PMVStack
      gap={3}
      align="stretch"
      data-testid={`plugin-adoption-tab-${pluginSlug}`}
    >
      <AxisTabs active={axis} onChange={setAxis} />
      {entries.length > 0 ? (
        <PMTable
          columns={ADOPTION_COLUMNS}
          data={entries.map((entry) => toRow(entry, publishedVersion))}
          size="sm"
          striped={false}
          hoverable={false}
        />
      ) : (
        <PMText fontSize="sm" color="faded" paddingY={1}>
          No repository installs yet. Switch to “By person” to see user-scope
          installs.
        </PMText>
      )}
    </PMVStack>
  );
}
