import { useState } from 'react';
import {
  PMBox,
  PMButton,
  PMHStack,
  PMLink,
  PMMenu,
  PMPopover,
  PMPortal,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuChevronDown } from 'react-icons/lu';
import {
  OrganizationId,
  PackageId,
  PackageReleaseReadiness,
  PackageReleaseSummary,
  SpaceId,
} from '@packmind/types';
import { useListPackageReleasesQuery } from '../../api/queries/DeploymentsQueries';
import { PACKAGE_MESSAGES } from '../../constants/messages';
import { RelativeDate } from '../RelativeDate';
import { CreatePackageReleaseDrawer } from './CreatePackageReleaseDrawer';

/** What the ref menu calls the editable package, which has no version string. */
const WORKING_COPY = 'working-copy';

/**
 * Which version of the package is on screen, and the one action that adds to
 * the list.
 *
 * A bar of its own between the package's name and its tabs, rather than a pair
 * of controls under the name. The version used to sit inside the identity
 * block, left aligned, while every other thing that acts on the package sat in
 * the cluster on the right: two action zones on one header, and the quieter of
 * the two holding a verb. Worse, it was read as a property of the package, so
 * the description, the readiness sentence and the list of what had moved all
 * piled into a header that cannot grow without pushing the components off the
 * pane.
 *
 * It is a bar because the version is not one more fact about the package: it is
 * the frame the pane below is read through. The menu names what is on screen,
 * the sentence beside it says how far that is from the last cut, and the action
 * is what closes the distance. When a destination installs a version rather
 * than the latest state, this same control is the axis the Distribution tab
 * will be read through too.
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
    /** The release being read, or null for the working copy. */
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

  return (
    <PMHStack minHeight={8} gap={3} align="center" wrap="wrap" width="100%">
      <VersionRef
        releases={releases}
        readingVersion={props.readingVersion}
        onReadVersion={props.onReadVersion}
      />
      <VersionState
        readiness={readiness}
        releases={releases}
        readingVersion={props.readingVersion}
      />
      {/*
        Absent rather than disabled when the package has nothing to cut. A
        greyed control with a sentence under it saying why is a sentence written
        as a button, and the sentence beside it already says it: identical to
        the last release, or emptied since it. The same rule the header's own
        update control follows.

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
 * A badge and not a menu until there is a second thing to pick: a package with
 * no release has one state, and a control that opens onto a list of one is a
 * control that lies about what is behind it.
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
  /*
   * A sentence, not a badge, and not a menu: a package with no release has one
   * state and nothing to switch to. It was a bordered badge, which beside the
   * action put two rounded rectangles of the same size in a row, one of them a
   * control and one of them not, and the fact read as a disabled button.
   */
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
          {readingVersion ?? PACKAGE_MESSAGES.release.workingCopy}
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
              value={readingVersion ?? WORKING_COPY}
              onValueChange={({ value }) =>
                onReadVersion(value === WORKING_COPY ? null : value)
              }
            >
              <PMMenu.RadioItem value={WORKING_COPY}>
                <PMMenu.ItemIndicator />
                {PACKAGE_MESSAGES.release.workingCopy}
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
                      reader remembers. Absent, never invented, when the row
                      carries no instant.
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

/**
 * How far what is on screen stands from the last release, in one line.
 *
 * Said in the words the verdict can carry and no others. The gate answers with
 * three states and names no count, so "3 changes" would be a number this
 * surface invented: what it does know by name is which pinned components have
 * moved on, and those go behind a disclosure rather than into the header as a
 * column of grey lines.
 */
function VersionState({
  readiness,
  releases,
  readingVersion,
}: Readonly<{
  readiness: PackageReleaseReadiness;
  releases: PackageReleaseSummary[];
  readingVersion: string | null;
}>) {
  if (readingVersion !== null) {
    const release = releases.find(
      (candidate) => candidate.version === readingVersion,
    );

    if (!release?.releasedAt) return null;

    return (
      <PMText fontSize="xs" color="secondary">
        Released <RelativeDate iso={release.releasedAt} />
      </PMText>
    );
  }

  const { currentVersion, verdict, outdatedComponents } = readiness;

  /*
   * Nothing to compare against on a package that has never been released: the
   * badge beside this already says so, and a second sentence saying it twice is
   * what this bar replaced.
   */
  if (currentVersion === null) return null;

  return (
    <PMHStack gap={2} align="center" wrap="wrap">
      <PMText fontSize="xs" color="secondary">
        {stateSentence(verdict, currentVersion)}
      </PMText>
      {/*
        The separator the surrounding surfaces already use between two facts on
        one line. Without it the sentence ends on a version and the disclosure
        opens on a count, and "since 1.0.0 1 newer component" reads as one
        number run into another.
      */}
      {outdatedComponents.length > 0 && (
        <PMText fontSize="xs" color="faded" aria-hidden>
          &middot;
        </PMText>
      )}
      {/*
        `lazyMount` and `unmountOnExit` on the disclosure, because this list is
        as long as the package is behind: a header that cannot grow was carrying
        every one of these lines, and a closed disclosure that still holds them
        is the same weight with the paint turned off.
      */}
      {outdatedComponents.length > 0 && (
        <PMPopover.Root
          positioning={{ placement: 'bottom-start' }}
          lazyMount
          unmountOnExit
        >
          <PMPopover.Trigger asChild>
            <PMLink
              as="button"
              type="button"
              variant="underline"
              fontSize="xs"
              cursor="pointer"
            >
              {outdatedComponents.length} newer{' '}
              {outdatedComponents.length === 1 ? 'component' : 'components'}
            </PMLink>
          </PMPopover.Trigger>
          <PMPopover.Positioner>
            {/*
              Its own surface and border. The default content is close enough
              in tone to the page that the list read as printed on it rather
              than over it, which is the one thing an overlay has to say.
            */}
            <PMPopover.Content
              width="22rem"
              bg="background.primary"
              borderWidth="1px"
              borderColor="border.tertiary"
            >
              <PMPopover.Arrow>
                <PMPopover.ArrowTip />
              </PMPopover.Arrow>
              <PMPopover.Body>
                <PMPopover.Title fontSize="sm" fontWeight="medium">
                  Newer than what {currentVersion} pins
                </PMPopover.Title>
                <PMVStack gap={1} align="stretch" marginTop={3}>
                  {outdatedComponents.map((component) => (
                    <PMHStack
                      key={`${component.family}:${component.id}`}
                      gap={3}
                      justify="space-between"
                    >
                      <PMText fontSize="xs" truncate>
                        {component.name}
                      </PMText>
                      <PMText
                        fontSize="xs"
                        color="faded"
                        flexShrink={0}
                        fontVariantNumeric="tabular-nums"
                      >
                        v{component.pinnedVersion} &rarr; v
                        {component.latestVersion}
                      </PMText>
                    </PMHStack>
                  ))}
                </PMVStack>
              </PMPopover.Body>
            </PMPopover.Content>
          </PMPopover.Positioner>
        </PMPopover.Root>
      )}
    </PMHStack>
  );
}

/**
 * The working copy against the last release, in the one voice each verdict
 * earns.
 *
 * `no_components` reads as a package that was emptied rather than one that is
 * empty, because a package with a release behind it and nothing in it now is
 * exactly that, and the body below already tells a never-filled package what to
 * do about it.
 */
function stateSentence(
  verdict: PackageReleaseReadiness['verdict'],
  currentVersion: string,
): string {
  if (verdict === 'no_change') return `Identical to ${currentVersion}`;
  if (verdict === 'no_components') return `Emptied since ${currentVersion}`;
  return `Unreleased changes since ${currentVersion}`;
}
