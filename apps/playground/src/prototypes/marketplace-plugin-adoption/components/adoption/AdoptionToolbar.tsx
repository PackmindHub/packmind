import { useMemo } from 'react';
import {
  PMBox,
  PMHStack,
  PMIcon,
  PMInput,
  PMMenu,
  PMPortal,
  PMSegmentGroup,
  PMText,
} from '@packmind/ui';
import { LuChevronDown, LuSearch, LuX } from 'react-icons/lu';
import {
  AGENT_LABEL,
  SCOPE_LABEL,
  type AdoptionFilters,
  type Agent,
  type GroupMode,
  type InstallScope,
} from '../../types';

// One toolbar over one list. "By repo" / "By person" stop being tabs — they are
// what they always were, two groupings of the same rows — and search, scope and
// agent join them instead of being unavailable.

const GROUP_ITEMS: Array<{ value: GroupMode; label: string }> = [
  { value: 'repository', label: 'Repository' },
  { value: 'person', label: 'Person' },
  { value: 'agent', label: 'Agent' },
  { value: 'none', label: 'Nothing' },
];

const SCOPE_ITEMS: InstallScope[] = ['project', 'local', 'user'];

type AdoptionToolbarProps = {
  filters: AdoptionFilters;
  onFiltersChange: (next: AdoptionFilters) => void;
  groupMode: GroupMode;
  onGroupModeChange: (next: GroupMode) => void;
  /** Agents present in this plugin's installs — the facet is pointless below two. */
  availableAgents: Agent[];
  /** Result line: how many rows the table shows out of the whole set. */
  shownInstalls: number;
  totalInstalls: number;
  /** Null published revision makes the status facet meaningless. */
  statusFilterEnabled: boolean;
};

export function AdoptionToolbar({
  filters,
  onFiltersChange,
  groupMode,
  onGroupModeChange,
  availableAgents,
  shownInstalls,
  totalInstalls,
  statusFilterEnabled,
}: Readonly<AdoptionToolbarProps>) {
  const chips = useMemo(
    () => buildChips(filters, statusFilterEnabled),
    [filters, statusFilterEnabled],
  );

  const clearChip = (chip: FilterChip) => {
    switch (chip.kind) {
      case 'query':
        onFiltersChange({ ...filters, query: '' });
        return;
      case 'status':
        onFiltersChange({ ...filters, status: 'all' });
        return;
      case 'scope':
        onFiltersChange({
          ...filters,
          scopes: filters.scopes.filter((s) => s !== chip.value),
        });
        return;
      default:
        onFiltersChange({
          ...filters,
          agents: filters.agents.filter((a) => a !== chip.value),
        });
    }
  };

  return (
    <PMBox
      display="flex"
      flexDirection="column"
      gap={2.5}
      paddingY={3}
      borderTopWidth="1px"
      borderBottomWidth="1px"
      borderColor="border.tertiary"
    >
      <PMHStack gap={3} align="center" wrap="wrap">
        <PMBox position="relative" flex="1" minW="240px" maxW="420px">
          <PMBox
            position="absolute"
            left="10px"
            top="50%"
            transform="translateY(-50%)"
            color="text.faded"
            pointerEvents="none"
            display="flex"
            alignItems="center"
          >
            <PMIcon fontSize="sm">
              <LuSearch />
            </PMIcon>
          </PMBox>
          <PMInput
            placeholder="Search repository, person or revision"
            value={filters.query}
            onChange={(event) =>
              onFiltersChange({ ...filters, query: event.target.value })
            }
            size="sm"
            paddingLeft="32px"
            aria-label="Search installs"
          />
        </PMBox>

        <PMHStack gap={2} align="center">
          <PMText fontSize="xs" color="faded">
            Group by
          </PMText>
          <PMSegmentGroup.Root
            size="sm"
            value={groupMode}
            onValueChange={(event) =>
              onGroupModeChange(event.value as GroupMode)
            }
          >
            <PMSegmentGroup.Indicator bg="background.tertiary" />
            {GROUP_ITEMS.map((item) => (
              <PMSegmentGroup.Item
                key={item.value}
                value={item.value}
                _checked={{ color: 'text.primary' }}
              >
                <PMSegmentGroup.ItemText>{item.label}</PMSegmentGroup.ItemText>
                <PMSegmentGroup.ItemHiddenInput />
              </PMSegmentGroup.Item>
            ))}
          </PMSegmentGroup.Root>
        </PMHStack>

        <FacetMenu
          label="Scope"
          options={SCOPE_ITEMS.map((scope) => ({
            value: scope,
            label: SCOPE_LABEL[scope],
          }))}
          selected={filters.scopes}
          onToggle={(value) =>
            onFiltersChange({
              ...filters,
              scopes: toggle(filters.scopes, value as InstallScope),
            })
          }
        />

        {availableAgents.length > 1 && (
          <FacetMenu
            label="Agent"
            options={availableAgents.map((agent) => ({
              value: agent,
              label: AGENT_LABEL[agent],
            }))}
            selected={filters.agents}
            onToggle={(value) =>
              onFiltersChange({
                ...filters,
                agents: toggle(filters.agents, value as Agent),
              })
            }
          />
        )}
      </PMHStack>

      <PMHStack gap={2} align="center" wrap="wrap" minH="24px">
        <PMText fontSize="xs" color="faded" fontVariantNumeric="tabular-nums">
          {shownInstalls === totalInstalls
            ? `${totalInstalls} ${totalInstalls === 1 ? 'install' : 'installs'}`
            : `Showing ${shownInstalls} of ${totalInstalls} installs`}
        </PMText>
        {chips.map((chip) => (
          <FilterChipTag
            key={`${chip.kind}-${chip.value ?? ''}`}
            label={chip.label}
            onClear={() => clearChip(chip)}
          />
        ))}
        {chips.length > 0 && (
          <PMBox
            as="button"
            fontSize="xs"
            color="branding.primary"
            bg="transparent"
            border="none"
            cursor="pointer"
            padding={0}
            onClick={() =>
              onFiltersChange({
                query: '',
                status: 'all',
                scopes: [],
                agents: [],
              })
            }
            _hover={{ color: 'blue.300' }}
          >
            Clear all
          </PMBox>
        )}
      </PMHStack>
    </PMBox>
  );
}

