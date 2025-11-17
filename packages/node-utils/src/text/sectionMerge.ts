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
