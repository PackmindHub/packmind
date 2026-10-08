import { useState } from 'react';
import {
  PMBox,
  PMButton,
  PMHStack,
  PMMenu,
  PMPortal,
  PMText,
  PMTooltip,
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
import { PackageVersionBarDataTestId } from '@packmind/frontend';
import {
  PACKAGE_MESSAGES,
  getReleaseVerdictMessage,
} from '../../constants/messages';
import { RelativeDate } from '../RelativeDate';
import { CreatePackageReleaseDrawer } from './CreatePackageReleaseDrawer';

/** What the ref menu calls the package as it stands, which has no version. */
const UNRELEASED = 'unreleased';

/**
 * Which version of the package is on screen, and the one act that adds to the
 * list — in the header's action cluster, the menu immediately before the verb
 * that feeds it.
 *
 * It was a bar of its own between the package's name and its tabs. The bar was
 * right to take the version out of the identity block, where it read as one
 * more property and put a lone verb in the one corner of the header that held
 * none. But it answered that by making a second row, and the row carried one
 * menu and one button across the full width of the pane for it.
 *
 * So the pair moves up into the cluster every other package-wide control is
 * already in. The menu names what is on screen and the button turns it into a
 * version: subject and verb, read in that order, with nothing between them.
 * The frame the pane below is read through is the same frame; it no longer
 * needs a row to say so.
 *
 * The drawer that cuts a release is owned here for the reason it always was:
 * the readiness this control already reads is exactly what the form needs.
 */
export function PackageReleaseControls(
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
   * The cluster keeps its height while the answer is on its way. Empty rather
   * than absent: the overflow menu beside these controls would otherwise jump
   * sideways under the reader's pointer as they arrive.
   */
  if (isLoading || !data) {
    return <PMBox minHeight={8} />;
  }

  const { readiness, releases } = data;
  const readRelease = props.readingVersion
    ? releases.find((release) => release.version === props.readingVersion)
    : undefined;

  return (
    <>
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
        <PMText fontSize="xs" color="secondary" whiteSpace="nowrap">
          Released <RelativeDate iso={readRelease.releasedAt} />
        </PMText>
      )}

      <ReleaseAction
        readiness={readiness}
        readingVersion={props.readingVersion}
        onOpen={() => setIsDrawerOpen(true)}
      />

      <CreatePackageReleaseDrawer
        packageId={props.packageId}
        spaceId={props.spaceId}
        organizationId={props.organizationId}
        readiness={readiness}
        componentsCount={props.componentsCount}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
      />
    </>
  );
}

/**
 * The header's one verb, in one word.
 *
 * It said `Create a release`, and `Create the first release` on a package that
 * had none — a label that restated the package's state in the one place on the
 * surface that cannot grow, beside a menu already saying it. What the cut will
 * produce is the drawer's first question, and the drawer is one click away.
 *
 * Grey rather than gone when it cannot be pressed. The control used to leave in
 * both dead states, on the rule that a disabled button is a sentence written as
 * a button. That rule holds for a control whose absence says nothing; this one
 * is the header's only verb, and a cluster that empties out is a header the
 * reader has to re-find their way around each time the package moves. So it
 * stays put and says why, which is the thing absence could never do.
 */
function ReleaseAction({
  readiness,
  readingVersion,
  onOpen,
}: Readonly<{
  readiness: PackageReleaseReadiness;
  readingVersion: string | null;
  onOpen: () => void;
}>) {
  const isReadingRelease = readingVersion !== null;
  const isDisabled = isReadingRelease || readiness.verdict !== 'ready';

  const reason = isReadingRelease
    ? PACKAGE_MESSAGES.release.readingRelease(readingVersion)
    : getReleaseVerdictMessage(readiness.verdict, readiness.currentVersion);

  const button = (
    <PMButton
      variant="primary"
      size="sm"
      disabled={isDisabled}
      onClick={onOpen}
      data-testid={PackageVersionBarDataTestId.Release}
    >
      Release
    </PMButton>
  );

  if (!isDisabled) return button;

  return (
    <PMTooltip label={reason} placement="top">
      {/*
        A disabled button emits no pointer events, so the sentence explaining
        why it is grey has to hang on something wrapped around it.
      */}
      <PMBox as="span" display="inline-flex">
        {button}
      </PMBox>
    </PMTooltip>
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
      <PMText
        fontSize="xs"
        color="secondary"
        whiteSpace="nowrap"
        data-testid={PackageVersionBarDataTestId.Reading}
      >
        {PACKAGE_MESSAGES.release.notReleasedYet}
      </PMText>
    );
  }

  return (
    <PMMenu.Root>
      <PMMenu.Trigger asChild>
        <PMButton
          variant="tertiary"
          size="sm"
          data-testid={PackageVersionBarDataTestId.Reading}
        >
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
