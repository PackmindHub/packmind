import type { ReactNode } from 'react';
import { PMBox } from '@packmind/ui';

/**
 * A checkbox that is only there when it is wanted: under the pointer, under the
 * keyboard, or once a selection has started.
 *
 * A hundred rows is a hundred empty boxes down the left edge, and reading a list
 * is what these lists are for nine times out of ten; picking things out of one
 * is the tenth. The destinations rail settled this for the surface already and
 * this is the same behaviour, with the focus case added: a checkbox at zero
 * opacity still takes the keyboard, so without `_focusWithin` tabbing into a
 * list would move an invisible focus ring down an empty column.
 *
 * Faded rather than unmounted, which is what keeps the column steady. A row that
 * renders its checkbox only on hover shifts its name sideways under the pointer,
 * and the eye is running down that name.
 *
 * Its own file the day the second list picked this way, for the reason
 * `ContextSearchField` has one: the behaviour is a handful of style props that
 * have to agree with a `className="group"` several levels up, and two copies
 * of that agreement drift apart quietly, one list revealing on hover and the
 * other not.
 */
export function ContextPickBox({
  shown,
  children,
}: Readonly<{
  /** Already picked, or a selection is under way, so it stays out. */
  shown: boolean;
  children: ReactNode;
}>) {
  return (
    /*
      It takes the column it stands in, not the 16px box drawn in the middle of
      it. A checkbox that size in a 44px row is a target the pointer misses,
      and the miss lands on a column that does nothing with it: the box reads
      as broken and the name beside it becomes the only way to pick the row.

      The label is what turns a click into a tick — a click anywhere on it is a
      click on the box it is for — so the label claims the column rather than a
      second handler being hung beside it, which would fight the one the label
      already sends. The box keeps the place the gutter gave it, at the end of
      the column.
    */
    <PMBox
      display="flex"
      alignSelf="stretch"
      width="full"
      opacity={shown ? 1 : 0}
      transition="opacity 100ms ease-out"
      _groupHover={{ opacity: 1 }}
      _focusWithin={{ opacity: 1 }}
      css={{ '& > label': { width: '100%', justifyContent: 'flex-end' } }}
    >
      {children}
    </PMBox>
  );
}
