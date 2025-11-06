import { RecipeVersion } from '@packmind/recipes';
import { GitRepo } from '@packmind/git';
import { StandardVersion } from '@packmind/standards';
import { FileUpdates, IStandardsPort } from '@packmind/types';
import { ICodingAgentDeployer } from '../../../domain/repository/ICodingAgentDeployer';
import { RecipesIndexService } from '../../../application/services/RecipesIndexService';
import { StandardsIndexService } from '../../../application/services/StandardsIndexService';
import { PackmindLogger } from '@packmind/logger';
import { Target } from '@packmind/types';
import { getTargetPrefixedPath } from '../utils/FileUtils';
import { GenericStandardWriter } from '../genericSectionWriter/GenericStandardWriter';

const origin = 'PackmindDeployer';

export class PackmindDeployer implements ICodingAgentDeployer {
  private static readonly RECIPES_INDEX_PATH = '.packmind/recipes-index.md';
  private readonly recipesIndexService: RecipesIndexService;
  private readonly standardsIndexService: StandardsIndexService;
  private readonly logger: PackmindLogger;

  constructor(private readonly standardsPort?: IStandardsPort) {
    this.recipesIndexService = new RecipesIndexService();
    this.standardsIndexService = new StandardsIndexService();
    this.logger = new PackmindLogger(origin);
  }

  async deployRecipes(
    recipeVersions: RecipeVersion[],
    _gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info('Deploying recipes for Packmind', {
      recipesCount: recipeVersions.length,
      targetId: target.id,
      targetPath: target.path,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Deploy each recipe to its own file
    for (const recipeVersion of recipeVersions) {
      const recipeFilePath = `.packmind/recipes/${recipeVersion.slug}.md`;
      const targetPrefixedPath = getTargetPrefixedPath(recipeFilePath, target);
      fileUpdates.createOrUpdate.push({
        path: targetPrefixedPath,
        content: recipeVersion.content,
      });
    }

    // Generate and deploy the recipes index
    const recipesIndexContent =
      this.recipesIndexService.buildRecipesIndex(recipeVersions);

    const indexTargetPrefixedPath = getTargetPrefixedPath(
      PackmindDeployer.RECIPES_INDEX_PATH,
      target,
    );
    fileUpdates.createOrUpdate.push({
      path: indexTargetPrefixedPath,
      content: recipesIndexContent,
    });

    return fileUpdates;
  }

  async deployStandards(
    standardVersions: StandardVersion[],
    _gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info('Deploying standards for Packmind', {
      standardsCount: standardVersions.length,
      targetId: target.id,
      targetPath: target.path,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Deploy each standard to its own file
    for (const standardVersion of standardVersions) {
      const rules =
        standardVersion.rules ??
        (await this.standardsPort?.getRulesByStandardId(
          standardVersion.standardId,
        )) ??
        [];

      const standardFilePath = `.packmind/standards/${standardVersion.slug}.md`;
      const targetPrefixedPath = getTargetPrefixedPath(
        standardFilePath,
        target,
      );
      fileUpdates.createOrUpdate.push({
        path: targetPrefixedPath,
        content: GenericStandardWriter.writeStandard(standardVersion, rules),
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

    const indexTargetPrefixedPath = getTargetPrefixedPath(
      '.packmind/standards-index.md',
      target,
    );
    fileUpdates.createOrUpdate.push({
      path: indexTargetPrefixedPath,
      content: standardsIndexContent,
    });

    return fileUpdates;
  }

  async generateFileUpdatesForRecipes(
    recipeVersions: RecipeVersion[],
  ): Promise<FileUpdates> {
    this.logger.info('Generating file updates for recipes (Packmind)', {
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

  async generateFileUpdatesForStandards(
    standardVersions: StandardVersion[],
  ): Promise<FileUpdates> {
    this.logger.info('Generating file updates for standards (Packmind)', {
      standardsCount: standardVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Deploy each standard to its own file
    for (const standardVersion of standardVersions) {
      const rules =
        standardVersion.rules ??
        (await this.standardsPort?.getRulesByStandardId(
          standardVersion.standardId,
        )) ??
        [];

      const standardFilePath = `.packmind/standards/${standardVersion.slug}.md`;
      fileUpdates.createOrUpdate.push({
        path: standardFilePath,
        content: GenericStandardWriter.writeStandard(standardVersion, rules),
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
