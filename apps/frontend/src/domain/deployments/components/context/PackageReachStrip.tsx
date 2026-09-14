import {
  PMBox,
  PMHStack,
  PMIcon,
  PMLink,
  PMMenu,
  PMPortal,
  PMText,
} from '@packmind/ui';
import { LuChevronDown, LuX } from 'react-icons/lu';
import {
  STATE_TONE,
  packageDestinationSummary,
  worstState,
  type PackageDestination,
} from './buildPackageDestinations';

/**
 * How far this package reaches, as one line above its components.
 *
 * The two tabs each hold half of what a reader wants and neither says so: the
 * components say what exists, the destinations say where it stands, and the
 * join happened in the reader's head. This is the smallest honest version of
 * that join, and it is deliberately a sentence rather than a panel.
 *
 * The design this comes from put the destinations in a column beside the
 * components, and then dropped that column in its own adaptation to a larger
 * package, replacing it with exactly this line. A column that cannot survive
 * the scale it was drawn for is not the load-bearing part; the line is, and it
 * reads the same at five destinations and at a thousand.
 *
 * It has two readings and always says which one it is in its first word. Left
 * alone it states the reach. Pointed at a destination it states that
 * destination, and the list below it changes with it: the rows stop counting
 * across everywhere and start saying what is wrong there. One sentence either
 * way, one line from the list it describes, so the mode is never something the
 * reader has to remember.
 */
export function PackageReachStrip({
  destinations,
  isLoading,
  against,
  onAgainst,
  behindHere,
  onOpenDistribution,
}: Readonly<{
  destinations: readonly PackageDestination[];
  /**
   * Either half of the answer is still coming.
   *
   * Held rather than counted around, because the number would be wrong and
   * then move: a package published to a marketplace and installed nowhere
   * reads as reaching nothing until the publications land.
   */
  isLoading: boolean;
  /** The destination the list is being read against, or null for all of them. */
  against: PackageDestination | null;
  onAgainst: (installKey: string | null) => void;
  /** How many components are behind on that destination. */
  behindHere: number;
  onOpenDistribution: () => void;
}>) {
  const summary = packageDestinationSummary(destinations);
  /*
   * Only landings can be read against. A marketplace copy knows it has been
   * overtaken and not by which components, so picking one would put every row
   * of the list in the same state of "no idea": an option that cannot answer
   * the question it is offered for is worse than no option.
   */
  const readable = destinations.filter(
    (destination) => destination.installKey !== null,
  );

  return (
    <PMHStack
      justify="space-between"
      align="center"
      gap={3}
      paddingX={3}
      paddingY={2}
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="sm"
      bg="background.secondary"
    >
      <PMHStack gap={2} align="center" minW={0}>
        {isLoading ? (
          <PMText fontSize="xs" color="faded">
            Counting destinations…
          </PMText>
        ) : against ? (
          <AgainstSentence
            destination={against}
            behindHere={behindHere}
            onClear={() => onAgainst(null)}
          />
        ) : summary.all === 0 ? (
          /*
            Said rather than left blank. A package that stands nowhere is a
            state worth naming on the surface where its components are edited:
            what is written here reaches no agent yet.
          */
          <PMText fontSize="xs" color="faded">
            Not distributed anywhere yet.
          </PMText>
        ) : (
          <>
            <PMText fontSize="xs" color="secondary">
              Reaches {summary.all} destination{summary.all === 1 ? '' : 's'}
            </PMText>
            {summary.needsAHand === 0 ? (
              <PMText fontSize="xs" color="faded">
                · all up to date
              </PMText>
            ) : (
              <PMHStack gap={2} align="center">
                {/*
                  Coloured by the worst of them, not by the fact that something
                  is wrong: one mark standing for eleven has to show the one the
                  reader would open first, and a failure under an orange dot
                  reads as ordinary drift.
                */}
                <PMBox
                  width="6px"
                  height="6px"
                  borderRadius="full"
                  bg={STATE_TONE[worstState(destinations)]}
                  flexShrink={0}
                  aria-hidden
                />
                {/*
                  Counted, unless the count is all of them. "11 destinations,
                  11 need a hand" makes a reader check whether the same number
                  twice is a mistake; the whole is a word, not a number.
                */}
                <PMText fontSize="xs" color="secondary">
                  {summary.needsAHand === summary.all
                    ? 'none up to date'
                    : `${summary.needsAHand} need${summary.needsAHand === 1 ? 's' : ''} a hand`}
                </PMText>
              </PMHStack>
            )}
          </>
        )}
      </PMHStack>
      <PMHStack gap={3} align="center" flexShrink={0}>
        {readable.length > 0 && (
          <AgainstPicker
            destinations={readable}
            activeKey={against?.installKey ?? null}
            onPick={onAgainst}
          />
        )}
        <PMLink as="button" fontSize="xs" onClick={onOpenDistribution}>
          Distribution
        </PMLink>
      </PMHStack>
    </PMHStack>
  );
}

