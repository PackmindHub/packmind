import { Link } from 'react-router';
import {
  PMBox,
  PMButton,
  PMHStack,
  PMHeading,
  PMText,
  PMVStack,
} from '@packmind/ui';
import type { PackageResponse } from '@packmind/types';
import { buildPackageContext } from './buildPackageContext';
import type { SpaceCatalogue } from './buildPackageContext';
import { ContextComponentList } from './ContextComponentList';
import { ContextCreateMenu } from './ContextCreateMenu';

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
        <PMHStack flexShrink={0} gap={2}>
          {/*
            The way out to everything this surface does not carry yet:
            distribution, edition, deletion, marketplace publication. Secondary,
            because reading the package is what this screen is for.
          */}
          <PMButton variant="secondary" size="sm" asChild>
            <Link to={packageHref}>Open package</Link>
          </PMButton>
          {/*
            Creating sits here, on the pane, and not in the rail below the list
            of packages: the rail creates containers, this creates what goes in
            them, and side by side the two would read as the same gesture.
          */}
          <ContextCreateMenu
            orgSlug={orgSlug}
            spaceSlug={spaceSlug}
            packageId={pkg.id}
          />
        </PMHStack>
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
                  <ContextComponentList
                    entries={group.components.map((component) => ({
                      component,
                    }))}
                  />
                </PMBox>
              </PMBox>
            ))}
          </PMVStack>
        )}
      </PMBox>
    </PMBox>
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
