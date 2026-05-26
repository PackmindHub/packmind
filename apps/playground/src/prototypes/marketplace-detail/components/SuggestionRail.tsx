import { useMemo, useState } from 'react';
import {
  PMBadge,
  PMBox,
  PMHStack,
  PMIcon,
  PMInput,
  PMStatus,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuClock, LuMessageSquare, LuSearch } from 'react-icons/lu';
import type { IconType } from 'react-icons';
import { getSpaceColorPalette } from '../spaceColor';
import type { Suggestion, SuggestionGroupKey } from '../types';

type SuggestionRailProps = {
  suggestions: Suggestion[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

type Grouped = Array<{
  key: SuggestionGroupKey;
  label: string;
  items: Suggestion[];
}>;

export function SuggestionRail({
  suggestions,
  selectedId,
  onSelect,
}: Readonly<SuggestionRailProps>) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suggestions;
    return suggestions.filter(
      (s) =>
        s.pluginName.toLowerCase().includes(q) ||
        s.suggester.name.toLowerCase().includes(q) ||
        s.originSpace.name.toLowerCase().includes(q),
    );
  }, [suggestions, query]);

  const grouped = useMemo<Grouped>(() => {
    const pending: Suggestion[] = [];
    const inReview: Suggestion[] = [];
    for (const s of filtered) {
      if (s.state === 'pending') pending.push(s);
      else if (s.state === 'in-review') inReview.push(s);
    }
    return [
      { key: 'pending', label: 'Pending', items: pending },
      { key: 'in-review', label: 'In review', items: inReview },
    ];
  }, [filtered]);

  const totalPending = suggestions.filter((s) => s.state === 'pending').length;

  return (
    <PMBox
      width="320px"
      flexShrink={0}
      bg="background.primary"
      borderRightWidth="1px"
      borderColor="border.tertiary"
      display="flex"
      flexDirection="column"
      minH={0}
    >
      <PMVStack
        gap={2}
        paddingX={3}
        paddingY={3}
        align="stretch"
        borderBottomWidth="1px"
        borderColor="border.tertiary"
      >
        <PMHStack justify="space-between" align="center">
          <PMText
            fontSize="11px"
            color="text.faded"
            textTransform="uppercase"
            letterSpacing="wider"
            fontWeight="semibold"
          >
            Suggestions
          </PMText>
          <PMText
            fontSize="11px"
            color={totalPending > 0 ? 'branding.primary' : 'text.faded'}
            fontVariantNumeric="tabular-nums"
            fontWeight={totalPending > 0 ? 'semibold' : 'normal'}
          >
            {totalPending > 0
              ? `${totalPending} pending`
              : `${suggestions.length}`}
          </PMText>
        </PMHStack>
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
          >
            <PMIcon fontSize="sm">
              <LuSearch />
            </PMIcon>
          </PMBox>
          <PMInput
            placeholder="Filter suggestions"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            size="sm"
            paddingLeft="32px"
          />
        </PMBox>
      </PMVStack>

      <PMBox flex="1" overflow="auto" minH={0}>
        {filtered.length === 0 ? (
          <FilteredZero query={query} onClear={() => setQuery('')} />
        ) : (
          grouped.map((group) =>
            group.items.length === 0 ? null : (
              <SuggestionGroup
                key={group.key}
                groupKey={group.key}
                label={group.label}
                items={group.items}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ),
          )
        )}
      </PMBox>
    </PMBox>
  );
}

