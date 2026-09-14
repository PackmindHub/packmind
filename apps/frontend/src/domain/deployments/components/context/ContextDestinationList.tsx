import { useState, type ReactNode } from 'react';
import {
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMIconButton,
  PMLink,
  PMText,
} from '@packmind/ui';
import {
  LuCheck,
  LuChevronDown,
  LuChevronRight,
  LuFolderGit2,
  LuStore,
} from 'react-icons/lu';
import {
  needsAHand,
  type PackageDestination,
  type PackageDestinationState,
} from './buildPackageDestinations';

/**
 * Everywhere a package stands, in one list.
 *
 * The exceptions are the page. A package reaching three hundred landings has
 * three hundred rows worth of nothing to say and four worth reading, so the
 * ones that are fine are a count and a fold, and what is left above them is
 * what someone opened this tab to find.
 *
 * Failures are a band of their own rather than the top of the drifted one. Both
 * need a hand, but not the same hand: a drifted landing is put right by pushing
 * again, and a failed one may not be, since what stopped the push is often
 * outside Packmind. Reading them in one run teaches the eye that the first rows
 * are the worst of the same thing, which is not what they are.
 */
export function ContextDestinationList({
  destinations,
  onUpdate,
}: Readonly<{
  destinations: readonly PackageDestination[];
  /**
   * Pushing this package to one landing again. Absent for a marketplace, which
   * is republished rather than written to, and for a reader who cannot act.
   */
  onUpdate?: (destination: PackageDestination) => void;
}>) {
  const failed = destinations.filter((row) => row.state === 'failed');
  const pending = destinations.filter(
    (row) => row.state === 'behind' || row.state === 'waiting',
  );
  const aligned = destinations.filter((row) => !needsAHand(row.state));

  return (
    <PMBox
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="sm"
      overflow="hidden"
    >
      <Band
        label="Failed"
        tone="red.300"
        rows={failed}
        total={destinations.length}
        onUpdate={onUpdate}
        isFirst
      />
      <Band
        label="Behind or waiting"
        tone="orange.500"
        rows={pending}
        total={destinations.length}
        onUpdate={onUpdate}
        isFirst={failed.length === 0}
      />
      <UpToDateBand rows={aligned} isFirst={destinations.length === 0} />
    </PMBox>
  );
}

function Band({
  label,
  tone,
  rows,
  total,
  isFirst,
  onUpdate,
}: Readonly<{
  label: string;
  tone: string;
  rows: readonly PackageDestination[];
  /** Every destination, so the band can say what share of them it holds. */
  total: number;
  isFirst: boolean;
  onUpdate?: (destination: PackageDestination) => void;
}>) {
  if (rows.length === 0) return null;

  return (
    <>
      <PMHStack
        gap={2}
        align="center"
        paddingX={3}
        paddingY="5px"
        bg="background.secondary"
        borderTopWidth={isFirst ? '0' : '1px'}
        borderColor="border.tertiary"
      >
        <PMBox
          width="6px"
          height="6px"
          borderRadius="full"
          bg={tone}
          flexShrink={0}
          aria-hidden
        />
        <PMText fontSize="xs" fontWeight="semibold">
          {label}
        </PMText>
        {/*
          The share and not the count on its own. "2" says how much is wrong,
          "2 of 240" says whether that is a bad day or a broken setup, and the
          second number is the one a reader has no other way to get once the
          rest of the list is folded away.
        */}
        <PMText fontSize="xs" color="faded" fontVariantNumeric="tabular-nums">
          {rows.length} of {total} destination{total === 1 ? '' : 's'}
        </PMText>
      </PMHStack>
      {rows.map((row) => (
        <DestinationRow key={row.key} destination={row} onUpdate={onUpdate} />
      ))}
    </>
  );
}

/**
 * What is fine, as one line.
 *
 * Folded, and it opens. The count is the answer nine times out of ten, and the
 * tenth is someone checking that a particular repository is in there, which is
 * a fair question to ask without leaving the tab.
 */
function UpToDateBand({
  rows,
  isFirst,
}: Readonly<{ rows: readonly PackageDestination[]; isFirst: boolean }>) {
  const [open, setOpen] = useState(false);

  if (rows.length === 0) return null;

  return (
    <>
      <PMHStack
        gap={2}
        align="center"
        paddingLeft={3}
        paddingRight={2}
        paddingY="5px"
        bg="background.secondary"
        borderTopWidth={isFirst ? '0' : '1px'}
        borderColor="border.tertiary"
      >
        <PMIcon fontSize="xs" color="text.faded">
          <LuCheck />
        </PMIcon>
        <PMText fontSize="xs" color="faded">
          {rows.length} destination{rows.length === 1 ? ' is' : 's are'} up to
          date
        </PMText>
        {/*
          The names beside the count while they fit, which is what makes the
          folded line worth reading at all in the small case: three
          repositories named take no more room than the sentence saying there
          are three.
        */}
        {!open && (
          <PMText fontSize="xs" color="faded" truncate minW={0}>
            {rows.map((row) => row.name).join(' · ')}
          </PMText>
        )}
        <PMIconButton
          aria-label={`${open ? 'Hide' : 'Show'} the destinations that are up to date`}
          aria-expanded={open}
          variant="ghost"
          size="2xs"
          color="text.faded"
          marginLeft="auto"
          flexShrink={0}
          onClick={() => setOpen((previous) => !previous)}
        >
          {open ? <LuChevronDown /> : <LuChevronRight />}
        </PMIconButton>
      </PMHStack>
      {open &&
        rows.map((row) => <DestinationRow key={row.key} destination={row} />)}
    </>
  );
}