function toggle<T>(values: T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((v) => v !== value)
    : [...values, value];
}

type FilterChip = {
  kind: 'query' | 'status' | 'scope' | 'agent';
  label: string;
  value?: string;
};

function buildChips(
  filters: AdoptionFilters,
  statusFilterEnabled: boolean,
): FilterChip[] {
  const chips: FilterChip[] = [];
  if (filters.query.trim() !== '') {
    chips.push({ kind: 'query', label: `“${filters.query.trim()}”` });
  }
  if (statusFilterEnabled && filters.status !== 'all') {
    chips.push({
      kind: 'status',
      label: filters.status === 'behind' ? 'Behind' : 'Up to date',
    });
  }
  for (const scope of filters.scopes) {
    chips.push({
      kind: 'scope',
      value: scope,
      label: `Scope: ${SCOPE_LABEL[scope]}`,
    });
  }
  for (const agent of filters.agents) {
    chips.push({ kind: 'agent', value: agent, label: AGENT_LABEL[agent] });
  }
  return chips;
}

function FilterChipTag({
  label,
  onClear,
}: Readonly<{ label: string; onClear: () => void }>) {
  return (
    <PMHStack
      gap={1}
      align="center"
      paddingLeft={2}
      paddingRight={1}
      paddingY={0.5}
      borderRadius="sm"
      borderWidth="1px"
      borderColor="border.tertiary"
      bg="background.secondary"
    >
      <PMText fontSize="xs" color="secondary">
        {label}
      </PMText>
      <PMBox
        as="button"
        onClick={onClear}
        bg="transparent"
        border="none"
        cursor="pointer"
        display="flex"
        alignItems="center"
        color="text.faded"
        padding={0.5}
        borderRadius="sm"
        aria-label={`Remove filter ${label}`}
        _hover={{ color: 'text.primary' }}
      >
        <PMIcon fontSize="xs">
          <LuX />
        </PMIcon>
      </PMBox>
    </PMHStack>
  );
}

type FacetOption = { value: string; label: string };

type FacetMenuProps = {
  label: string;
  options: FacetOption[];
  selected: string[];
  onToggle: (value: string) => void;
};

/**
 * Multi-select facet. Nothing selected means "everything" rather than
 * "nothing": an empty selection that hid every row would be a state the reader
 * can enter by accident and not understand.
 */
function FacetMenu({
  label,
  options,
  selected,
  onToggle,
}: Readonly<FacetMenuProps>) {
  const active = selected.length > 0;
  return (
    <PMMenu.Root
      closeOnSelect={false}
      positioning={{ placement: 'bottom-start' }}
    >
      <PMMenu.Trigger asChild>
        <PMBox
          as="button"
          display="inline-flex"
          alignItems="center"
          gap={1.5}
          paddingX={2.5}
          paddingY={1}
          borderRadius="sm"
          borderWidth="1px"
          borderColor={active ? 'branding.primary' : 'border.tertiary'}
          bg={active ? 'background.tertiary' : 'transparent'}
          color={active ? 'text.primary' : 'text.secondary'}
          fontSize="xs"
          fontWeight="medium"
          cursor="pointer"
          transition="color 120ms ease-out, border-color 120ms ease-out"
          _hover={{ color: 'text.primary' }}
        >
          {active ? `${label}: ${selected.length}` : label}
          <PMIcon fontSize="xs">
            <LuChevronDown />
          </PMIcon>
        </PMBox>
      </PMMenu.Trigger>
      <PMPortal>
        <PMMenu.Positioner>
          <PMMenu.Content minWidth="200px">
            {options.map((option) => (
              <PMMenu.CheckboxItem
                key={option.value}
                value={option.value}
                checked={selected.includes(option.value)}
                onCheckedChange={() => onToggle(option.value)}
                cursor="pointer"
              >
                <PMText fontSize="xs" color="primary">
                  {option.label}
                </PMText>
                <PMMenu.ItemIndicator />
              </PMMenu.CheckboxItem>
            ))}
          </PMMenu.Content>
        </PMMenu.Positioner>
      </PMPortal>
    </PMMenu.Root>
  );
}
