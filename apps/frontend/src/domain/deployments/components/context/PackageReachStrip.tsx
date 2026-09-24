import { PMBox, PMHStack, PMLink, PMText } from '@packmind/ui';
import {
  STATE_TONE,
  oldestStaleReport,
  packageDestinationSummary,
  reportDay,
  reportInstant,
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
 * No counts of its own. It states what the Distribution tab would state, in the
 * words that tab uses, and hands the reader over to it.
 */
export function PackageReachStrip({
  destinations,
  isLoading,
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
  onOpenDistribution: () => void;
}>) {
  const summary = packageDestinationSummary(destinations);
  /*
   * The oldest of them, not the newest and not an average. The line stands for
   * the whole set, and a set is only as current as the destination nobody has
   * heard from in longest.
   */
  const oldestReport = oldestStaleReport(destinations);

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
              /*
                Copy and no mark. The same rule the rows carry, that an aligned
                claim older than a fortnight has to say how old it is, but this
                line has no dot to fade: the one below only renders when
                something needs a hand, and by then the age is the smaller of
                the two things wrong.
              */
              <PMText
                fontSize="xs"
                color="faded"
                title={
                  oldestReport
                    ? `Oldest report ${reportInstant(oldestReport)}`
                    : undefined
                }
              >
                {oldestReport
                  ? `· all up to date, oldest report ${reportDay(oldestReport)}`
                  : '· all up to date'}
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
      <PMLink as="button" fontSize="xs" onClick={onOpenDistribution}>
        Distribution
      </PMLink>
    </PMHStack>
  );
}
