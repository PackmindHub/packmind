import { useMemo, useState } from 'react';
import {
  PMBox,
  PMEmptyState,
  PMHStack,
  PMIcon,
  PMInput,
  PMSpinner,
  PMText,
  PMVStack,
} from '@packmind/ui';
import type {
  GetPackageSummaryResponse,
  OrganizationId,
} from '@packmind/types';
import type { IconType } from 'react-icons';
import {
  LuChevronRight,
  LuSearch,
  LuShield,
  LuTerminal,
  LuWandSparkles,
} from 'react-icons/lu';
import { useGetPackageSummaryQuery } from '../../deployments/api/queries/DeploymentsQueries';

interface PluginOverviewTabProps {
  organizationId: OrganizationId | string;
  packageSlug: string;
}

/**
 * Overview tab of the marketplace plugin detail pane. Loads the package
 * summary on demand (description + recipes/standards/skills with their
 * names and summaries) via the existing /organizations/:orgId/packages/:slug
 * endpoint, and renders the prototype's ArtifactsBlock pattern — search
 * input, facet chips per kind, grouped listings.
 */
export function PluginOverviewTab({
  organizationId,
  packageSlug,
}: Readonly<PluginOverviewTabProps>) {
  const { data, isLoading, isError } = useGetPackageSummaryQuery(
    organizationId,
    packageSlug,
  );

  if (isLoading) {
    return (
      <PMBox paddingY={6}>
        <PMEmptyState
          icon={<PMSpinner />}
          title="Loading package details"
          description="Fetching description and bundled artifacts."
        />
      </PMBox>
    );
  }

  if (isError || !data) {
    return (
      <PMText fontSize="sm" color="faded">
        Could not load the package summary.
      </PMText>
    );
  }

  const grouped = groupArtifacts(data);

  return (
    <PMVStack gap={6} align="stretch">
      <DescriptionBlock description={data.description} />
      <ArtifactsBlock grouped={grouped} />
    </PMVStack>
  );
}

function DescriptionBlock({ description }: Readonly<{ description: string }>) {
  if (!description.trim()) {
    return (
      <PMText fontSize="sm" color="faded">
        No description provided for this package.
      </PMText>
    );
  }
  return (
    <PMText fontSize="md" color="secondary" lineHeight={1.55} maxW="70ch">
      {description}
    </PMText>
  );
}

// Backend models them as "recipes", but the user-facing concept is a
// slash-invoked Command — match the prototype's terminology in the UI and
// keep the wire-shape translation contained to `groupArtifacts`.
type ArtifactKind = 'command' | 'standard' | 'skill';

type Artifact = {
  kind: ArtifactKind;
  name: string;
  summary: string;
};

const KIND_ORDER: ArtifactKind[] = ['command', 'standard', 'skill'];

const KIND_ICON: Record<ArtifactKind, IconType> = {
  command: LuTerminal,
  standard: LuShield,
  skill: LuWandSparkles,
};

const KIND_LABEL: Record<ArtifactKind, string> = {
  command: 'Commands',
  standard: 'Standards',
  skill: 'Skills',
};

function groupArtifacts(
  summary: GetPackageSummaryResponse,
): Record<ArtifactKind, Artifact[]> {
  const byName = (a: Artifact, b: Artifact) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  return {
    command: summary.recipes
      .map((r) => ({
        kind: 'command' as const,
        name: r.name,
        summary: r.summary ?? '',
      }))
      .sort(byName),
    standard: summary.standards
      .map((s) => ({
        kind: 'standard' as const,
        name: s.name,
        summary: s.summary ?? '',
      }))
      .sort(byName),
    skill: summary.skills
      .map((s) => ({
        kind: 'skill' as const,
        name: s.name,
        summary: s.summary ?? '',
      }))
      .sort(byName),
  };
}

type ArtifactFilter = ArtifactKind | 'all';

interface ArtifactsBlockProps {
  grouped: Record<ArtifactKind, Artifact[]>;
}

