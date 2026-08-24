import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  PMBadge,
  PMBox,
  PMButton,
  PMHStack,
  PMHeading,
  PMTabsCompound,
  PMText,
  PMTooltip,
  PMVStack,
} from '@packmind/ui';
import type { OrganizationId, PackageResponse, SpaceId } from '@packmind/types';
import type { ContextComponent, ContextGroup } from './buildPackageContext';
import { buildDistributionTabBadge } from './buildDistributionTabBadge';
import {
  componentEditHref,
  packageDetailHref,
  withPaneDetailHref,
} from './buildComponentDetail';
import { ContextComponentDetail } from './ContextComponentDetail';
import { ContextComponentList } from './ContextComponentList';
import { ContextCreateMenu } from './ContextCreateMenu';
import { ContextPackageDistribution } from './ContextPackageDistribution';
import { MoveComponentDialog } from './MoveComponentDialog';
import { usePackageDrift } from './usePackageDrift';

const CONTENT_TAB = 'content';
const DISTRIBUTION_TAB = 'distribution';

/**
 * Which half of the package is being read. The same parameter name the package
 * page uses for its own tabs, and in the URL for the same reason the selected
 * package is: "this package is behind in two repositories" is a thing people
 * send each other, and it has to survive being pasted.
 */
const TAB_PARAM = 'tab';

/**
 * One package, read from two sides: what it holds, and where it landed.
 *
 * The two are one screen rather than two because they are one question asked
 * twice. A package is a promise that a set of components reaches a set of
 * repositories, and the components alone say nothing about whether the promise
 * is kept. The badge on the Distribution tab is what makes the second half
 * legible without opening it.
 *
 * A component opened from the Content tab takes the place of both halves: it is
 * read here rather than on a page of its own, and the way back is one link.
 * Which types can be read here is `RENDERS_IN_PANE`.
 *
 * It arrives already resolved rather than read from the address here, because
 * the surface needs the same answer for the rail beside this pane, and one
 * parameter read in two places is one chance too many to disagree.
 */
