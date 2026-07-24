import { PackmindLogger } from '@packmind/logger';
import {
  CODING_AGENT_ARTEFACT_PATHS,
  DeleteItemType,
  FileUpdates,
  GitRepo,
  IStandardsPort,
  CommandVersion,
  SkillVersion,
  StandardVersion,
  Target,
} from '@packmind/types';
import { ICodingAgentDeployer } from '../../../domain/repository/ICodingAgentDeployer';
import { StandardsIndexService } from './StandardsIndexService';
import { getTargetPrefixedPath } from '../utils/FileUtils';
import { GenericStandardWriter } from '../genericSectionWriter/GenericStandardWriter';

const origin = 'PackmindDeployer';

export class PackmindDeployer implements ICodingAgentDeployer {
  private static readonly ARTEFACT_PATHS = CODING_AGENT_ARTEFACT_PATHS.packmind;
  // Legacy index files that are no longer generated but must be cleaned up
  // from repositories where a previous version wrote them.
  private static readonly LEGACY_COMMANDS_INDEX_PATH =
    '.packmind/commands-index.md';
  private static readonly LEGACY_RECIPES_INDEX_PATH =
    '.packmind/recipes-index.md';
  private readonly standardsIndexService: StandardsIndexService;

  constructor(
    private readonly standardsPort?: IStandardsPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.standardsIndexService = new StandardsIndexService();
  }

  async deployCommands(
    recipeVersions: CommandVersion[],
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
      const commandFilePath = `${PackmindDeployer.ARTEFACT_PATHS.command}${recipeVersion.slug}.md`;
      const targetPrefixedPath = getTargetPrefixedPath(commandFilePath, target);
      fileUpdates.createOrUpdate.push({
        path: targetPrefixedPath,
        content: recipeVersion.content,
        artifactType: 'command',
        artifactName: recipeVersion.name,
        artifactId: recipeVersion.recipeId as string,
      });
    }

