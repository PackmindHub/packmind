import { GenericSectionWriter } from './GenericSectionWriter';

export type GenericCommandSectionWriterOpts = {
  recipesSection: string;
};

export class GenericCommandSectionWriter extends GenericSectionWriter<GenericCommandSectionWriterOpts> {
  private static instance = new GenericCommandSectionWriter();

  protected generateSectionContent(
    opts: GenericCommandSectionWriterOpts,
  ): string {
    if (opts.recipesSection.trim() === '') {
      return '';
    }

    const content: string[] = [
      `# Packmind Recipes

🚨 **MANDATORY STEP** 🚨

Before writing, editing, or generating ANY code:`,
    ];

    content.push(
      '**ALWAYS READ**: the available recipes below to see what recipes are available',
    );

    content.push(`## Recipe Usage Rules:
- **MANDATORY**: Always check the recipes list first
- **CONDITIONAL**: Only read/use individual recipes if they are relevant to your task
- **OPTIONAL**: If no recipes are relevant, proceed without using any

**Remember: Always check the recipes list first, but only use recipes that actually apply to your specific task.**\``);

    content.push('## Available recipes');

    content.push(opts.recipesSection);
    return content.join('\n\n');
  }

  // Static methods for backward compatibility
  public static generateCommandsSection(
    opts: GenericCommandSectionWriterOpts,
  ): string {
    return GenericCommandSectionWriter.instance.generateSectionContent(opts);
  }

  public static replace(
    opts: GenericCommandSectionWriterOpts & {
      currentContent: string;
      commentMarker: string;
    },
  ): string {
    return GenericCommandSectionWriter.instance.replace(opts);
  }
}