export function ContextPackagePane({
  pkg,
  packages,
  groups,
  total,
  detail,
  spaceId,
  organizationId,
  orgSlug,
  spaceSlug,
  packageHref,
  packageEditHref,
  distributionHistoryHref,
}: Readonly<{
  pkg: PackageResponse;
  /** The whole space, so a component can be moved without a second query. */
  packages: readonly PackageResponse[];
  /** What this package holds, grouped by type, built by the surface. */
  groups: readonly ContextGroup[];
  /** Components in the package, which the Content tab carries as its count. */
  total: number;
  /** The component the address asks for, or null to show the list. */
  detail: ContextComponent | null;
  spaceId: SpaceId;
  organizationId: OrganizationId;
  orgSlug: string;
  spaceSlug: string;
  /** The package's own page, which still holds everything not moved here. */
  packageHref: string;
  /** Where membership is chosen, until a component can be added from here. */
  packageEditHref: string;
  /** Where the distribution events of this package are listed. */
  distributionHistoryHref: string;
}>) {
  const [searchParams, setSearchParams] = useSearchParams();
  /*
   * The component being moved, held here rather than in the row: the dialog has
   * to outlive the list it was opened from, because the move rebuilds that list
   * and the row the button sits on is gone by the time the toast appears.
   */
  const [moving, setMoving] = useState<ContextComponent | null>(null);
  const tab =
    searchParams.get(TAB_PARAM) === DISTRIBUTION_TAB
      ? DISTRIBUTION_TAB
      : CONTENT_TAB;

  const showTab = (value: string) => {
    // Mutating the params we were handed, so the selected package survives the
    // tab change. Content is the default, so it leaves the URL clean.
    setSearchParams(
      (previous) => {
        if (value === CONTENT_TAB) previous.delete(TAB_PARAM);
        else previous.set(TAB_PARAM, value);
        return previous;
      },
      { replace: true },
    );
  };

  /*
   * Renamed on the way in: `packages` is now the space's package list, and the
   * drift hook returns the landings of this one package.
   */
  const {
    drift,
    packages: driftPackages,
    isLoading,
    isError,
  } = usePackageDrift(pkg.id);
  const distributionBadge = buildDistributionTabBadge(drift);

  /*
   * Built once and rendered by whichever half is on screen. The dialog has to
   * outlive the thing it was opened from: from the list, the move rebuilds that
   * list, and from the detail, the move empties the detail.
   */
  const moveDialog = moving && (
    <MoveComponentDialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) setMoving(null);
      }}
      component={moving}
      source={pkg}
      packages={packages}
      spaceId={spaceId}
      organizationId={organizationId}
      orgSlug={orgSlug}
      spaceSlug={spaceSlug}
    />
  );

  /*
   * The third thing this pane can show, beside its two tabs: one of the
   * components, in place of the tab strip rather than under it.
   */
  if (detail) {
    return (
      <>
        <PMBox flex="1" minH={0} overflowY="auto">
          <ContextComponentDetail
            component={detail}
            packageName={pkg.name}
            backHref={packageDetailHref(searchParams, pkg.id)}
            editHref={componentEditHref(detail, { orgSlug, spaceSlug })}
            onMove={() => setMoving(detail)}
          />
        </PMBox>
        {moveDialog}
      </>
    );
  }

  return (
    <PMTabsCompound.Root
      value={tab}
      onValueChange={(details) => showTab(details.value)}
      variant="line"
      height="100%"
      minH={0}
      display="flex"
      flexDirection="column"
      lazyMount
      unmountOnExit
    >
      <PMBox paddingX={6} paddingTop={6} flexShrink={0}>
        <PMHStack align="start" justify="space-between" gap={6}>
          <PMBox minW={0} maxWidth="68ch">
            <PMHeading level="h2">{pkg.name}</PMHeading>
            {pkg.description && (
              <PMText as="div" color="secondary" paddingTop={1}>
                {pkg.description}
              </PMText>
            )}
          </PMBox>
          <PMHStack flexShrink={0} gap={2}>
            {/*
              The way out to everything this surface does not carry yet:
              edition, deletion, marketplace publication. Secondary, because
              reading the package is what this screen is for.
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

        <PMBox paddingTop={5}>
          <PMTabsCompound.List>
            <PMTabsCompound.Trigger value={CONTENT_TAB}>
              Content
              {/*
                The count travels on the tab rather than under the package name:
                it is what tells the size of the half you are not looking at.
              */}
              <PMText
                fontSize="xs"
                color="faded"
                fontVariantNumeric="tabular-nums"
              >
                {total}
              </PMText>
            </PMTabsCompound.Trigger>
            <PMTabsCompound.Trigger value={DISTRIBUTION_TAB}>
              Distribution
              {distributionBadge && (
                <PMTooltip label={distributionBadge.tooltip} showArrow>
                  <PMBadge colorPalette="orange" size="sm">
                    {distributionBadge.text}
                  </PMBadge>
                </PMTooltip>
              )}
            </PMTabsCompound.Trigger>
          </PMTabsCompound.List>
        </PMBox>
      </PMBox>

      <PMTabsCompound.Content
        value={CONTENT_TAB}
        flex="1"
        minH={0}
        overflowY="auto"
        paddingX={6}
        paddingY={5}
      >
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
                    The per-group count has no other home: there is no filter bar
                    above the list, and it is what gives the breakdown of a
                    package without opening every group.
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
                      // Pointed at this pane for the types it can show, and at
                      // the component's own page for the ones it cannot yet.
                      component: withPaneDetailHref(
                        component,
                        searchParams,
                        pkg.id,
                      ),
                    }))}
                    onMove={setMoving}
                  />
                </PMBox>
              </PMBox>
            ))}
          </PMVStack>
        )}
      </PMTabsCompound.Content>

      <PMTabsCompound.Content
        value={DISTRIBUTION_TAB}
        flex="1"
        minH={0}
        display="flex"
        flexDirection="column"
        padding={0}
      >
        <ContextPackageDistribution
          pkg={pkg}
          drift={drift}
          packages={driftPackages}
          isLoading={isLoading}
          isError={isError}
          distributionHistoryHref={distributionHistoryHref}
        />
      </PMTabsCompound.Content>

      {moveDialog}
    </PMTabsCompound.Root>
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
