import type { ReactNode } from 'react';
import { PMBox, PMIcon, PMText } from '@packmind/ui';

/**
 * The two rails index different things, but a row is a row: a name, the match
 * that put it there, and a line of counts under it. Shared rather than copied
 * so the two lists cannot drift into two typographies for the same idea.
 */

/**
 * The mark that stands beside a name carrying a second line under it.
 *
 * It belongs to the name, not to the block. Centred on the pair it sank into the
 * gap between the two lines, drifting further down as the meta line grew, and
 * read as a bullet for the row rather than as the type of the thing named. It
 * sits on the label's line instead: the line box is one and a half times its
 * font size and an icon rendered at that size is exactly one em tall, so a
 * quarter of an em from the top of the flex line lands it on the label.
 *
 * `alignSelf` rather than a container rule, because the rows that use it also
 * carry versions, dates and dots that stay centred on the whole row. Rows with a
 * single line are unaffected: the offset resolves to where centring already put
 * it.
 */
export function RowIcon({
  children,
  fontSize = 'sm',
  color = 'text.faded',
}: Readonly<{ children: ReactNode; fontSize?: string; color?: string }>) {
  return (
    <PMIcon
      fontSize={fontSize}
      color={color}
      flexShrink={0}
      alignSelf="flex-start"
      marginTop="0.25em"
    >
      {children}
    </PMIcon>
  );
}

/**
 * Anything that is not text but belongs to the name rather than to the block:
 * a box one line tall, so its contents centre on the label the way RowIcon does
 * at the other end of the row. 1.5em of the name's own size, not a pixel count,
 * so it follows the type scale rather than tracking it by hand.
 */
function RowMark({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <PMBox
      alignSelf="flex-start"
      flexShrink={0}
      fontSize="sm"
      height="1.5em"
      display="flex"
      alignItems="center"
    >
      {children}
    </PMBox>
  );
}

/**
 * The health of a row, as one 6px mark at a fixed distance from the right edge.
 * It carries no number, so it costs the name nothing, and its position never
 * moves: an eye run down a rail gets the state of eighteen rows without reading
 * a word. The count travels on the label instead, where a pointer and a screen
 * reader can both reach it and neither the name nor the meta line pays for it.
 *
 * `clear` is what to do when there is nothing wrong. The destination rail is
 * sorted by health, so it states the good case too and the column is never
 * empty. The plugin rail is not: a green dot on six plugins out of eight would
 * answer a question that rail is not asked, so there the mark appears only where
 * it is the point.
 */
export function HealthDot({
  behind,
  failed,
  clear = 'show',
}: Readonly<{ behind: number; failed: number; clear?: 'show' | 'hide' }>) {
  if (behind === 0 && clear === 'hide') return null;

  const label =
    behind === 0
      ? 'Up to date'
      : failed > 0
        ? `${behind} behind, ${failed} failed`
        : `${behind} behind`;

  return (
    <RowMark>
      <PMBox
        width="6px"
        height="6px"
        borderRadius="full"
        bg={behind === 0 ? 'green.500' : failed > 0 ? 'red.500' : 'orange.500'}
        aria-label={label}
        title={label}
        role="img"
      />
    </RowMark>
  );
}

/**
 * `N behind` for the head of a meta line, red as soon as any of it failed
 * rather than merely drifted.
 *
 * The unit is the distribution — one plugin landing in one place — which is what
 * lets both rails say the same word: from a plugin it counts the places it is
 * behind in, from a destination the plugins that are behind there. The two
 * numbers are read off the same edges from opposite ends.
 *
 * A value rather than a component, because MetaLine decides whether a separator
 * follows it and an element that renders nothing is still an element.
 */
export function behindLead(behind: number, failed: number): ReactNode {
  if (behind === 0) return undefined;

  return (
    <PMText
      as="span"
      fontSize="xs"
      color={failed > 0 ? 'error' : 'warning'}
      fontVariantNumeric="tabular-nums"
    >
      {behind} behind
    </PMText>
  );
}

/** The matched fragment, so a row never has to be taken on faith. */
export function Highlight({
  text,
  needle,
}: Readonly<{ text: string; needle: string }>) {
  if (!needle) return <>{text}</>;
  const index = text.toLowerCase().indexOf(needle);
  if (index < 0) return <>{text}</>;

  return (
    <>
      {text.slice(0, index)}
      <PMBox as="span" color="text.primary" fontWeight="semibold">
        {text.slice(index, index + needle.length)}
      </PMBox>
      {text.slice(index + needle.length)}
    </>
  );
}

/**
 * One text node rather than a row of boxes, so the line ends in an ellipsis
 * instead of being cut mid-word by the rail. The parts carry no styling of
 * their own, which is what makes joining them lossless.
 *
 * `lead` is the exception, and it comes first for a reason: it is the only
 * part worth colouring, and putting it at the head of the line means the
 * qualifiers are what falls off the end when the rail runs out of room.
 */
export function MetaLine({
  parts,
  lead,
}: Readonly<{ parts: Array<string | false>; lead?: ReactNode }>) {
  const shown = parts.filter((part): part is string => Boolean(part));
  if (shown.length === 0 && !lead) return null;
  const joined = shown.join(' · ');

  return (
    <PMBox
      as="div"
      paddingTop="3px"
      color="text.faded"
      fontSize="xs"
      truncate
      title={joined}
    >
      {lead}
      {lead && joined ? ' · ' : null}
      {joined}
    </PMBox>
  );
}
