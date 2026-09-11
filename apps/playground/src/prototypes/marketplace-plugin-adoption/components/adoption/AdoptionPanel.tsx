import { useCallback, useMemo, useState } from 'react';
import {
  PMAlert,
  PMBox,
  PMEmptyState,
  PMHStack,
  PMIcon,
  PMSkeleton,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuUsers } from 'react-icons/lu';
import {
  AGENT_LABEL,
  NO_FILTERS,
  type AdoptionFilters,
  type GroupMode,
  type Plugin,
} from '../../types';
import { buildGroups, filterInstalls, summarize } from '../../utils/adoption';
import { AdoptionCoverage } from './AdoptionCoverage';
import { AdoptionTable } from './AdoptionTable';
import { AdoptionToolbar } from './AdoptionToolbar';

type AdoptionPanelProps = {
  plugin: Plugin;
  filters: AdoptionFilters;
  onFiltersChange: (next: AdoptionFilters) => void;
  groupMode: GroupMode;
  onGroupModeChange: (next: GroupMode) => void;
  isLoading: boolean;
};

export function AdoptionPanel({
  plugin,
  filters,
  onFiltersChange,
  groupMode,
  onGroupModeChange,
  isLoading,
}: Readonly<AdoptionPanelProps>) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const summary = useMemo(
    () => summarize(plugin.installs, plugin.publishedRevision),
    [plugin.installs, plugin.publishedRevision],
  );
  const filtered = useMemo(
    () => filterInstalls(plugin.installs, filters, plugin.publishedRevision),
    [plugin.installs, filters, plugin.publishedRevision],
  );
  const groups = useMemo(
    () => buildGroups(filtered, groupMode, plugin.publishedRevision),
    [filtered, groupMode, plugin.publishedRevision],
  );

  const toggleExpand = useCallback((key: string) => {
    setExpandedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // A search is a request to see the matching rows, not to hunt for which
  // collapsed group hides them — so searching expands everything it kept.
  const searching = filters.query.trim() !== '';
  const effectiveExpanded = useMemo(
    () =>
      searching ? new Set(groups.map((group) => group.key)) : expandedKeys,
    [searching, groups, expandedKeys],
  );
  const allExpanded =
    groups.length > 0 &&
    groups.every((group) => effectiveExpanded.has(group.key));

  if (isLoading) return <AdoptionSkeleton />;

  if (plugin.installs.length === 0) {
    return (
      <PMBox paddingY={8}>
        <PMEmptyState
          icon={
            <PMIcon fontSize="xl" color="text.faded">
              <LuUsers />
            </PMIcon>
          }
          title="No consumers yet"
          description={`Installs appear here after someone starts a ${AGENT_LABEL['claude-code']} or ${AGENT_LABEL['copilot-cli']} session with ${plugin.name} enabled. Nothing to chase yet.`}
        />
      </PMBox>
    );
  }

  return (
    <PMVStack gap={0} align="stretch">
      {plugin.publishedRevision === null && (
        <PMBox paddingBottom={3}>
          <PMAlert.Root status="info" size="sm">
            <PMAlert.Indicator />
            <PMAlert.Content>
              <PMAlert.Title>Drift cannot be computed yet</PMAlert.Title>
              <PMAlert.Description>
                This plugin was published before Packmind stamped a content
                revision. Republish it to start comparing what each session
                actually runs.
              </PMAlert.Description>
            </PMAlert.Content>
          </PMAlert.Root>
        </PMBox>
      )}

      <AdoptionCoverage
        summary={summary}
        publishedRevision={plugin.publishedRevision}
        status={filters.status}
        onStatusChange={(status) => onFiltersChange({ ...filters, status })}
      />

      <AdoptionToolbar
        filters={filters}
        onFiltersChange={onFiltersChange}
        groupMode={groupMode}
        onGroupModeChange={onGroupModeChange}
        availableAgents={summary.agents}
        shownInstalls={filtered.length}
        totalInstalls={plugin.installs.length}
        statusFilterEnabled={plugin.publishedRevision !== null}
      />

      {filtered.length === 0 ? (
        <NoMatches onClear={() => onFiltersChange(NO_FILTERS)} />
      ) : (
        <PMVStack gap={2} align="stretch" paddingTop={3}>
          {groupMode !== 'none' && (
            <PMHStack gap={3} align="center">
              <PMText
                fontSize="xs"
                color="faded"
                fontVariantNumeric="tabular-nums"
              >
                {groups.length} {groupLabel(groupMode, groups.length)}
              </PMText>
              <PMBox
                as="button"
                fontSize="xs"
                color="branding.primary"
                bg="transparent"
                border="none"
                cursor="pointer"
                padding={0}
                marginLeft="auto"
                onClick={() =>
                  setExpandedKeys(
                    allExpanded
                      ? new Set()
                      : new Set(groups.map((group) => group.key)),
                  )
                }
                _hover={{ color: 'blue.300' }}
              >
                {allExpanded ? 'Collapse all' : 'Expand all'}
              </PMBox>
            </PMHStack>
          )}
          <AdoptionTable
            groupMode={groupMode}
            groups={groups}
            installs={filtered}
            publishedRevision={plugin.publishedRevision}
            expandedKeys={effectiveExpanded}
            onToggleExpand={toggleExpand}
            showAgentColumn={summary.agents.length > 1}
          />
        </PMVStack>
      )}
    </PMVStack>
  );
}

function groupLabel(mode: GroupMode, count: number): string {
  if (mode === 'repository') {
    return count === 1 ? 'repository group' : 'repository groups';
  }
  if (mode === 'person') return count === 1 ? 'person' : 'people';
  return count === 1 ? 'agent' : 'agents';
}

function NoMatches({ onClear }: Readonly<{ onClear: () => void }>) {
  return (
    <PMVStack gap={2} align="start" paddingY={6}>
      <PMText fontSize="sm" color="secondary">
        No install matches these filters.
      </PMText>
      <PMBox
        as="button"
        fontSize="sm"
        color="branding.primary"
        bg="transparent"
        border="none"
        cursor="pointer"
        padding={0}
        onClick={onClear}
        _hover={{ color: 'blue.300' }}
      >
        Clear filters
      </PMBox>
    </PMVStack>
  );
}

function AdoptionSkeleton() {
  return (
    <PMVStack gap={4} align="stretch" data-testid="adoption-loading">
      <PMSkeleton height="24px" width="320px" />
      <PMHStack gap={2}>
        <PMSkeleton height="24px" width="80px" />
        <PMSkeleton height="24px" width="110px" />
        <PMSkeleton height="24px" width="90px" />
      </PMHStack>
      <PMSkeleton height="34px" width="100%" />
      {[0, 1, 2, 3, 4].map((row) => (
        <PMSkeleton key={row} height="30px" width="100%" />
      ))}
    </PMVStack>
  );
}