/**
 * The line while one destination is being read against.
 *
 * Names the landing in full, branch and target included, because two rows of
 * the picker differ by nothing else: a package installed at the root and under
 * `apps/api` of one repository is two destinations, and a sentence that said
 * only the repository would be true of both.
 */
function AgainstSentence({
  destination,
  behindHere,
  onClear,
}: Readonly<{
  destination: PackageDestination;
  behindHere: number;
  onClear: () => void;
}>) {
  return (
    <PMHStack gap={2} align="center" minW={0}>
      <PMText fontSize="xs" color="faded" flexShrink={0}>
        Against
      </PMText>
      <PMText fontSize="xs" color="secondary" truncate>
        {[destination.name, ...destination.details].join(' · ')}
      </PMText>
      <PMHStack gap={2} align="center" flexShrink={0}>
        <PMBox
          width="6px"
          height="6px"
          borderRadius="full"
          bg={STATE_TONE[destination.state]}
          flexShrink={0}
          aria-hidden
        />
        {/*
          Zero is a sentence here, not an absence. Pointed at a destination and
          told nothing, a reader cannot tell "everything has arrived" from "the
          filter did not take".
        */}
        <PMText fontSize="xs" color="secondary" whiteSpace="nowrap">
          {behindHere === 0
            ? 'everything has arrived'
            : `${behindHere} component${behindHere === 1 ? '' : 's'} behind here`}
        </PMText>
      </PMHStack>
      <PMBox
        as="button"
        onClick={onClear}
        display="inline-flex"
        alignItems="center"
        color="text.faded"
        cursor="pointer"
        flexShrink={0}
        aria-label="Read against every destination again"
      >
        <PMIcon fontSize="xs">
          <LuX />
        </PMIcon>
      </PMBox>
    </PMHStack>
  );
}

/**
 * Which landing to read the list against.
 *
 * In the order the destination list uses, worst first, so the one a reader came
 * to debug is near the top rather than wherever its name falls in the alphabet.
 * That order is already decided by `buildPackageDestinations`, and this only
 * has to not disturb it.
 */
function AgainstPicker({
  destinations,
  activeKey,
  onPick,
}: Readonly<{
  destinations: readonly PackageDestination[];
  activeKey: string | null;
  onPick: (installKey: string | null) => void;
}>) {
  return (
    <PMMenu.Root>
      <PMMenu.Trigger asChild>
        <PMBox
          as="button"
          display="inline-flex"
          alignItems="center"
          gap="4px"
          fontSize="xs"
          color="text.secondary"
          cursor="pointer"
        >
          {/*
            Named once. While the line already says which destination it is
            reading against, a control repeating "Against a destination" beside
            it reads as a second, unset filter.
          */}
          {activeKey === null ? 'Against a destination' : 'Change'}
          <PMIcon fontSize="xs">
            <LuChevronDown />
          </PMIcon>
        </PMBox>
      </PMMenu.Trigger>
      <PMPortal>
        <PMMenu.Positioner>
          <PMMenu.Content maxHeight="320px" overflowY="auto">
            {activeKey !== null && (
              <PMMenu.Item value="all" onClick={() => onPick(null)}>
                Every destination
              </PMMenu.Item>
            )}
            {destinations.map((destination) => (
              <PMMenu.Item
                key={destination.key}
                value={destination.key}
                onClick={() => onPick(destination.installKey)}
              >
                <PMHStack gap={2} align="center">
                  <PMBox
                    width="6px"
                    height="6px"
                    borderRadius="full"
                    bg={STATE_TONE[destination.state]}
                    flexShrink={0}
                    aria-hidden
                  />
                  <PMText fontSize="xs">
                    {[destination.name, ...destination.details].join(' · ')}
                  </PMText>
                </PMHStack>
              </PMMenu.Item>
            ))}
          </PMMenu.Content>
        </PMMenu.Positioner>
      </PMPortal>
    </PMMenu.Root>
  );
}
