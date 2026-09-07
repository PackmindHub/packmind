/**
 * The two halves of a split button, and the seam between them.
 *
 * A split button is two real buttons drawn as one object: a wide half stating
 * the act, and a chevron half holding the other ways of performing it. The
 * package header builds two of them, and their halves live in three files, so
 * the few properties that make two buttons read as one are stated here rather
 * than once per half.
 */

/**
 * How far a focused button's ring reaches, in pixels. Not this module's choice:
 * it is what the design system's button draws, read off the rendered control.
 *
 * Named because the seam below is measured against it. A number that has to
 * match something else is a number worth stating once.
 */
const FOCUS_RING_WIDTH = 2;

/**
 * The gap between the halves, and the reason it is not smaller.
 *
 * It was one pixel, which is all the object-ness needs: a hairline of the page
 * showing between two fills of the same colour. But the ring of a focused half
 * had nowhere to go. Drawn two pixels wide at a two pixel offset, it reached
 * four pixels past the button's edge, crossed the one pixel of page and landed
 * three pixels inside the neighbour, over its rounded corner. What the reader
 * saw was a stray outline cutting through the control beside the one they had
 * just used, which is what was reported.
 *
 * The ring's own width, so with the ring hugging its button rather than floating
 * off it, the two exactly meet: the ring fills the seam and stops at the
 * neighbour's edge. On a thirty six pixel control the seam is still a hairline,
 * and the halves still read as one object.
 */
export const SPLIT_BUTTON_SEAM = `${FOCUS_RING_WIDTH}px`;

/**
 * What a button needs in order to be one half of a split button: the joined
 * edge squared, and the focus ring pulled in against its own edge.
 *
 * The offset is right for a button with space around it and wrong for one glued
 * to a neighbour. At zero the ring reaches exactly as far as the seam allows,
 * so it stays legible on the three sides that have the page behind them, and
 * touches rather than covers on the fourth.
 *
 * Insetting it was the other candidate, and it fails on the loud half: the ring
 * is one grey whatever the button's variant, and inside a filled primary button
 * that grey has no contrast left to work with. Measured, it came to 1.6:1
 * against the fill, so a keyboard reader would have lost the indicator
 * altogether on the control that matters most.
 *
 * `side` is which half of the object this button is, reading in the direction
 * the page reads, which is why the radii it squares are logical ones.
 */
export function splitButtonHalf(side: 'leading' | 'trailing') {
  return side === 'leading'
    ? ({ borderEndRadius: 0, outlineOffset: 0 } as const)
    : ({ borderStartRadius: 0, outlineOffset: 0 } as const);
}
