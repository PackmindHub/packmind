import { PMBox, PMTooltip } from '@packmind/ui';
import { formatDateTime } from '../../../shared/utils/dateUtils';
import { formatRelativeDate } from './redesign/selectors/installDriftEntries';

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
    <PMTooltip label={formatDateTime(iso)} showArrow>
      <PMBox as="span" data-testid={testId}>
        {formatRelativeDate(iso)}
      </PMBox>
    </PMTooltip>
  );
}
