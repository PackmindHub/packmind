import React from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { PMHeader } from '../../layout';

export interface IPMFullBleedPageProps {
  breadcrumbComponent?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * A page whose content is the whole content area: no title, no subtitle, no
 * page padding, and exactly the height the shell hands it.
 *
 * A component of its own rather than another boolean on `PMPage`, because what
 * is left once the header, the reading width, the sidebar slot and the page
 * padding are all switched off is not a configuration of that page, it is a
 * different one. `PMPage` already carries `isFullWidth` and
 * `isContentFullHeight`; a third flag would describe eight combinations of
 * which one is meant.
 *
 * For surfaces that are their own layout: a rail beside a pane, a canvas, an
 * editor. They state where the reader is through their own content and through
 * the navigation that got them here, so a heading above them repeats what the
 * sidebar already says and costs the vertical space the surface was asking for.
 * A page whose job is to introduce its content wants `PMPage` instead.
 *
 * The child is handed a column flex item with `minHeight: 0`, so it can claim
 * the height with `height="100%"` and scroll inside itself. Nothing here
 * scrolls: a full-bleed surface that also scrolls as a page gives the reader
 * two scrolling regions stacked on the same gesture.
 */
export const PMFullBleedPage: React.FC<IPMFullBleedPageProps> = ({
  breadcrumbComponent,
  children,
}) => (
  <Flex direction="column" height="100%" maxHeight="100%" overflow="hidden">
    {breadcrumbComponent && (
      <Box flexShrink={0}>
        <PMHeader color="secondary">{breadcrumbComponent}</PMHeader>
      </Box>
    )}
    <Box flex="1" minHeight={0} display="flex" flexDirection="column">
      {children}
    </Box>
  </Flex>
);
