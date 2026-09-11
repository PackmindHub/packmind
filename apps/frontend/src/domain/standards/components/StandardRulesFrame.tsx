import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { PMBox, PMHeading, PMIcon } from '@packmind/ui';
import { LuChevronLeft } from 'react-icons/lu';

/**
 * The frame a standard's rules pages wear for a reader whose navigation shows
 * standards in the Context pane.
 *
 * Those pages wear `StandardDetails`' page header in the current navigation,
 * where it is correct: it is the only header that reader has seen. Reached from
 * the pane it is the second copy of a header they just left, naming the same
 * standard, offering the same `Edit` and `Delete`, printing the same version and
 * last update, and putting an `Overview | Distribution` strip beside the pane's
 * own three tabs. The same surprise the `Open standard` button was, one level
 * down, and the reason it is not enough to have deleted that button.
 *
 * So this keeps the one thing the pane does not have, the rules and their
 * detection setup, and nothing else. Everything it drops is one back link away.
 *
 * That back link is the pane's, at the depth below it: same chevron, same
 * measure, same two colours, and it names its destination rather than saying
 * "Back". Reading one surface should not feel like two, and a reader who went
 * one level deeper should be able to see that is what happened.
 *
 * In the standards domain rather than in a shared folder because the rules
 * pages are the only pages a reader is sent out to. A second one moves this up
 * instead of copying it.
 */
export function StandardRulesFrame({
  backLabel,
  backHref,
  title,
  titleIsSentence = false,
  children,
}: Readonly<{
  /** Where the link goes, named. The standard from the rules, the rules from a rule. */
  backLabel: string;
  backHref: string;
  /** What this page is, which is never the standard's name: that is the back link. */
  title: string;
  /**
   * Whether that title is a sentence rather than a name, which a rule's is.
   *
   * It decides the size and nothing else. A rule reads as a rule at the size
   * prose is set in; at heading size it is three lines of shouting before the
   * page starts, which is what the reader sees first now that a row in the pane
   * opens a rule directly instead of a list of them.
   */
  titleIsSentence?: boolean;
  children: ReactNode;
}>) {
  return (
    /*
     * The measure and the scroll `PMPage` would have given, kept by hand because
     * what is dropped here is its header and there is no way to drop only that.
     */
    <PMBox height="100%" overflowY="auto">
      <PMBox maxWidth="1200px" marginX="auto" paddingX={6} paddingY={6}>
        <PMBox
          display="inline-flex"
          alignItems="center"
          gap="4px"
          fontSize="sm"
          color="text.faded"
          _hover={{ color: 'text.primary' }}
          transition="color 150ms ease-out"
          asChild
        >
          <Link to={backHref}>
            <PMIcon fontSize="sm">
              <LuChevronLeft />
            </PMIcon>
            {backLabel}
          </Link>
        </PMBox>

        {/*
          Capped at the same measure the pane's own title is. A rule's title is
          the rule, which is a sentence and not a name, and a sentence set to the
          full width of a 1200px page is read twice.

          `h2` either way. The size changes, the level does not: this is the
          heading of the page in both cases, and a document whose only heading is
          an `h3` is a document with a hole in it.
        */}
        <PMBox paddingTop={2} maxWidth="68ch">
          <PMHeading level="h2" fontSize={titleIsSentence ? 'lg' : undefined}>
            {title}
          </PMHeading>
        </PMBox>

        <PMBox paddingTop={6}>{children}</PMBox>
      </PMBox>
    </PMBox>
  );
}
