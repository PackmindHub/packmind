export type ReplaceOpts = {
  currentContent: string;
  commentMarker: string;
};

export abstract class GenericSectionWriter<T extends object> {
  /**
   * Abstract method that each subclass must implement to generate their specific section content
   */
  protected abstract generateSectionContent(opts: T): string;

  /**
   * Common replace functionality for all section writers
   */
  public replace(opts: T & ReplaceOpts): string {
    const startMarker = `<!-- start: ${opts.commentMarker} -->`;
    const endMarker = `<!-- end: ${opts.commentMarker} -->`;

    // Generate the new content using the abstract method
    const newContent = this.generateSectionContent(opts);

    // Create the regex pattern to find the existing section
    const escapedStartMarker = startMarker.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&',
    );
    const escapedEndMarker = endMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sectionPattern = new RegExp(
      `${escapedStartMarker}[\\s\\S]*?${escapedEndMarker}`,
      'g',
    );

    // Check if the section exists
    if (sectionPattern.test(opts.currentContent)) {
      // Replace existing section
      return opts.currentContent.replace(
        sectionPattern,
        `${startMarker}\n${newContent}\n${endMarker}`,
      );
    } else {
      // Append new section
      return `${opts.currentContent}\n${startMarker}\n${newContent}\n${endMarker}`;
    }
  }
}