type SuggestionGroupProps = {
  groupKey: SuggestionGroupKey;
  label: string;
  items: Suggestion[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

function SuggestionGroup({
  label,
  items,
  selectedId,
  onSelect,
}: Readonly<SuggestionGroupProps>) {
  return (
    <PMBox>
      <PMHStack
        justify="space-between"
        align="center"
        paddingX={3}
        paddingTop={3}
        paddingBottom={1.5}
      >
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
          fontSize="11px"
          color="text.faded"
          fontVariantNumeric="tabular-nums"
        >
          {items.length}
        </PMText>
      </PMHStack>
      {items.map((s) => (
        <SuggestionRow
          key={s.id}
          suggestion={s}
          selected={s.id === selectedId}
          onSelect={() => onSelect(s.id)}
        />
      ))}
    </PMBox>
  );
}

type SuggestionRowProps = {
  suggestion: Suggestion;
  selected: boolean;
  onSelect: () => void;
};

const STATE_ICON: Partial<Record<Suggestion['state'], IconType>> = {
  pending: LuClock,
  'in-review': LuMessageSquare,
};

const STATE_COLOR: Partial<Record<Suggestion['state'], string>> = {
  pending: 'branding.primary',
  'in-review': 'text.secondary',
};

function SuggestionRow({
  suggestion,
  selected,
  onSelect,
}: Readonly<SuggestionRowProps>) {
  const Icon = STATE_ICON[suggestion.state] ?? LuClock;
  const stateColor = STATE_COLOR[suggestion.state] ?? 'text.faded';
  const dimmed = false;

  return (
    <PMBox
      as="button"
      type="button"
      onClick={onSelect}
      width="100%"
      textAlign="left"
      bg={selected ? 'background.secondary' : 'transparent'}
      border="none"
      cursor="pointer"
      paddingY={2.5}
      paddingLeft={3}
      paddingRight={3}
      position="relative"
      borderBottom="1px solid"
      borderColor="border.tertiary"
      transition="background-color 120ms ease-out"
      _hover={selected ? undefined : { bg: 'background.tertiary' }}
      _focusVisible={{
        outline: 'none',
        bg: selected ? 'background.secondary' : 'background.tertiary',
        boxShadow: 'inset 0 0 0 2px var(--chakra-colors-branding-primary)',
      }}
      aria-pressed={selected}
      aria-label={`Suggestion ${suggestion.pluginName} from ${suggestion.suggester.name}`}
    >
      {selected && (
        <PMBox
          position="absolute"
          left={0}
          top={0}
          bottom={0}
          width="2px"
          bg="branding.primary"
          aria-hidden
        />
      )}
      <PMVStack gap={1} align="stretch">
        <PMHStack gap={2} align="center" justify="space-between">
          <PMHStack gap={2} align="center" minW={0} flex={1}>
            <PMBox
              color={stateColor}
              display="inline-flex"
              alignItems="center"
              flexShrink={0}
              aria-hidden
            >
              <PMIcon fontSize="12px">
                <Icon />
              </PMIcon>
            </PMBox>
            <PMText
              fontSize="sm"
              fontWeight={selected ? 'semibold' : 'medium'}
              color={dimmed ? 'text.faded' : 'text.primary'}
              truncate
            >
              {suggestion.pluginName}
            </PMText>
          </PMHStack>
          <PMText
            fontSize="11px"
            color="text.faded"
            flexShrink={0}
            fontVariantNumeric="tabular-nums"
          >
            {suggestion.suggestedRelative}
          </PMText>
        </PMHStack>
        <PMHStack gap={2} align="center">
          <PMBadge size="sm" maxW="100%" minW={0}>
            <PMStatus.Root
              colorPalette={getSpaceColorPalette(suggestion.originSpace.name)}
              flexShrink={0}
            >
              <PMStatus.Indicator />
            </PMStatus.Root>
            <PMBox as="span" truncate>
              {suggestion.originSpace.name}
            </PMBox>
          </PMBadge>
          <PMText fontSize="11px" color="text.faded" truncate>
            {suggestion.suggester.name}
          </PMText>
        </PMHStack>
      </PMVStack>
    </PMBox>
  );
}

type FilteredZeroProps = {
  query: string;
  onClear: () => void;
};

function FilteredZero({ query, onClear }: Readonly<FilteredZeroProps>) {
  return (
    <PMVStack gap={2} align="start" padding={4}>
      <PMText fontSize="xs" color="secondary">
        No suggestions match &ldquo;{query}&rdquo;.
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
        _hover={{ color: 'blue.300' }}
        onClick={onClear}
      >
        Clear filter
      </PMBox>
    </PMVStack>
  );
}
