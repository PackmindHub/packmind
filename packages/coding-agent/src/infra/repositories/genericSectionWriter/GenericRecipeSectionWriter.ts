import { GenericSectionWriter } from './GenericSectionWriter';

export type GenericRecipeSectionWriterOpts = {
  agentName: string;
  repoName: string;
  target: string;
  recipesSection: string;
};

export class GenericRecipeSectionWriter extends GenericSectionWriter<GenericRecipeSectionWriterOpts> {
  private static instance = new GenericRecipeSectionWriter();

  protected generateSectionContent(
    opts: GenericRecipeSectionWriterOpts,
  ): string {
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

## Recipe Usage Tracking:
When you DO use or apply a relevant Packmind recipe from .packmind/recipes/, you MUST call the 'packmind_notify_recipe_usage' MCP tool with:
* Recipe slugs array (e.g., ["recipe-name"] from "recipe-name.md")
* aiAgent: "${opts.agentName}"
* gitRepo: "${opts.repoName}"
* target: "${opts.target}"

**Remember: Always check the recipes list first, but only use recipes that actually apply to your specific task.**\``);

    content.push('## Available recipes');

    content.push(opts.recipesSection);
    return content.join('\n\n');
  }

  // Static methods for backward compatibility
  public static generateRecipesSection(
    opts: GenericRecipeSectionWriterOpts,
  ): string {
    return GenericRecipeSectionWriter.instance.generateSectionContent(opts);
  }

  public static replace(
    opts: GenericRecipeSectionWriterOpts & {
      currentContent: string;
      commentMarker: string;
    },
  ): string {
    return GenericRecipeSectionWriter.instance.replace(opts);
  }
}
