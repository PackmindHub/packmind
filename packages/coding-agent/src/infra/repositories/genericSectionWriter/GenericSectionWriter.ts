export type ReplaceOpts = {
  currentContent: string;
  commentMarker: string;
};

export abstract class GenericSectionWriter<T extends object> {
  protected abstract generateSectionContent(opts: T): string;

  public replace(opts: T & ReplaceOpts): string {
    const startMarker = `<!-- start: ${opts.commentMarker} -->`;
    const endMarker = `<!-- end: ${opts.commentMarker} -->`;

    const newContent = this.generateSectionContent(opts);

    // Empty content means the section is dropped, markers included.
    if (newContent.trim() === '') {
      const escapedStartMarker = startMarker.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
      );
      const escapedEndMarker = endMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const sectionPattern = new RegExp(
        `${escapedStartMarker}[\\s\\S]*?${escapedEndMarker}\\n?`,
        'g',
      );

      if (sectionPattern.test(opts.currentContent)) {
        return opts.currentContent.replace(sectionPattern, '');
      }
      return opts.currentContent;
    }

    const escapedStartMarker = startMarker.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&',
    );
    const escapedEndMarker = endMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sectionPattern = new RegExp(
      `${escapedStartMarker}[\\s\\S]*?${escapedEndMarker}`,
      'g',
    );

    if (sectionPattern.test(opts.currentContent)) {
      return opts.currentContent.replace(
        sectionPattern,
        `${startMarker}\n${newContent}\n${endMarker}`,
      );
    } else {
      return `${opts.currentContent}\n${startMarker}\n${newContent}\n${endMarker}`;
    }
  }
}
