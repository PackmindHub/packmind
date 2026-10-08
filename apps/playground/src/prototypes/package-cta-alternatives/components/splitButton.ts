/**
 * Two buttons drawn as one object: a wide half stating the act and a chevron
 * half holding the other ways of performing it. Copied from the production
 * helper rather than imported, so the prototype stays inside the playground.
 *
 * The seam is the focus ring's own width, which is what lets a focused half
 * draw its ring without it landing inside the neighbour.
 */
export const SPLIT_BUTTON_SEAM = '2px';

export function splitButtonHalf(side: 'leading' | 'trailing') {
  return side === 'leading'
    ? ({ borderEndRadius: 0, outlineOffset: 0 } as const)
    : ({ borderStartRadius: 0, outlineOffset: 0 } as const);
}
