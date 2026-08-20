import type { ReactNode } from 'react';
import { Link } from 'react-router';
import {
  PMBox,
  PMButton,
  PMHStack,
  PMHeading,
  PMIcon,
  PMText,
  PMVStack,
} from '@packmind/ui';
import {
  LuBookCheck,
  LuChevronRight,
  LuTerminal,
  LuWandSparkles,
} from 'react-icons/lu';
import type { PackageResponse } from '@packmind/types';
import {
  buildPackageContext,
  type ContextComponent,
  type ContextComponentType,
} from './buildPackageContext';
import type { SpaceCatalogue } from './buildPackageContext';

const TYPE_ICONS: Record<ContextComponentType, ReactNode> = {
  standard: <LuBookCheck />,
  command: <LuTerminal />,
  skill: <LuWandSparkles />,
};

/**
 * What one package holds, grouped by type.
 *
 * The grouping is the pane's only structure. It says what kinds of thing are in
 * this package without a filter bar to operate, and it is derived from the type
 * table rather than written down here, so a fourth type appears as a fourth
 * heading and nothing else has to change.
 *
 * Rows lead to the detail pages that already exist. Opening a component inside
 * the pane comes later; until then this surface is a better index of a package,
 * not a replacement for its editors.
 */
export function ContextPackagePane({
  pkg,
  catalogue,
  orgSlug,
  spaceSlug,
  packageHref,
  packageEditHref,
}: Readonly<{
  pkg: PackageResponse;
  catalogue: SpaceCatalogue;
  orgSlug: string;
  spaceSlug: string;
  /** The package's own page, which still holds everything not moved here. */
  packageHref: string;
  /** Where membership is chosen, until a component can be added from here. */
  packageEditHref: string;
}>) {
  const { groups, total } = buildPackageContext(pkg, catalogue, {
    orgSlug,
    spaceSlug,
  });

  return (
    <PMBox padding={6}>
      <PMHStack align="start" justify="space-between" gap={6}>
        <PMBox minW={0} maxWidth="68ch">
          <PMHeading level="h2">{pkg.name}</PMHeading>
          {pkg.description && (
            <PMText as="div" color="secondary" paddingTop={1}>
              {pkg.description}
            </PMText>
          )}
          <PMText as="div" fontSize="sm" color="faded" paddingTop={2}>
            {total} component{total === 1 ? '' : 's'}
          </PMText>
        </PMBox>
        {/*
          The way out to everything this surface does not carry yet:
          distribution, edition, deletion, marketplace publication. Secondary,
          because reading the package is what this screen is for.
        */}
        <PMBox flexShrink={0}>
          <PMButton variant="secondary" size="sm" asChild>
            <Link to={packageHref}>Open package</Link>
          </PMButton>
        </PMBox>
      </PMHStack>

      <PMBox paddingTop={6}>
        {groups.length === 0 ? (
          <EmptyPackageBody packageEditHref={packageEditHref} />
        ) : (
          <PMVStack gap={5} align="stretch">
            {groups.map((group) => (
              <PMBox key={group.type}>
                <PMHStack gap={2} align="baseline">
                  <PMText
                    fontSize="10px"
                    fontWeight="semibold"
                    textTransform="uppercase"
                    letterSpacing="wider"
                    color="faded"
                  >
                    {group.label}
                  </PMText>
                  {/*
                    The count travels on the heading because there is no filter
                    bar above the list to carry it. It is also what tells the
                    breakdown of a package without opening every group.
                  */}
                  <PMText
                    fontSize="10px"
                    color="faded"
                    fontVariantNumeric="tabular-nums"
                  >
                    {group.components.length}
                  </PMText>
                </PMHStack>
                <PMBox paddingTop={1}>
                  <ComponentList components={group.components} />
                </PMBox>
              </PMBox>
            ))}
          </PMVStack>
        )}
      </PMBox>
    </PMBox>
  );
}

function ComponentList({
  components,
}: Readonly<{ components: readonly ContextComponent[] }>) {
  return (
    <PMBox
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="sm"
      overflow="hidden"
    >
      {components.map((component, index) => (
        <ComponentRow
          key={component.key}
          component={component}
          isFirst={index === 0}
        />
      ))}
    </PMBox>
  );
}

function ComponentRow({
  component,
  isFirst,
}: Readonly<{ component: ContextComponent; isFirst: boolean }>) {
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
          {TYPE_ICONS[component.type]}
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
 * A package with nothing in it. It names what that costs rather than inviting
 * the user to admire an empty frame: an empty package gives an agent nothing to
 * read and distributes nothing.
 */
function EmptyPackageBody({
  packageEditHref,
}: Readonly<{ packageEditHref: string }>) {
  return (
    <PMBox
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="sm"
      padding={6}
      maxWidth="68ch"
    >
      <PMText as="div" fontWeight="medium">
        This package is empty.
      </PMText>
      <PMText as="div" color="secondary" paddingTop={1}>
        A package with no component gives an agent nothing to read and
        distributes nothing. Add standards, commands or skills to it from its
        own edit form, and it is distributable as soon as you save.
      </PMText>
      <PMBox paddingTop={4}>
        <PMButton variant="primary" size="sm" asChild>
          <Link to={packageEditHref}>Add components</Link>
        </PMButton>
      </PMBox>
    </PMBox>
  );
}
