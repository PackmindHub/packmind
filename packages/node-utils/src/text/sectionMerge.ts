import { FileSection } from '@packmind/types';

/**
 * Rewrites the text between `<!-- start: key -->` and `<!-- end: key -->`,
 * appending the whole block when those markers are absent. Anything outside a
 * section is left untouched, which is what lets a hand-edited agent file keep
 * its own content across deployments.
 *
 * A section whose content is blank is removed markers and all, so an artefact
 * that no longer applies leaves no empty block behind.
 */
export function mergeSectionsIntoFileContent(
  existingContent: string,
  sections: FileSection[],
): string {
  let result = existingContent;

  for (const section of sections) {
    const startMarker = `<!-- start: ${section.key} -->`;
    const endMarker = `<!-- end: ${section.key} -->`;

    const startIndex = result.indexOf(startMarker);
    const endIndex = result.indexOf(endMarker);

    if (section.content.trim() === '') {
      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        const before = result.substring(0, startIndex);
        const after = result.substring(endIndex + endMarker.length);
        // The four branches below exist to avoid leaving a blank line, or a
        // trailing newline on an otherwise empty file, where the block was.
        const trimmedBefore = before.trimEnd();
        const trimmedAfter = after.trimStart();

        if (trimmedBefore === '' && trimmedAfter === '') {
          result = '';
        } else if (trimmedBefore === '') {
          result = trimmedAfter;
        } else if (trimmedAfter === '') {
          result = trimmedBefore + '\n';
        } else {
          result = trimmedBefore + '\n' + trimmedAfter;
        }
      }
      continue;
    }

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      const before = result.substring(0, startIndex + startMarker.length);
      const after = result.substring(endIndex);

      result = `${before}\n${section.content}\n${after}`;
    } else {
      const sectionBlock = `${startMarker}\n${section.content}\n${endMarker}`;

      if (result.trim() === '') {
        result = sectionBlock;
      } else {
        result = result.endsWith('\n')
          ? `${result}${sectionBlock}\n`
          : `${result}\n${sectionBlock}\n`;
      }
    }
  }

  return result;
}