function ArtifactsBlock({ grouped }: Readonly<ArtifactsBlockProps>) {
  const total = useMemo(
    () => KIND_ORDER.reduce((sum, k) => sum + grouped[k].length, 0),
    [grouped],
  );
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
        <PMText fontSize="xs" color="faded" fontVariantNumeric="tabular-nums">
          {isFiltering
            ? `${visibleCount} of ${total}`
            : `${total} ${total === 1 ? 'item' : 'items'}`}
        </PMText>
      </PMHStack>

      {total === 0 ? (
        <PMText fontSize="sm" color="faded">
          This package bundles no artifacts yet.
        </PMText>
      ) : (
        <>
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
        </>
      )}
    </PMVStack>
  );
}

interface ArtifactToolbarProps {
  query: string;
  onQueryChange: (next: string) => void;
  total: number;
  grouped: Record<ArtifactKind, Artifact[]>;
  active: ArtifactFilter;
  onFilterChange: (next: ArtifactFilter) => void;
}

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

interface FacetChipProps {
  active: boolean;
  onClick: () => void;
  count: number;
  icon?: IconType;
  children: React.ReactNode;
}

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

interface ArtifactGroupProps {
  kind: ArtifactKind;
  items: Artifact[];
  totalInKind: number;
  showHeader: boolean;
}

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
            color="secondary"
            textTransform="uppercase"
            letterSpacing="wider"
            fontWeight="semibold"
          >
            {KIND_LABEL[kind]}
          </PMText>
          <PMText fontSize="xs" color="faded" fontVariantNumeric="tabular-nums">
            {items.length === totalInKind
              ? items.length
              : `${items.length} / ${totalInKind}`}
          </PMText>
        </PMHStack>
      )}
      <PMVStack gap={0} align="stretch">
        {items.map((a, idx) => (
          <ArtifactRow key={`${kind}-${a.name}-${idx}`} artifact={a} />
        ))}
      </PMVStack>
    </PMVStack>
  );
}

function ArtifactRow({ artifact }: Readonly<{ artifact: Artifact }>) {
  const Icon = KIND_ICON[artifact.kind];
  return (
    <PMBox
      paddingY="6px"
      paddingX={2}
      borderRadius="sm"
      display="grid"
      gridTemplateColumns="14px minmax(0, 32ch) minmax(0, 1fr) 14px"
      alignItems="center"
      columnGap={3}
      transition="background-color 120ms ease-out"
      _hover={{ bg: 'background.secondary' }}
      role="group"
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
      <PMText fontSize="sm" fontWeight="medium" color="primary" truncate>
        {artifact.name}
      </PMText>
      <PMText fontSize="xs" color="secondary" lineHeight={1.4} truncate>
        {artifact.summary}
      </PMText>
      <PMBox
        as="span"
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        color="text.faded"
        opacity={0.5}
        aria-hidden
      >
        <PMIcon fontSize="sm">
          <LuChevronRight />
        </PMIcon>
      </PMBox>
    </PMBox>
  );
}

interface ArtifactsEmptyProps {
  query: string;
  onReset: () => void;
}

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
      <PMText fontSize="sm" color="secondary">
        {query
          ? `Nothing in this bundle matches "${query}".`
          : 'No artifacts in the selected kind.'}
      </PMText>
      <PMBox
        as="button"
        fontSize="xs"
        color="branding.primary"
        bg="transparent"
        border="none"
        cursor="pointer"
        padding={0}
        onClick={onReset}
      >
        Clear filters
      </PMBox>
    </PMVStack>
  );
}

interface SectionLabelProps {
  children: React.ReactNode;
}

function SectionLabel({ children }: Readonly<SectionLabelProps>) {
  return (
    <PMText
      fontSize="xs"
      color="secondary"
      textTransform="uppercase"
      letterSpacing="wider"
      fontWeight="semibold"
    >
      {children}
    </PMText>
  );
}
