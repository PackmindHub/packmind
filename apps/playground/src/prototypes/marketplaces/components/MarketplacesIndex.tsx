import { useMemo, useState } from 'react';
import {
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMInput,
  PMSkeleton,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuPlug, LuSearch } from 'react-icons/lu';
import type { CoverageView, Marketplace, Scenario } from '../types';
import { MarketplaceRow } from './MarketplaceRow';

type MarketplacesIndexProps = {
  scenario: Scenario;
  marketplaces: Marketplace[];
  newlyLinkedId: string | null;
  onOpenLinkPanel: () => void;
};

export function MarketplacesIndex({
  scenario,
  marketplaces,
  newlyLinkedId,
  onOpenLinkPanel,
}: Readonly<MarketplacesIndexProps>) {
  const [query, setQuery] = useState('');
  const [coverageView, setCoverageView] = useState<CoverageView>('repos');

  const filtered = useMemo(() => {
    if (scenario !== 'default') return [];
    const q = query.trim().toLowerCase();
    if (!q) return marketplaces;
    return marketplaces.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.repoPath.toLowerCase().includes(q),
    );
  }, [query, scenario, marketplaces]);

  const total = scenario === 'default' ? marketplaces.length : 0;

  return (
    <PMVStack gap={4} align="stretch">
      <Toolbar
        query={query}
        onQueryChange={setQuery}
        total={total}
        coverageView={coverageView}
        onCoverageViewChange={setCoverageView}
        disabled={scenario !== 'default'}
      />

      {scenario === 'loading' && <LoadingState />}

      {scenario === 'empty' && <EmptyState onOpenLinkPanel={onOpenLinkPanel} />}

      {scenario === 'default' &&
        filtered.length === 0 &&
        marketplaces.length > 0 && (
          <FilteredZeroState query={query} onClear={() => setQuery('')} />
        )}

      {scenario === 'default' &&
        filtered.length === 0 &&
        marketplaces.length === 0 && (
          <EmptyState onOpenLinkPanel={onOpenLinkPanel} />
        )}

      {scenario === 'default' && filtered.length > 0 && (
        <PMBox
          bg="background.primary"
          borderWidth="1px"
          borderColor="border.tertiary"
          borderRadius="md"
          overflow="hidden"
        >
          <ListHeader />
          {filtered.map((m, i) => {
            const isNewlyLinked = m.id === newlyLinkedId;
            return (
              <PMBox
                key={m.id}
                bg={isNewlyLinked ? 'background.tertiary' : undefined}
                transition="background-color 900ms ease-out"
                {...(i === filtered.length - 1
                  ? { '& > *': { borderBottom: 'none' } }
                  : {})}
              >
                <MarketplaceRow marketplace={m} coverageView={coverageView} />
              </PMBox>
            );
          })}
        </PMBox>
      )}
    </PMVStack>
  );
}

type ToolbarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  total: number;
  coverageView: CoverageView;
  onCoverageViewChange: (view: CoverageView) => void;
  disabled: boolean;
};

function Toolbar({
  query,
  onQueryChange,
  total,
  coverageView,
  onCoverageViewChange,
  disabled,
}: Readonly<ToolbarProps>) {
  return (
    <PMHStack gap={4} align="center" justify="space-between">
      <PMBox position="relative" width="320px">
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
          placeholder="Filter marketplaces"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          disabled={disabled}
          size="sm"
          paddingLeft="32px"
        />
      </PMBox>

      <PMHStack gap={4} align="center">
        {!disabled && (
          <PMText
            fontSize="xs"
            color="secondary"
            fontVariantNumeric="tabular-nums"
          >
            {total} marketplaces
          </PMText>
        )}
        <CoverageViewToggle
          value={coverageView}
          onChange={onCoverageViewChange}
          disabled={disabled}
        />
      </PMHStack>
    </PMHStack>
  );
}

type CoverageViewToggleProps = {
  value: CoverageView;
  onChange: (view: CoverageView) => void;
  disabled: boolean;
};

function CoverageViewToggle({
  value,
  onChange,
  disabled,
}: Readonly<CoverageViewToggleProps>) {
  return (
    <PMHStack gap={1.5} align="center">
      <PMText fontSize="xs" color="faded">
        Coverage by
      </PMText>
      <PMHStack
        gap={0}
        padding="2px"
        bg="background.tertiary"
        borderRadius="sm"
        opacity={disabled ? 0.5 : 1}
        pointerEvents={disabled ? 'none' : 'auto'}
      >
        {(['repos', 'devs'] as const).map((v) => {
          const active = value === v;
          return (
            <PMBox
              key={v}
              as="button"
              type="button"
              fontSize="xs"
              fontWeight={active ? 'semibold' : 'normal'}
              color={active ? 'text.primary' : 'text.faded'}
              bg={active ? 'background.primary' : 'transparent'}
              paddingX={2}
              paddingY={0.5}
              borderRadius="sm"
              border="none"
              cursor={disabled ? 'not-allowed' : 'pointer'}
              transition="color 150ms ease-out, background-color 150ms ease-out"
              _hover={active ? undefined : { color: 'text.secondary' }}
              onClick={() => onChange(v)}
              aria-pressed={active}
            >
              {v}
            </PMBox>
          );
        })}
      </PMHStack>
    </PMHStack>
  );
}

