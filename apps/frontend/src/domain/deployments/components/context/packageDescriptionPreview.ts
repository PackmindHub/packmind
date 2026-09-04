/**
 * A package description reduced to the sentence it opens with.
 *
 * The pane's header previews the description; the panel behind "Read
 * description" renders it. The two need different things from the same field.
 * Rendered in the header, a description that opens with `## How this is used`
 * puts a second heading under the package name, at a size that competes with
 * it — and a table or a fenced block in a two-line box is a broken layout, not
 * a preview. Printed raw it shows its own asterisks, which is what the header
 * used to do.
 *
 * So the header gets prose. Not a faithful rendering of the markdown: the
 * words, in reading order, with everything that carries formatting taken out.
 */
export function packageDescriptionPreview(description: string): string {
  return (
    description
      .replace(/\r\n/g, '\n')
      // Fenced code is not prose, and its first line is usually an import.
      .replace(/```[\s\S]*?(?:```|$)/g, ' ')
      .replace(/~~~[\s\S]*?(?:~~~|$)/g, ' ')
      // A table reads as a run of cell values once its pipes are gone, which
      // says less than nothing in two lines.
      .replace(/^\s*\|.*$/gm, ' ')
      // Setext underlines and horizontal rules: punctuation standing in for a
      // line break.
      .replace(/^\s*([-=*_])\1{2,}\s*$/gm, ' ')
      .replace(/<[^>]*>/g, ' ')
      // Images carry no words worth previewing; links carry theirs.
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      // Leading markers: heading hashes, quote carets, list bullets, ordinals.
      .replace(/^\s{0,3}#{1,6}\s+/gm, '')
      .replace(/^\s*>+\s?/gm, '')
      .replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, '')
      // Emphasis and inline code, which are marks on words rather than words.
      .replace(/(\*\*|__|~~)/g, '')
      .replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s).,;:!?]|$)/g, '$1$2')
      .replace(/`+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  );
}