    // Clean up legacy index files that are no longer generated
    fileUpdates.delete.push({
      path: getTargetPrefixedPath(
        PackmindDeployer.LEGACY_COMMANDS_INDEX_PATH,
        target,
      ),
      type: DeleteItemType.File,
    });
    fileUpdates.delete.push({
      path: getTargetPrefixedPath(
        PackmindDeployer.LEGACY_RECIPES_INDEX_PATH,
        target,
      ),
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

      const standardFilePath = `${PackmindDeployer.ARTEFACT_PATHS.standard}${standardVersion.slug}.md`;
      const targetPrefixedPath = getTargetPrefixedPath(
        standardFilePath,
        target,
      );
      fileUpdates.createOrUpdate.push({
        path: targetPrefixedPath,
        content: GenericStandardWriter.writeStandard(standardVersion, rules),
        artifactType: 'standard',
        artifactName: standardVersion.name,
        artifactId: standardVersion.standardId as string,
      });
    }

    // Generate and deploy the standards index
    const standardsIndexContent =
      this.standardsIndexService.buildStandardsIndex(
        standardVersions.map((standardVersion) => ({
          name: standardVersion.name,
          slug: standardVersion.slug,
          description: standardVersion.description,
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

  async generateFileUpdatesForCommands(
    recipeVersions: CommandVersion[],
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
      const commandFilePath = `${PackmindDeployer.ARTEFACT_PATHS.command}${recipeVersion.slug}.md`;
      fileUpdates.createOrUpdate.push({
        path: commandFilePath,
        content: recipeVersion.content,
        artifactType: 'command',
        artifactName: recipeVersion.name,
        artifactId: recipeVersion.recipeId as string,
      });
    }

    // Clean up legacy index files that are no longer generated
    fileUpdates.delete.push({
      path: PackmindDeployer.LEGACY_COMMANDS_INDEX_PATH,
      type: DeleteItemType.File,
    });
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

      const standardFilePath = `${PackmindDeployer.ARTEFACT_PATHS.standard}${standardVersion.slug}.md`;
      fileUpdates.createOrUpdate.push({
        path: standardFilePath,
        content: GenericStandardWriter.writeStandard(standardVersion, rules),
        artifactType: 'standard',
        artifactName: standardVersion.name,
        artifactId: standardVersion.standardId as string,
      });
    }

    // Generate and deploy the standards index
    const standardsIndexContent =
      this.standardsIndexService.buildStandardsIndex(
        standardVersions.map((standardVersion) => ({
          name: standardVersion.name,
          slug: standardVersion.slug,
          description: standardVersion.description,
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
    recipeVersions: CommandVersion[],
    standardVersions: StandardVersion[],
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
      const commandFilePath = `${PackmindDeployer.ARTEFACT_PATHS.command}${recipeVersion.slug}.md`;
      fileUpdates.createOrUpdate.push({
        path: commandFilePath,
        content: recipeVersion.content,
        artifactType: 'command',
        artifactName: recipeVersion.name,
        artifactId: recipeVersion.recipeId as string,
      });
    }

    // Clean up legacy index files that are no longer generated
    if (recipeVersions.length > 0) {
      fileUpdates.delete.push({
        path: PackmindDeployer.LEGACY_COMMANDS_INDEX_PATH,
        type: DeleteItemType.File,
      });
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

      const standardFilePath = `${PackmindDeployer.ARTEFACT_PATHS.standard}${standardVersion.slug}.md`;
      fileUpdates.createOrUpdate.push({
        path: standardFilePath,
        content: GenericStandardWriter.writeStandard(standardVersion, rules),
        artifactType: 'standard',
        artifactName: standardVersion.name,
        artifactId: standardVersion.standardId as string,
      });
    }

    // Generate and deploy the standards index only if there are standards
    if (standardVersions.length > 0) {
      const standardsIndexContent =
        this.standardsIndexService.buildStandardsIndex(
          standardVersions.map((standardVersion) => ({
            name: standardVersion.name,
            slug: standardVersion.slug,
            description: standardVersion.description,
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
      recipeVersions: CommandVersion[];
      standardVersions: StandardVersion[];
      skillVersions: SkillVersion[];
    },
    installed: {
      recipeVersions: CommandVersion[];
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
        path: `${PackmindDeployer.ARTEFACT_PATHS.command}${recipeVersion.slug}.md`,
        type: DeleteItemType.File,
      });
    }

    // Delete legacy commands index if no commands remain installed
    if (installed.recipeVersions.length === 0) {
      fileUpdates.delete.push({
        path: PackmindDeployer.LEGACY_COMMANDS_INDEX_PATH,
        type: DeleteItemType.File,
      });
    }

    // Delete individual standard files for removed standards
    for (const standardVersion of removed.standardVersions) {
      fileUpdates.delete.push({
        path: `${PackmindDeployer.ARTEFACT_PATHS.standard}${standardVersion.slug}.md`,
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
        path: PackmindDeployer.ARTEFACT_PATHS.command,
        type: DeleteItemType.Directory,
      });
      fileUpdates.delete.push({
        path: PackmindDeployer.ARTEFACT_PATHS.standard,
        type: DeleteItemType.Directory,
      });
      fileUpdates.delete.push({
        path: '.packmind/',
        type: DeleteItemType.Directory,
      });
    }

    return fileUpdates;
  }

  async generateAgentCleanupFileUpdates(artifacts: {
    recipeVersions: CommandVersion[];
    standardVersions: StandardVersion[];
    skillVersions: SkillVersion[];
  }): Promise<FileUpdates> {
    this.logger.info('Generating agent cleanup file updates for Packmind', {
      recipesCount: artifacts.recipeVersions.length,
      standardsCount: artifacts.standardVersions.length,
      skillsCount: artifacts.skillVersions.length,
    });

    return {
      createOrUpdate: [],
      delete: [
        {
          path: PackmindDeployer.ARTEFACT_PATHS.command,
          type: DeleteItemType.Directory,
        },
        {
          path: PackmindDeployer.ARTEFACT_PATHS.standard,
          type: DeleteItemType.Directory,
        },
        {
          path: '.packmind/',
          type: DeleteItemType.Directory,
        },
        {
          path: PackmindDeployer.LEGACY_COMMANDS_INDEX_PATH,
          type: DeleteItemType.File,
        },
        {
          path: '.packmind/standards-index.md',
          type: DeleteItemType.File,
        },
        {
          path: PackmindDeployer.LEGACY_RECIPES_INDEX_PATH,
          type: DeleteItemType.File,
        },
      ],
    };
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
