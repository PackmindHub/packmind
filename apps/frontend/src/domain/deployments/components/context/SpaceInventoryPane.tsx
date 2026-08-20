import { useMemo, useState, type ReactNode } from 'react';
import { PMBox, PMHStack, PMHeading, PMIcon, PMText } from '@packmind/ui';
import type { PackageResponse } from '@packmind/types';
import type {
  ContextComponentType,
  SpaceCatalogue,
} from './buildPackageContext';
import { buildSpaceInventory } from './buildSpaceInventory';
import {
  COMPONENT_TYPE_ICONS,
  ContextComponentList,
} from './ContextComponentList';

/**
 * Every component of the space, whatever package carries it.
 *
 * This is the one thing the plugin-first navigation took away and has to give
 * back. The per-type entries answered "what do we have", once per type; with
 * three entries and a rail of packages, nothing answered it any more, and a
 * component in no package had no address at all in the new navigation. This
 * answers it once, and a new component type adds a chip rather than a place
 * to go.
 *
 * Read-only on purpose. Creating belongs to a package, because a component
 * without one is distributed to nobody, and a New button here would have to ask
 * which package before doing anything — the question the surface is built to
 * make you answer first.
 */
export function SpaceInventoryPane({
  packages,
  catalogue,
  orgSlug,
  spaceSlug,
}: Readonly<{
  packages: readonly PackageResponse[];
  catalogue: SpaceCatalogue;
  orgSlug: string;
  spaceSlug: string;
}>) {
  const [typeFilter, setTypeFilter] = useState<ContextComponentType | null>(
    null,
  );

  const inventory = useMemo(
    () => buildSpaceInventory(packages, catalogue, { orgSlug, spaceSlug }),
    [packages, catalogue, orgSlug, spaceSlug],
  );

  const shownGroups = typeFilter
    ? inventory.groups.filter((group) => group.type === typeFilter)
    : inventory.groups;

  return (
    <PMBox padding={6}>
      <PMHeading level="h2">All components</PMHeading>
      <PMText as="div" color="secondary" paddingTop={1}>
        Everything this space owns, across its {packages.length} package
        {packages.length === 1 ? '' : 's'}. Open one to reach its page.
      </PMText>
      {/*
        Stated here rather than left to be counted row by row: a component in no
        package reaches no repository, and this is the only screen that can say
        how many there are.
      */}
      {inventory.orphanCount > 0 && (
        <PMText as="div" fontSize="sm" color="secondary" paddingTop={2}>
          {inventory.orphanCount} of them{' '}
          {inventory.orphanCount === 1 ? 'is' : 'are'} in no package, so{' '}
          {inventory.orphanCount === 1 ? 'it is' : 'they are'} distributed to
          nobody.
        </PMText>
      )}

      <PMBox paddingTop={5}>
        <PMHStack gap={1} wrap="wrap">
          <FilterChip
            label="All"
            count={inventory.total}
            isActive={typeFilter === null}
            onClick={() => setTypeFilter(null)}
          />
          {inventory.groups.map((group) => (
            <FilterChip
              key={group.type}
              label={group.label}
              count={group.entries.length}
              icon={COMPONENT_TYPE_ICONS[group.type]}
              isActive={typeFilter === group.type}
              onClick={() => setTypeFilter(group.type)}
            />
          ))}
        </PMHStack>
      </PMBox>

      <PMBox paddingTop={4}>
        {inventory.total === 0 ? (
          <PMText fontSize="sm" color="secondary">
            No component in this space yet. Open a package to add the first one.
          </PMText>
        ) : (
          <PMBox
            display="flex"
            flexDirection="column"
            gap={5}
            alignItems="stretch"
          >
            {shownGroups.map((group) => (
              <PMBox key={group.type}>
                {/*
                  The heading stays when a single type is shown: it is what says
                  the list is complete for that type rather than truncated.
                */}
                <PMText
                  fontSize="10px"
                  fontWeight="semibold"
                  textTransform="uppercase"
                  letterSpacing="wider"
                  color="faded"
                >
                  {group.label}
                </PMText>
                <PMBox paddingTop={1}>
                  <ContextComponentList entries={group.entries} showPackages />
                </PMBox>
              </PMBox>
            ))}
          </PMBox>
        )}
      </PMBox>
    </PMBox>
  );
}

/**
 * One axis only: the type. A chip for "in no package" would be genuinely useful
 * and is deliberately absent — mixing coverage with type in one row of chips
 * makes two of them selectable at once and neither of them mean anything.
 */
function FilterChip({
  label,
  count,
  icon,
  isActive,
  onClick,
}: Readonly<{
  label: string;
  count: number;
  icon?: ReactNode;
  isActive: boolean;
  onClick: () => void;
}>) {
  return (
    <PMBox
      as="button"
      display="inline-flex"
      alignItems="center"
      gap="6px"
      paddingX={2}
      paddingY="4px"
      borderRadius="sm"
      fontSize="xs"
      cursor="pointer"
      bg={isActive ? 'background.tertiary' : 'transparent'}
      color={isActive ? 'text.primary' : 'text.secondary'}
      fontWeight={isActive ? 'semibold' : 'normal'}
      _hover={isActive ? undefined : { bg: 'background.secondary' }}
      transition="background-color 150ms ease-out"
      onClick={onClick}
      aria-pressed={isActive}
    >
      {icon && (
        <PMIcon fontSize="xs" color="text.faded">
          {icon}
        </PMIcon>
      )}
      {label}
      <PMBox as="span" color="text.faded" fontVariantNumeric="tabular-nums">
        {count}
      </PMBox>
    </PMBox>
  );
}
