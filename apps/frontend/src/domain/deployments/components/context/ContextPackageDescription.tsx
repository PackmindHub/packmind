import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PMBox,
  PMCloseButton,
  PMDrawer,
  PMHeading,
  PMLink,
  PMMarkdownViewer,
  PMPortal,
} from '@packmind/ui';

import { packageDescriptionPreview } from './packageDescriptionPreview';

/** Two lines of prose, which is what a package description usually is. */
const PREVIEW_LINES = 2;

/**
 * A package's description under its name: an opening in the header, the whole
 * of it a click away.
 *
 * The header cannot shrink. It carries the package name, the controls and the
 * tabs, and the component list scrolls underneath it, so an unbounded
 * description does not overflow — it pushes. A long one drove the tabs to the
 * bottom of the pane and the components off it entirely, leaving the reader on
 * a package whose contents were unreachable.
 *
 * Expanding it in place is what the header cannot offer either. The field is
 * markdown, and a description with headings, code and tables is a document; a
 * document given a few centimetres between a heading and a row of tabs is
 * worse to read than one left closed. So the whole of it opens in the panel
 * this pane already uses for everything that needs room.
 *
 * The header previews rather than renders, for the same reason. Two lines of a
 * document are usually its title, and rendered it lands as a second heading
 * under the package name, at a size that argues with it.
 */
export function ContextPackageDescription({
  packageName,
  description,
}: Readonly<{ packageName: string; description: string }>) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [truncated, setTruncated] = useState(false);
  const [reading, setReading] = useState(false);

  const preview = useMemo(
    () => packageDescriptionPreview(description),
    [description],
  );

  useEffect(() => {
    const node = previewRef.current;
    if (!node) return;

    const measure = () => {
      setTruncated(node.scrollHeight > node.clientHeight + 1);
    };
    measure();

    // The pane is resizable and the preview reflows with it, so whether two
    // lines are enough is not decided once.
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [preview]);

  /*
   * A description whose words all fit is fully on screen, and there is nothing
   * behind a link that says otherwise. One that lost formatting on the way into
   * the preview has something to show even when the prose fits, so the link
   * stands on either condition.
   *
   * Compared against the description with its whitespace collapsed, not against
   * the description: a paragraph written over two lines renders as one, so the
   * newline the preview dropped is not something the panel would give back.
   */
  const hasMore =
    truncated || preview !== description.replace(/\s+/g, ' ').trim();

  return (
    <PMBox color="secondary" paddingTop={1}>
      {/*
        A box rather than PMText: the preview has to be measured, and PMText
        does not forward its ref.
      */}
      <PMBox
        ref={previewRef}
        as="p"
        fontSize="sm"
        lineClamp={PREVIEW_LINES}
        wordBreak="break-word"
      >
        {preview}
      </PMBox>

      {hasMore && (
        <PMLink
          as="button"
          type="button"
          variant="underline"
          fontSize="xs"
          cursor="pointer"
          marginTop={2}
          onClick={() => setReading(true)}
        >
          Read description
        </PMLink>
      )}

      {/*
        The panel the pane already opens for adding components, moving one and
        editing these very fields. This is where the markdown is markdown: the
        package's own page has always rendered the field, and the header showed
        the asterisks until the dialog beside this heading made writing one from
        here the normal way.
      */}
      <PMDrawer.Root
        open={reading}
        onOpenChange={(details) => setReading(details.open)}
        placement="end"
        size="lg"
      >
        <PMPortal>
          <PMDrawer.Backdrop />
          <PMDrawer.Positioner>
            <PMDrawer.Content>
              <PMDrawer.Header>
                <PMHeading size="md">{packageName}</PMHeading>
              </PMDrawer.Header>
              <PMDrawer.Body padding={5}>
                <PMBox color="primary" maxWidth="72ch">
                  <PMMarkdownViewer content={description} />
                </PMBox>
              </PMDrawer.Body>
              <PMDrawer.CloseTrigger asChild>
                <PMCloseButton size="sm" />
              </PMDrawer.CloseTrigger>
            </PMDrawer.Content>
          </PMDrawer.Positioner>
        </PMPortal>
      </PMDrawer.Root>
    </PMBox>
  );
}