function DestinationRow({
  destination,
  onUpdate,
}: Readonly<{
  destination: PackageDestination;
  onUpdate?: (destination: PackageDestination) => void;
}>) {
  return (
    <PMHStack
      gap={3}
      align="center"
      paddingX={3}
      paddingY={2}
      borderTopWidth="1px"
      borderColor="border.tertiary"
      _hover={{ bg: 'background.secondary' }}
      transition="background-color 150ms ease-out"
    >
      <PMIcon fontSize="sm" color="text.faded" flexShrink={0}>
        {destination.kind === 'repository' ? <LuFolderGit2 /> : <LuStore />}
      </PMIcon>
      <PMBox flex={1} minW={0}>
        <PMHStack gap={2} align="baseline" minW={0}>
          <PMText fontSize="sm" fontWeight="medium" truncate>
            {destination.name}
          </PMText>
          {destination.details.length > 0 && (
            <PMText fontSize="xs" color="faded" truncate flexShrink={0}>
              {destination.details.join(' · ')}
            </PMText>
          )}
        </PMHStack>
        <StateLine destination={destination} />
      </PMBox>
      <RowAction destination={destination} onUpdate={onUpdate} />
    </PMHStack>
  );
}

/** The colour of each state, in one place, so a dot and a band agree. */
const STATE_TONE: Record<PackageDestinationState, string> = {
  failed: 'red.300',
  waiting: 'blue.300',
  behind: 'orange.500',
  aligned: 'green.500',
};

function StateLine({
  destination,
}: Readonly<{ destination: PackageDestination }>) {
  return (
    <PMHStack gap={2} align="center" minW={0}>
      <PMBox
        width="6px"
        height="6px"
        borderRadius="full"
        bg={STATE_TONE[destination.state]}
        flexShrink={0}
        aria-hidden
      />
      <PMText fontSize="xs" color="faded" truncate>
        {stateSentence(destination)}
      </PMText>
    </PMHStack>
  );
}

/**
 * What a row says about itself.
 *
 * The behind case names the components rather than counting them. The count
 * alone was what the pane showed before, and it sent every reader who cared
 * into an expansion to learn what "4 components behind" was made of; two names
 * and a remainder answer that on the row, and the remainder is honest about
 * being one.
 */
function stateSentence(destination: PackageDestination): string {
  if (destination.state === 'failed') {
    return destination.kind === 'repository'
      ? 'The last distribution failed'
      : 'The last publish failed';
  }

  if (destination.state === 'waiting') {
    return destination.kind === 'repository'
      ? 'Distributing now'
      : 'Published to the sync pull request, live once it is merged';
  }

  if (destination.state === 'behind') {
    if (destination.behindCount === 0) {
      /*
       * A marketplace, where the drift says the copy was overtaken and not by
       * what. Saying "0 components behind" would be a number where there is
       * none.
       */
      return 'The published copy is behind this package';
    }
    return `${destination.behindCount} component${
      destination.behindCount === 1 ? '' : 's'
    } behind: ${behindNames(destination)}`;
  }

  return destination.kind === 'repository' ? 'Up to date' : 'Published';
}

/** Two names and the size of what is left, which is how a row stays a row. */
function behindNames(destination: PackageDestination): string {
  const shown = destination.behindArtifacts
    .slice(0, 2)
    .map(
      (entry) => `${entry.artifact.name} v${entry.artifact.packmindVersion}`,
    );
  const hidden = destination.behindArtifacts.length - shown.length;
  return hidden > 0 ? `${shown.join(', ')}, +${hidden}` : shown.join(', ');
}

function RowAction({
  destination,
  onUpdate,
}: Readonly<{
  destination: PackageDestination;
  onUpdate?: (destination: PackageDestination) => void;
}>): ReactNode {
  /*
   * The pull request first, whatever else the row could offer. A publication
   * waiting on a merge has had its work done, and the one useful thing left is
   * the page where someone can finish it.
   */
  if (destination.state === 'waiting' && destination.prUrl) {
    return (
      <PMLink
        href={destination.prUrl}
        target="_blank"
        rel="noopener noreferrer"
        fontSize="xs"
        flexShrink={0}
      >
        Review the pull request
      </PMLink>
    );
  }

  if (
    !onUpdate ||
    destination.installKey === null ||
    destination.state !== 'behind'
  ) {
    return null;
  }

  return (
    <PMButton
      variant="tertiary"
      size="xs"
      flexShrink={0}
      onClick={() => onUpdate(destination)}
    >
      Update
    </PMButton>
  );
}
