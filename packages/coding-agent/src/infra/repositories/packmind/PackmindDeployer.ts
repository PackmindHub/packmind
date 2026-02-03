import { PackmindLogger } from '@packmind/logger';
import {
  DeleteItemType,
  FileUpdates,
  GitRepo,
  IStandardsPort,
  RecipeVersion,
  SkillVersion,
  StandardVersion,
  Target,
} from '@packmind/types';
import { ICodingAgentDeployer } from '../../../domain/repository/ICodingAgentDeployer';
import { CommandsIndexService } from '../../../application/services/CommandsIndexService';
import { StandardsIndexService } from '../../../application/services/StandardsIndexService';
import { getTargetPrefixedPath } from '../utils/FileUtils';
import { GenericStandardWriter } from '../genericSectionWriter/GenericStandardWriter';

const origin = 'PackmindDeployer';

export class PackmindDeployer implements ICodingAgentDeployer {
  private static readonly COMMANDS_INDEX_PATH = '.packmind/commands-index.md';
  private static readonly LEGACY_RECIPES_INDEX_PATH =
    '.packmind/recipes-index.md';
  private readonly commandsIndexService: CommandsIndexService;
  private readonly standardsIndexService: StandardsIndexService;

  constructor(
    private readonly standardsPort?: IStandardsPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.commandsIndexService = new CommandsIndexService();
    this.standardsIndexService = new StandardsIndexService();
  }

