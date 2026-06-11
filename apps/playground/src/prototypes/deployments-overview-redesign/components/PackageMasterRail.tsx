import { useMemo, useState } from 'react';
import {
  PMBox,
  PMHStack,
  PMIcon,
  PMInput,
  PMText,
  PMTooltip,
  PMVStack,
} from '@packmind/ui';
import { LuSearch } from 'react-icons/lu';
import { packageBehindInstallCount, packageHasDrift } from '../data';
import type { PackageDrift } from '../types';

type PackageMasterRailProps = {
  packages: PackageDrift[];
  selectedPackageId: string | null;
  onSelect: (packageId: string) => void;
};

type DriftFilter = 'all' | 'drift' | 'aligned';

export function PackageMasterRail({
  packages,
  selectedPackageId,
  onSelect,
}: Readonly<PackageMasterRailProps>) {
  const [query, setQuery] = useState('');
  const [driftFilter, setDriftFilter] = useState<DriftFilter>('all');

  const counts = useMemo(() => {
    let drift = 0;
    for (const p of packages) if (packageHasDrift(p)) drift++;
    return { all: packages.length, drift, aligned: packages.length - drift };
  }, [packages]);

  const filtered = useMemo(() => {
    let list = packages;
    if (driftFilter === 'drift') list = list.filter(packageHasDrift);
    else if (driftFilter === 'aligned')
      list = list.filter((p) => !packageHasDrift(p));
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));
    return list;
  }, [packages, query, driftFilter]);

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
            Packages
          </PMText>
          <PMText
            fontSize="11px"
            color="text.faded"
            fontVariantNumeric="tabular-nums"
          >
            {packages.length}
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
            placeholder="Filter packages"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            size="sm"
            paddingLeft="32px"
          />
        </PMBox>
        <DriftFilterControl
          value={driftFilter}
          counts={counts}
          onChange={setDriftFilter}
        />
      </PMVStack>

      <PMBox flex="1" overflow="auto" minH={0}>
        {filtered.length === 0 ? (
          <FilteredZero
            query={query}
            driftFilter={driftFilter}
            onClear={() => {
              setQuery('');
              setDriftFilter('all');
            }}
          />
        ) : (
          filtered.map((p) => (
            <PackageRow
              key={p.id}
              pkg={p}
              selected={p.id === selectedPackageId}
              onSelect={() => onSelect(p.id)}
            />
          ))
        )}
      </PMBox>
    </PMBox>
  );
}

type PackageRowProps = {
  pkg: PackageDrift;
  selected: boolean;
  onSelect: () => void;
};

function PackageRow({ pkg, selected, onSelect }: Readonly<PackageRowProps>) {
  const behindInstallCount = packageBehindInstallCount(pkg);
  const hasDrift = packageHasDrift(pkg);
  const totalInstalls = pkg.installLocations.length;

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
      aria-label={`Package ${pkg.name}, ${behindInstallCount} of ${totalInstalls} distributions behind`}
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
      <PMHStack gap={3} align="center" justify="space-between">
        <PMText
          fontSize="sm"
          fontWeight={selected ? 'semibold' : 'medium'}
          color="text.primary"
          truncate
          flex={1}
          minW={0}
        >
          {pkg.name}
        </PMText>
        <PMTooltip
          label={
            hasDrift
              ? `${behindInstallCount} of ${totalInstalls} distributions behind`
              : `${totalInstalls} distributions aligned`
          }
          showArrow
          openDelay={200}
        >
          <PMBox
            display="flex"
            alignItems="center"
            justifyContent="center"
            width="20px"
            height="20px"
            cursor="help"
            flexShrink={0}
            aria-label={
              hasDrift
                ? `${behindInstallCount} of ${totalInstalls} distributions behind`
                : `${totalInstalls} distributions aligned`
            }
          >
            <PMBox
              width="8px"
              height="8px"
              borderRadius="full"
              bg={hasDrift ? 'orange.500' : 'green.500'}
              aria-hidden
            />
          </PMBox>
        </PMTooltip>
      </PMHStack>
    </PMBox>
  );
}

function FilteredZero({
  query,
  driftFilter,
  onClear,
}: Readonly<{
  query: string;
  driftFilter: DriftFilter;
  onClear: () => void;
}>) {
  const message = (() => {
    if (query)
      return driftFilter === 'all'
        ? `No packages match “${query}”.`
        : `No ${driftFilter === 'drift' ? 'drifted' : 'aligned'} packages match “${query}”.`;
    if (driftFilter === 'drift') return 'No packages currently drifting.';
    if (driftFilter === 'aligned') return 'No fully aligned packages.';
    return 'No packages.';
  })();
  return (
    <PMVStack gap={2} align="start" padding={4}>
      <PMText fontSize="xs" color="secondary">
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
        _hover={{ color: 'blue.300' }}
        onClick={onClear}
      >
        Clear filters
      </PMBox>
    </PMVStack>
  );
}

type DriftFilterControlProps = {
  value: DriftFilter;
  counts: { all: number; drift: number; aligned: number };
  onChange: (value: DriftFilter) => void;
};

const FILTER_ITEMS: Array<{
  value: DriftFilter;
  label: string;
  dotColor?: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'drift', label: 'Drift', dotColor: 'orange.500' },
  { value: 'aligned', label: 'Aligned', dotColor: 'green.500' },
];

function DriftFilterControl({
  value,
  counts,
  onChange,
}: Readonly<DriftFilterControlProps>) {
  return (
    <PMHStack
      gap={0}
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="sm"
      overflow="hidden"
      role="tablist"
      aria-label="Filter by drift state"
    >
      {FILTER_ITEMS.map((item, idx) => {
        const active = value === item.value;
        const count = counts[item.value];
        return (
          <PMBox
            key={item.value}
            as="button"
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            flex={1}
            bg={active ? 'background.secondary' : 'transparent'}
            border="none"
            borderLeftWidth={idx === 0 ? 0 : '1px'}
            borderColor="border.tertiary"
            cursor="pointer"
            paddingY="6px"
            paddingX={2}
            transition="background-color 120ms ease-out"
            _hover={active ? undefined : { bg: 'background.tertiary' }}
            _focusVisible={{
              outline: 'none',
              boxShadow:
                'inset 0 0 0 2px var(--chakra-colors-branding-primary)',
            }}
          >
            <PMHStack gap="6px" align="center" justify="center">
              {item.dotColor && (
                <PMBox
                  width="6px"
                  height="6px"
                  borderRadius="full"
                  bg={item.dotColor}
                  aria-hidden
                />
              )}
              <PMText
                fontSize="xs"
                color={active ? 'text.primary' : 'text.secondary'}
                fontWeight={active ? 'semibold' : 'medium'}
              >
                {item.label}
              </PMText>
              <PMText
                fontSize="11px"
                color="text.faded"
                fontVariantNumeric="tabular-nums"
              >
                {count}
              </PMText>
            </PMHStack>
          </PMBox>
        );
      })}
    </PMHStack>
  );
}
