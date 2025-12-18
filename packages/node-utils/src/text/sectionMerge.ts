import { FileSection } from '@packmind/types';

/**
 * Merges sections into an existing file content by finding HTML comment markers
 * and replacing the content between them, or appending if not found.
 *
 * @param existingContent The current file content (empty string if file doesn't exist)
 * @param sections Array of sections with key and content to merge
 * @returns The merged file content
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

    // If content is empty, remove the entire section (markers included)
    if (section.content.trim() === '') {
      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        const before = result.substring(0, startIndex);
        const after = result.substring(endIndex + endMarker.length);
        // Remove section and clean up extra newlines
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
      // If section doesn't exist and content is empty, do nothing
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
