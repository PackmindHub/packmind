import { RecipeVersion } from '@packmind/recipes';
import { GitRepo } from '@packmind/git';
import { StandardVersion, StandardsHexa } from '@packmind/standards';
import { FileUpdates } from '../../../domain/entities/FileUpdates';
import { ICodingAgentDeployer } from '../../../domain/repository/ICodingAgentDeployer';
import { RecipesIndexService } from '../../../application/services/RecipesIndexService';
import { StandardsIndexService } from '../../../application/services/StandardsIndexService';
import { PackmindLogger } from '@packmind/shared';

const origin = 'PackmindDeployer';

export class PackmindDeployer implements ICodingAgentDeployer {
  private static readonly RECIPES_INDEX_PATH = '.packmind/recipes-index.md';
  private readonly recipesIndexService: RecipesIndexService;
  private readonly standardsIndexService: StandardsIndexService;
  private readonly logger: PackmindLogger;

  constructor(private readonly standardsHexa?: StandardsHexa) {
    this.recipesIndexService = new RecipesIndexService();
    this.standardsIndexService = new StandardsIndexService();
    this.logger = new PackmindLogger(origin);
  }

  async deployRecipes(
    recipeVersions: RecipeVersion[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _gitRepo: GitRepo,
  ): Promise<FileUpdates> {
    this.logger.info('Deploying recipes for Packmind', {
      recipesCount: recipeVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Deploy each recipe to its own file
    for (const recipeVersion of recipeVersions) {
      const recipeFilePath = `.packmind/recipes/${recipeVersion.slug}.md`;
      fileUpdates.createOrUpdate.push({
        path: recipeFilePath,
        content: recipeVersion.content,
      });
    }

    // Generate and deploy the recipes index
    const recipesIndexContent =
      this.recipesIndexService.buildRecipesIndex(recipeVersions);

    fileUpdates.createOrUpdate.push({
      path: PackmindDeployer.RECIPES_INDEX_PATH,
      content: recipesIndexContent,
    });

    return fileUpdates;
  }

  async deployStandards(
    standardVersions: StandardVersion[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _gitRepo: GitRepo,
  ): Promise<FileUpdates> {
    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Deploy each standard to its own file
    for (const standardVersion of standardVersions) {
      // Fetch rules if not provided
      let versionWithRules = standardVersion;
      if (!standardVersion.rules && this.standardsHexa) {
        const rules = await this.standardsHexa.getRulesByStandardId(
          standardVersion.standardId,
        );
        versionWithRules = { ...standardVersion, rules };
      }

      const standardFilePath = `.packmind/standards/${standardVersion.slug}.md`;
      fileUpdates.createOrUpdate.push({
        path: standardFilePath,
        content: this.formatStandardVersionContent(versionWithRules),
      });
    }

    // Generate and deploy the standards index
    const standardsIndexContent =
      this.standardsIndexService.buildStandardsIndex(
        standardVersions.map((standardVersion) => ({
          name: standardVersion.name,
          slug: standardVersion.slug,
          summary: standardVersion.summary,
        })),
      );

    fileUpdates.createOrUpdate.push({
      path: '.packmind/standards-index.md',
      content: standardsIndexContent,
    });

    return fileUpdates;
  }

  private formatStandardVersionContent(
    standardVersion: StandardVersion,
  ): string {
    const header = `# ${standardVersion.name}

${standardVersion.description}

## Rules
`;

    // Format rules if they exist
    const rulesContent = standardVersion.rules
      ? standardVersion.rules.map((rule) => `* ${rule.content}`).join('\n')
      : '';

    const footer = `

---

*This standard was automatically generated from version ${standardVersion.version}.*`;

    return header + rulesContent + footer;
  }
}