  async deployRecipes(
    recipeVersions: RecipeVersion[],
    _gitRepo: GitRepo,
    target: Target,
  ): Promise<FileUpdates> {
    this.logger.info('Deploying commands for Packmind', {
      commandsCount: recipeVersions.length,
      targetId: target.id,
      targetPath: target.path,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Deploy each command to its own file
    for (const recipeVersion of recipeVersions) {
      const commandFilePath = `.packmind/commands/${recipeVersion.slug}.md`;
      const targetPrefixedPath = getTargetPrefixedPath(commandFilePath, target);
      fileUpdates.createOrUpdate.push({
        path: targetPrefixedPath,
        content: recipeVersion.content,
      });
    }

    // Generate and deploy the commands index
    const commandsIndexContent =
      this.commandsIndexService.buildCommandsIndex(recipeVersions);

    const indexTargetPrefixedPath = getTargetPrefixedPath(
      PackmindDeployer.COMMANDS_INDEX_PATH,
      target,
    );
    fileUpdates.createOrUpdate.push({
      path: indexTargetPrefixedPath,
      content: commandsIndexContent,
    });

    // Delete legacy recipes-index.md file
    const legacyIndexPath = getTargetPrefixedPath(
      PackmindDeployer.LEGACY_RECIPES_INDEX_PATH,
      target,
    );
    fileUpdates.delete.push({
      path: legacyIndexPath,
      type: DeleteItemType.File,
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
    this.logger.info('Generating file updates for commands (Packmind)', {
      commandsCount: recipeVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Deploy each command to its own file
    for (const recipeVersion of recipeVersions) {
      const commandFilePath = `.packmind/commands/${recipeVersion.slug}.md`;
      fileUpdates.createOrUpdate.push({
        path: commandFilePath,
        content: recipeVersion.content,
      });
    }

    // Generate and deploy the commands index
    const commandsIndexContent =
      this.commandsIndexService.buildCommandsIndex(recipeVersions);

    fileUpdates.createOrUpdate.push({
      path: PackmindDeployer.COMMANDS_INDEX_PATH,
      content: commandsIndexContent,
    });

    // Delete legacy recipes-index.md file
    fileUpdates.delete.push({
      path: PackmindDeployer.LEGACY_RECIPES_INDEX_PATH,
      type: DeleteItemType.File,
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

  async deploySkills(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    skillVersions: SkillVersion[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    gitRepo: GitRepo,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    target: Target,
  ): Promise<FileUpdates> {
    // Skills not supported for Packmind deployer yet
    return { createOrUpdate: [], delete: [] };
  }

  async generateFileUpdatesForSkills(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    skillVersions: SkillVersion[],
  ): Promise<FileUpdates> {
    // Skills not supported for Packmind deployer yet
    return { createOrUpdate: [], delete: [] };
  }

  async deployArtifacts(
    recipeVersions: RecipeVersion[],
    standardVersions: StandardVersion[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    skillVersions: SkillVersion[] = [],
  ): Promise<FileUpdates> {
    this.logger.info(
      'Deploying artifacts (commands + standards + skills) for Packmind',
      {
        commandsCount: recipeVersions.length,
        standardsCount: standardVersions.length,
        skillsCount: skillVersions.length,
      },
    );

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Deploy each command to its own file
    for (const recipeVersion of recipeVersions) {
      const commandFilePath = `.packmind/commands/${recipeVersion.slug}.md`;
      fileUpdates.createOrUpdate.push({
        path: commandFilePath,
        content: recipeVersion.content,
      });
    }

    // Generate and deploy the commands index only if there are commands
    if (recipeVersions.length > 0) {
      const commandsIndexContent =
        this.commandsIndexService.buildCommandsIndex(recipeVersions);
      fileUpdates.createOrUpdate.push({
        path: PackmindDeployer.COMMANDS_INDEX_PATH,
        content: commandsIndexContent,
      });

      // Delete legacy recipes-index.md file
      fileUpdates.delete.push({
        path: PackmindDeployer.LEGACY_RECIPES_INDEX_PATH,
        type: DeleteItemType.File,
      });
    }

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

    // Generate and deploy the standards index only if there are standards
    if (standardVersions.length > 0) {
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
    }

    return fileUpdates;
  }

  async generateRemovalFileUpdates(
    removed: {
      recipeVersions: RecipeVersion[];
      standardVersions: StandardVersion[];
      skillVersions: SkillVersion[];
    },
    installed: {
      recipeVersions: RecipeVersion[];
      standardVersions: StandardVersion[];
      skillVersions: SkillVersion[];
    },
  ): Promise<FileUpdates> {
    this.logger.info('Generating removal file updates for Packmind', {
      removedCommandsCount: removed.recipeVersions.length,
      removedStandardsCount: removed.standardVersions.length,
      removedSkillsCount: removed.skillVersions.length,
      installedCommandsCount: installed.recipeVersions.length,
      installedStandardsCount: installed.standardVersions.length,
      installedSkillsCount: installed.skillVersions.length,
    });

    const fileUpdates: FileUpdates = {
      createOrUpdate: [],
      delete: [],
    };

    // Delete individual command files for removed commands
    for (const recipeVersion of removed.recipeVersions) {
      fileUpdates.delete.push({
        path: `.packmind/commands/${recipeVersion.slug}.md`,
        type: DeleteItemType.File,
      });
    }

    // Delete commands index if no commands remain installed
    if (installed.recipeVersions.length === 0) {
      fileUpdates.delete.push({
        path: PackmindDeployer.COMMANDS_INDEX_PATH,
        type: DeleteItemType.File,
      });
    }

    // Delete individual standard files for removed standards
    for (const standardVersion of removed.standardVersions) {
      fileUpdates.delete.push({
        path: `.packmind/standards/${standardVersion.slug}.md`,
        type: DeleteItemType.File,
      });
    }

    // Delete standards index if no standards remain installed
    if (installed.standardVersions.length === 0) {
      fileUpdates.delete.push({
        path: '.packmind/standards-index.md',
        type: DeleteItemType.File,
      });
    }

    // Delete parent folders if all Packmind content is removed and something was actually removed
    const hasRemovedArtifacts =
      removed.recipeVersions.length > 0 || removed.standardVersions.length > 0;
    if (
      hasRemovedArtifacts &&
      installed.recipeVersions.length === 0 &&
      installed.standardVersions.length === 0
    ) {
      fileUpdates.delete.push({
        path: '.packmind/commands/',
        type: DeleteItemType.Directory,
      });
      fileUpdates.delete.push({
        path: '.packmind/standards/',
        type: DeleteItemType.Directory,
      });
      fileUpdates.delete.push({
        path: '.packmind/',
        type: DeleteItemType.Directory,
      });
    }

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

  getSkillsFolderPath(): undefined {
    // Skills not supported for Packmind deployer yet
    return undefined;
  }
}
