export type GenericRecipeSectionWriterOpts = {
  agentName: string;
  repoName: string;
} & (
  | {
      recipesSection: string;
      recipesIndexPath?: never;
    }
  | {
      recipesIndexPath: string;
      recipesSection?: never;
    }
);

export class GenericRecipeSectionWriter {
  public static generateRecipesSection(
    opts: GenericRecipeSectionWriterOpts,
  ): string {
    const content: string[] = [
      `🚨 **MANDATORY STEP** 🚨

      Before writing, editing, or generating ANY code:`,
    ];

    if (opts.recipesSection) {
      content.push(
        '**ALWAYS READ**: the available recipes below to see what recipes are available',
      );
    } else {
      content.push(
        `**ALWAYS READ**: ${opts.recipesIndexPath} to see what recipes are available`,
      );
    }

    content.push(`## Recipe Usage Rules:
- **MANDATORY**: Always check the recipes list first
- **CONDITIONAL**: Only read/use individual recipes if they are relevant to your task
- **OPTIONAL**: If no recipes are relevant, proceed without using any

## Recipe Usage Tracking:
When you DO use or apply a relevant Packmind recipe from .packmind/recipes/, you MUST call the 'packmind_notify_recipe_usage' MCP tool with:
* Recipe slugs array (e.g., ["recipe-name"] from "recipe-name.md")
* aiAgent: "${opts.agentName}"
* gitRepo: "${opts.repoName}"

**Remember: Always check the recipes list first, but only use recipes that actually apply to your specific task.**\``);

    if (opts.recipesSection) {
      content.push(opts.recipesSection);
    }

    return content.join('\n\n');
  }

  public static replace(
    opts: GenericRecipeSectionWriterOpts & { currentContent: string },
  ) {
    return `Writing ${opts.currentContent} with: ${GenericRecipeSectionWriter.generateRecipesSection(opts)}`;
  }
}
