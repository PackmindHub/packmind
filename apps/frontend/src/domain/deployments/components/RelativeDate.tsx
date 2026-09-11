import { PMBox, PMTooltip } from '@packmind/ui';
import { formatRelativeDate } from './redesign/selectors/installDriftEntries';

/**
 * The instant in full, in the format the app prints dates in: short month, the
 * year, and the time to the minute.
 *
 * Written here rather than taken from `shared/utils/dateUtils`, which is one
 * of the files the two editions do not share: this repo exports
 * `formatDateTime` from it and the Open Source one exports a `formatDate` that
 * does the same thing under the other name. Importing either would have made
 * this component unbuildable in one of the two repos, which is what happened.
 */
function absoluteDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * A date as the distance a reader thinks in, with the date itself one hover
 * away.
 *
 * "3 months ago" is the right answer to "is this still current" and the wrong
 * one to "which version was that". Every date on this surface answered the
 * first question and none of them could answer the second, which is what was
 * reported: the relative form is the one to read at a glance, so it stays, and
 * the absolute one arrives on demand instead of taking its place.
 *
 * A span rather than the bare string the callers used to interpolate, because
 * a tooltip needs an element to hang on. It carries no colour or size of its
 * own so it keeps the ones of the text it sits in.
 */
export function RelativeDate({
  iso,
  testId,
}: Readonly<{
  iso: string;
  /** What the hover is addressed by in tests, when a caller needs one. */
  testId?: string;
}>) {
  /*
   * An unparseable date keeps the behaviour `formatRelativeDate` already has,
   * which is to print what it was given. A tooltip there would say "Invalid
   * date" over a string that is already visibly not one.
   */
  if (Number.isNaN(new Date(iso).getTime())) return iso;

  return (
    <PMTooltip label={absoluteDate(iso)} showArrow>
      <PMBox as="span" data-testid={testId}>
        {formatRelativeDate(iso)}
      </PMBox>
    </PMTooltip>
  );
}