function ListHeader() {
  return (
    <PMHStack
      gap={5}
      paddingX={4}
      paddingY={2}
      bg="background.secondary"
      borderBottom="1px solid"
      borderColor="border.tertiary"
      fontSize="10px"
      color="text.faded"
      textTransform="uppercase"
      letterSpacing="wider"
      fontWeight="semibold"
    >
      <PMBox flex={1} minW={0}>
        Marketplace
      </PMBox>
      <PMBox width="280px" flexShrink={0}>
        Contents
      </PMBox>
      <PMBox width="180px" flexShrink={0} textAlign="right">
        Coverage
      </PMBox>
      <PMBox width="64px" flexShrink={0} />
    </PMHStack>
  );
}

function LoadingState() {
  return (
    <PMBox
      bg="background.primary"
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="md"
      overflow="hidden"
    >
      <ListHeader />
      {[0, 1, 2, 3].map((i) => (
        <PMHStack
          key={i}
          gap={5}
          paddingX={4}
          paddingY={3}
          borderBottom={i === 3 ? 'none' : '1px solid'}
          borderColor="border.tertiary"
          align="center"
        >
          <PMVStack flex={1} minW={0} gap={1.5} align="start">
            <PMSkeleton height="14px" width="180px" />
            <PMSkeleton height="11px" width="240px" />
          </PMVStack>
          <PMVStack width="280px" flexShrink={0} gap={1.5} align="start">
            <PMSkeleton height="11px" width="220px" />
            <PMSkeleton height="11px" width="160px" />
          </PMVStack>
          <PMVStack width="180px" flexShrink={0} gap={1.5} align="end">
            <PMSkeleton height="14px" width="80px" />
            <PMSkeleton height="11px" width="120px" />
          </PMVStack>
          <PMBox width="64px" flexShrink={0} />
        </PMHStack>
      ))}
    </PMBox>
  );
}

function EmptyState({
  onOpenLinkPanel,
}: Readonly<{ onOpenLinkPanel: () => void }>) {
  return (
    <PMBox
      bg="background.primary"
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="md"
      paddingX={8}
      paddingY={10}
    >
      <PMVStack gap={4} align="start" maxW="520px">
        <PMBox
          width="40px"
          height="40px"
          borderRadius="md"
          bg="background.tertiary"
          display="flex"
          alignItems="center"
          justifyContent="center"
          color="branding.primary"
        >
          <PMIcon fontSize="lg">
            <LuPlug />
          </PMIcon>
        </PMBox>
        <PMVStack gap={2} align="start">
          <PMText fontSize="md" fontWeight="semibold" color="primary">
            Publish your first marketplace
          </PMText>
          <PMText fontSize="sm" color="secondary" lineHeight={1.5}>
            A marketplace is a Git repo where Packmind publishes packages so
            Claude Code or Copilot can pull them. Link a repo to get started.
          </PMText>
        </PMVStack>
        <PMHStack gap={3}>
          <PMButton variant="primary" size="sm" onClick={onOpenLinkPanel}>
            Link a repo
          </PMButton>
          <PMButton variant="secondary" size="sm">
            Read the docs
          </PMButton>
        </PMHStack>
      </PMVStack>
    </PMBox>
  );
}

type FilteredZeroProps = {
  query: string;
  onClear: () => void;
};

function FilteredZeroState({ query, onClear }: Readonly<FilteredZeroProps>) {
  return (
    <PMBox
      bg="background.primary"
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="md"
      paddingX={6}
      paddingY={8}
    >
      <PMHStack gap={3} align="center">
        <PMText fontSize="sm" color="secondary">
          No marketplaces match &ldquo;{query}&rdquo;.
        </PMText>
        <PMBox
          as="button"
          type="button"
          fontSize="sm"
          color="branding.primary"
          bg="transparent"
          border="none"
          cursor="pointer"
          _hover={{ color: 'blue.300' }}
          onClick={onClear}
        >
          Clear filter
        </PMBox>
      </PMHStack>
    </PMBox>
  );
}
