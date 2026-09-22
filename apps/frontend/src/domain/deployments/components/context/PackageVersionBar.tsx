import { useState } from 'react';
import {
  PMBox,
  PMButton,
  PMHStack,
  PMMenu,
  PMPortal,
  PMText,
} from '@packmind/ui';
import { LuChevronDown } from 'react-icons/lu';
import {
  OrganizationId,
  PackageId,
  PackageReleaseSummary,
  SpaceId,
} from '@packmind/types';
import { useListPackageReleasesQuery } from '../../api/queries/DeploymentsQueries';
import { PACKAGE_MESSAGES } from '../../constants/messages';
import { RelativeDate } from '../RelativeDate';
import { CreatePackageReleaseDrawer } from './CreatePackageReleaseDrawer';

/** What the ref menu calls the package as it stands, which has no version. */
const UNRELEASED = 'unreleased';

/**
 * Which version of the package is on screen, and the one action that adds to
 * the list.
 *
 * A bar of its own between the package's name and its tabs, rather than a pair
 * of controls under the name. The version used to sit inside the identity
 * block, left aligned, while every other thing that acts on the package sat in
 * the cluster on the right: two action zones on one header, and the quieter of
 * the two holding a verb.
 *
 * It is a bar because the version is not one more fact about the package: it is
 * the frame the pane below is read through. The menu names what is on screen,
 * and the action is what turns it into a version. When a destination installs a
 * version rather than the latest state, this same control is the axis the
 * Distribution tab will be read through too.
 *
 * It says nothing else. An earlier draft measured the distance to the last
 * release in a sentence beside the menu, and named the pinned components that
 * had moved on behind a disclosure: two readings of the gate's verdict that ask
 * the reader to hold a model of pinning before they can be understood, printed
 * on a header whose job is to say what is on screen. The action carries the
 * whole of it already, by being there or not: something to release, or nothing.
 *
 * The drawer that cuts a release is owned here for the reason it always was:
 * the readiness this bar already reads is exactly what the form needs.
 */
export function PackageVersionBar(
  props: Readonly<{
    packageId: PackageId;
    spaceId: SpaceId;
    organizationId: OrganizationId;
    componentsCount: number;
    /** The release being read, or null for the package as it stands. */
    readingVersion: string | null;
    onReadVersion: (version: string | null) => void;
  }>,
) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { data, isLoading } = useListPackageReleasesQuery(
    props.organizationId,
    props.spaceId,
    props.packageId,
  );

  /*
   * The row keeps its height while the answer is on its way. Empty rather than
   * absent: the tab strip sits directly under this bar, and a bar that appears
   * a moment later would push the strip and the list down under the reader's
   * pointer.
   */
  if (isLoading || !data) {
    return <PMBox minHeight={8} />;
  }

  const { readiness, releases } = data;
  const readRelease = props.readingVersion
    ? releases.find((release) => release.version === props.readingVersion)
    : undefined;

  return (
    <PMHStack minHeight={8} gap={3} align="center" wrap="wrap" width="100%">
      <VersionRef
        releases={releases}
        readingVersion={props.readingVersion}
        onReadVersion={props.onReadVersion}
      />

      {/*
        When the release was cut, beside the version it names. The identity of
        what is on screen, not a comparison with anything: a version string on
        its own does not say whether this is the cut the reader remembers.
        Absent, never invented, when the row carries no instant.
      */}
      {readRelease?.releasedAt && (
        <PMText fontSize="xs" color="secondary">
          Released <RelativeDate iso={readRelease.releasedAt} />
        </PMText>
      )}

      {/*
        Absent rather than disabled when the package has nothing to cut, which
        is the rule the header's own update control follows: a greyed control is
        a sentence written as a button.

        Absent too while a release is on screen. Cutting a version from a past
        one is not a thing this action does, and offering it under a bar that
        says 1.1.0 would read as cutting from there.
      */}
      {readiness.verdict === 'ready' && props.readingVersion === null && (
        <PMButton
          variant="secondary"
          size="sm"
          onClick={() => setIsDrawerOpen(true)}
        >
          {readiness.currentVersion === null
            ? 'Create the first release'
            : 'Create a release'}
        </PMButton>
      )}

      <CreatePackageReleaseDrawer
        packageId={props.packageId}
        spaceId={props.spaceId}
        organizationId={props.organizationId}
        readiness={readiness}
        componentsCount={props.componentsCount}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
      />
    </PMHStack>
  );
}

/**
 * What the pane is showing, and every other thing it could show.
 *
 * A sentence and not a menu until there is a second thing to pick: a package
 * with no release has one state, and a control that opens onto a list of one is
 * a control that lies about what is behind it. It was a bordered badge, which
 * beside the action put two rounded rectangles of the same size in a row, one
 * of them a control and one of them not.
 */
function VersionRef({
  releases,
  readingVersion,
  onReadVersion,
}: Readonly<{
  releases: PackageReleaseSummary[];
  readingVersion: string | null;
  onReadVersion: (version: string | null) => void;
}>) {
  if (releases.length === 0) {
    return (
      <PMText fontSize="xs" color="secondary">
        {PACKAGE_MESSAGES.release.notReleasedYet}
      </PMText>
    );
  }

  return (
    <PMMenu.Root>
      <PMMenu.Trigger asChild>
        <PMButton variant="tertiary" size="sm">
          {readingVersion ?? PACKAGE_MESSAGES.release.unreleased}
          <LuChevronDown aria-hidden />
        </PMButton>
      </PMMenu.Trigger>
      <PMPortal>
        <PMMenu.Positioner>
          <PMMenu.Content minW="16rem">
            {/*
              A radio group and not a list of links: these are not five places
              to go, they are five readings of one package, and exactly one of
              them is on screen. That is what the control has to say before it
              is opened, and what a reader coming back to it needs it to say.
            */}
            <PMMenu.RadioItemGroup
              value={readingVersion ?? UNRELEASED}
              onValueChange={({ value }) =>
                onReadVersion(value === UNRELEASED ? null : value)
              }
            >
              <PMMenu.RadioItem value={UNRELEASED}>
                <PMMenu.ItemIndicator />
                {PACKAGE_MESSAGES.release.unreleased}
              </PMMenu.RadioItem>
              <PMMenu.Separator />
              {releases.map((release) => (
                <PMMenu.RadioItem key={release.version} value={release.version}>
                  <PMMenu.ItemIndicator />
                  <PMHStack gap={2} justify="space-between" width="100%">
                    <PMText fontSize="sm">{release.version}</PMText>
                    {/*
                      The date beside the number, because a version string on
                      its own does not say which of two releases is the one the
                      reader remembers.
                    */}
                    {release.releasedAt && (
                      <PMText fontSize="xs" color="faded">
                        <RelativeDate iso={release.releasedAt} />
                      </PMText>
                    )}
                  </PMHStack>
                </PMMenu.RadioItem>
              ))}
            </PMMenu.RadioItemGroup>
          </PMMenu.Content>
        </PMMenu.Positioner>
      </PMPortal>
    </PMMenu.Root>
  );
}
