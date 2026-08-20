import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { PMBox, PMIcon, PMText } from '@packmind/ui';
import {
  LuBookCheck,
  LuChevronRight,
  LuPackage,
  LuTerminal,
  LuWandSparkles,
} from 'react-icons/lu';
import type {
  ContextComponent,
  ContextComponentType,
} from './buildPackageContext';

/**
 * The mark of each type, in one place. The two panes and the filter chips read
 * it, so a type cannot end up wearing two icons depending on where it is shown.
 */
export const COMPONENT_TYPE_ICONS: Record<ContextComponentType, ReactNode> = {
  standard: <LuBookCheck />,
  command: <LuTerminal />,
  skill: <LuWandSparkles />,
};

/**
 * One row of the list, and optionally the packages the component belongs to.
 * The pair travels together rather than the component alone because the same
 * list is read scoped to one package and unscoped across the space, and in the
 * second case the owner is the column that makes the row mean something.
 */
export type ComponentListEntry = {
  component: ContextComponent;
  packageNames?: string[];
};

/**
 * The list of components, shared by a package's own content and by the
 * space-wide inventory. Extracted the day the second one appeared: two lists of
 * the same objects would have grown two row heights and two ideas of what a
 * version looks like.
 */
export function ContextComponentList({
  entries,
  showPackages = false,
}: Readonly<{
  entries: readonly ComponentListEntry[];
  showPackages?: boolean;
}>) {
  return (
    <PMBox
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="sm"
      overflow="hidden"
    >
      {entries.map((entry, index) => (
        <ComponentRow
          key={entry.component.key}
          entry={entry}
          isFirst={index === 0}
          showPackages={showPackages}
        />
      ))}
    </PMBox>
  );
}

function ComponentRow({
  entry,
  isFirst,
  showPackages,
}: Readonly<{
  entry: ComponentListEntry;
  isFirst: boolean;
  showPackages: boolean;
}>) {
  const { component, packageNames = [] } = entry;

  return (
    /*
     * A real link rather than a box that navigates: the row is the whole target
     * area, so it has to be openable in a new tab and readable as an address by
     * anything that reads addresses. PMBox does not forward `to`, hence the
     * wrapper — the styling stays on the box, which is also what hovers.
     */
    <Link to={component.href}>
      <PMBox
        display="flex"
        width="full"
        alignItems="center"
        gap={3}
        textAlign="left"
        paddingX={3}
        paddingY="10px"
        borderTopWidth={isFirst ? '0' : '1px'}
        borderColor="border.tertiary"
        _hover={{ bg: 'background.secondary' }}
        transition="background-color 150ms ease-out"
      >
        {/* On the name, not on the pair: the rule the rail beside it follows. */}
        <PMIcon
          fontSize="sm"
          color="text.faded"
          flexShrink={0}
          alignSelf="flex-start"
          marginTop="0.25em"
        >
          {COMPONENT_TYPE_ICONS[component.type]}
        </PMIcon>
        <PMBox flex={1} minW={0}>
          <PMText as="div" fontSize="sm" fontWeight="medium" truncate>
            {component.name}
          </PMText>
          {component.summary && (
            <PMText as="div" fontSize="xs" color="faded" truncate>
              {component.summary}
            </PMText>
          )}
        </PMBox>
        {showPackages && <PackageColumn names={packageNames} />}
        {/*
          A fixed width, not the width of the number: v12 is one character wider
          than v5, and every column to its left would move with it.
        */}
        <PMText
          fontSize="xs"
          color="faded"
          flexShrink={0}
          width="32px"
          textAlign="right"
          fontVariantNumeric="tabular-nums"
        >
          v{component.version}
        </PMText>
        <PMIcon fontSize="xs" color="text.faded" flexShrink={0}>
          <LuChevronRight />
        </PMIcon>
      </PMBox>
    </Link>
  );
}

/**
 * Who carries this component. A column rather than a word on the second line:
 * read across the space, the owner is what the eye runs down.
 *
 * The empty case is the one that matters. A component in no package is
 * distributed to nobody, and this list is the only place in the plugin-first
 * navigation where it appears at all — so it says so in words rather than
 * leaving the cell blank, which would read as a rendering gap.
 */
function PackageColumn({ names }: Readonly<{ names: string[] }>) {
  const label =
    names.length === 0
      ? 'No package'
      : names.length === 1
        ? names[0]
        : `${names.length} packages`;

  return (
    <PMBox
      flexShrink={0}
      width="180px"
      minW={0}
      display="flex"
      alignItems="center"
      gap="6px"
      color={names.length === 0 ? 'text.secondary' : 'text.faded'}
    >
      <PMIcon fontSize="xs" flexShrink={0}>
        <LuPackage />
      </PMIcon>
      <PMBox
        as="span"
        fontSize="xs"
        truncate
        // The whole list on hover: "3 packages" is the scannable form, but which
        // three is a fair question to ask without leaving the row.
        title={names.length > 1 ? names.join(', ') : undefined}
        fontStyle={names.length === 0 ? 'italic' : undefined}
      >
        {label}
      </PMBox>
    </PMBox>
  );
}
