import { PMBox, PMHStack, PMText } from '@packmind/ui';

/**
 * The one marker an component carries. It renders only when a change proposal is
 * pending, so a healthy list shows nothing and the eye catches only the rows
 * that need someone. A status printed on every row cannot be scanned.
 *
 * Nothing about repositories or plugins appears here: distribution is a
 * property of the plugin, not of what it contains.
 *
 * The dot is redundant with the word on purpose, so the marker survives a
 * monochrome screen and a colour-blind reader. Blue is the same signal as the
 * Review changes badge in the sidebar: one information, two places, one colour.
 */
export function ComponentReviewMarker({
  pendingReview,
}: Readonly<{ pendingReview?: boolean }>) {
  if (!pendingReview) return null;

  return (
    <PMHStack gap="6px" align="center">
      <PMBox
        width="6px"
        height="6px"
        borderRadius="full"
        bg="blue.300"
        flexShrink={0}
        aria-hidden
      />
      <PMText fontSize="xs" color="secondary" whiteSpace="nowrap">
        To review
      </PMText>
    </PMHStack>
  );
}
