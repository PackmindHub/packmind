import { RecipeVersion } from '@packmind/recipes';
import { GitRepo, GitHexa } from '@packmind/git';
import { StandardVersion } from '@packmind/standards';
import { FileUpdates } from '../../../domain/entities/FileUpdates';
import { ICodingAgentDeployer } from '../../../domain/repository/ICodingAgentDeployer';
import { PackmindLogger } from '@packmind/shared';
import { GenericRecipeSectionWriter } from '../genericRecipe/GenericRecipeSectionWriter';

const origin = 'AgentsMDDeployer';

export class AgentsMDDeployer implements ICodingAgentDeployer {
  private static readonly AGENTS_MD_PATH = 'AGENTS.md';
  private readonly logger: PackmindLogger;

  constructor(private readonly gitHexa?: GitHexa) {
    this.logger = new PackmindLogger(origin);
  }

  async deployRecipes(
    recipeVersions: RecipeVersion[],
    gitRepo: GitRepo,
  ): Promise<FileUpdates> {
    this.logger.info('Deploying recipes for AGENTS.md', {
      recipesCount: recipeVersions.length,
      gitRepoId: gitRepo.id,
    });

    // Get existing AGENTS.md content
    const existingContent = await this.getExistingContent(gitRepo);

    // Generate content with recipe instructions
    const updatedContent = await this.generateRecipeContent(
      recipeVersions,
      gitRepo,
      existingContent,
    );

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Only create file if content was updated
    if (updatedContent !== existingContent) {
      fileUpdates.createOrUpdate.push({
        path: AgentsMDDeployer.AGENTS_MD_PATH,
        content: updatedContent,
      });
    }

    return fileUpdates;
  }

  async deployStandards(
    standardVersions: StandardVersion[],
    gitRepo: GitRepo,
  ): Promise<FileUpdates> {
    this.logger.info('Deploying standards for AGENTS.md', {
      standardsCount: standardVersions.length,
      gitRepoId: gitRepo.id,
    });

    // Get existing AGENTS.md content
    const existingContent = await this.getExistingContent(gitRepo);

    // Generate content with standards instructions
    const updatedContent = await this.generateStandardsContent(
      standardVersions,
      gitRepo,
      existingContent,
    );

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Only create file if content was updated
    if (updatedContent !== existingContent) {
      fileUpdates.createOrUpdate.push({
        path: AgentsMDDeployer.AGENTS_MD_PATH,
        content: updatedContent,
      });
    }

    return fileUpdates;
  }

  /**
   * Get existing content from AGENTS.md file
   */
  private async getExistingContent(gitRepo: GitRepo): Promise<string> {
    if (!this.gitHexa) {
      this.logger.debug('No GitHexa available, returning empty content');
      return '';
    }

    try {
      const existingFile = await this.gitHexa.getFileFromRepo(
        gitRepo,
        AgentsMDDeployer.AGENTS_MD_PATH,
      );
      return existingFile?.content || '';
    } catch (error) {
      this.logger.debug('Failed to get existing AGENTS.md content', {
        error: error instanceof Error ? error.message : String(error),
      });
      return '';
    }
  }

  /**
   * Generate content with recipe instructions, checking existing content
   */
  private async generateRecipeContent(
    recipeVersions: RecipeVersion[],
    gitRepo: GitRepo,
    existingContent: string,
  ): Promise<string> {
    const repoName = `${gitRepo.owner}/${gitRepo.repo}`;

    const packmindInstructions =
      GenericRecipeSectionWriter.generateRecipesSection({
        agentName: 'AGENTS.md',
        repoName,
        recipesIndexPath: '@.packmind/recipes-index.md',
      });

    // Check if recipe instructions are already present
    const hasRecipeInstructions =
      this.checkForRecipeInstructions(existingContent);

    if (hasRecipeInstructions) {
      this.logger.debug(
        'Recipe instructions already present in AGENTS.md content',
      );
      return existingContent;
    }

    // Add recipe instructions
    return this.addRecipeInstructions(existingContent, packmindInstructions);
  }

  /**
   * Generate content with standards instructions, checking existing content
   */
  private async generateStandardsContent(
    standardVersions: StandardVersion[],
    gitRepo: GitRepo,
    existingContent: string,
  ): Promise<string> {
    const standardsInstructions = `Follow the coding standards defined in @.packmind/standards-index.md`;

    // Check if standards instructions are already present
    const hasStandardsInstructions =
      this.checkForStandardsInstructions(existingContent);

    if (hasStandardsInstructions) {
      this.logger.debug(
        'Standards instructions already present in AGENTS.md content',
      );
      return existingContent;
    }

    // Add standards instructions
    return this.addStandardsInstructions(
      existingContent,
      standardsInstructions,
    );
  }

  /**
   * Check if recipe instructions are already present
   */
  private checkForRecipeInstructions(existingContent: string): boolean {
    const requiredHeader = '# Packmind Recipes';
    const requiredInstructionPhrase = '🚨 **MANDATORY STEP** 🚨';
    const requiredFileReference = 'recipes-index.md';

    const headerRegex = new RegExp(`^${requiredHeader}\\s*$`, 'm');
    const hasExactHeader = headerRegex.test(existingContent);
    const hasInstructions = existingContent.includes(requiredInstructionPhrase);
    const hasFileReference = existingContent
      .toLowerCase()
      .includes(requiredFileReference.toLowerCase());

    return hasExactHeader && hasInstructions && hasFileReference;
  }

  /**
   * Check if standards instructions are already present
   */
  private checkForStandardsInstructions(existingContent: string): boolean {
    const requiredHeader = '## Packmind Standards';
    const requiredInstructionPhrase = 'Follow the coding standards defined in';
    const requiredFileReference = 'standards-index.md';

    const headerRegex = new RegExp(`^${requiredHeader}\\s*$`, 'm');
    const hasExactHeader = headerRegex.test(existingContent);
    const hasInstructions = existingContent.includes(requiredInstructionPhrase);
    const hasFileReference = existingContent
      .toLowerCase()
      .includes(requiredFileReference.toLowerCase());

    return hasExactHeader && hasInstructions && hasFileReference;
  }

  /**
   * Add recipe instructions to existing content
   */
  private addRecipeInstructions(
    existingContent: string,
    instructions: string,
  ): string {
    const instructionsBlock = `# Packmind Recipes

${instructions}`;

    if (!existingContent.trim()) {
      return instructionsBlock;
    }

    // Always append at the end, preserving existing content
    const separator = existingContent.endsWith('\n') ? '\n' : '\n\n';
    return `${existingContent}${separator}${instructionsBlock}`;
  }

  /**
   * Add standards instructions to existing content
   */
  private addStandardsInstructions(
    existingContent: string,
    instructions: string,
  ): string {
    const instructionsBlock = `## Packmind Standards

${instructions}`;

    if (!existingContent.trim()) {
      return instructionsBlock;
    }

    // Always append at the end, preserving existing content
    const separator = existingContent.endsWith('\n') ? '\n' : '\n\n';
    return `${existingContent}${separator}${instructionsBlock}`;
  }
}
