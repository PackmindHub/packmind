import {
  IDiffArtefactsCommand,
  IDiffArtefactsResult,
  IDiffArtefactsUseCase,
  ArtefactDiff,
} from '../../domain/useCases/IDiffArtefactsUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { FileModification } from '@packmind/types';
import { DiffableFile } from './diffStrategies/DiffableFile';
import { IDiffStrategy } from './diffStrategies/IDiffStrategy';
import { NonSkillDiffStrategy } from './diffStrategies/NonSkillDiffStrategy';
import { SkillDiffStrategy } from './diffStrategies/SkillDiffStrategy';

export class DiffArtefactsUseCase implements IDiffArtefactsUseCase {
  private readonly strategies: IDiffStrategy[];
  private readonly skillStrategy: SkillDiffStrategy;

  constructor(private readonly packmindGateway: IPackmindGateway) {
    this.skillStrategy = new SkillDiffStrategy();
    this.strategies = [new NonSkillDiffStrategy(), this.skillStrategy];
  }

  public async execute(
    command: IDiffArtefactsCommand,
  ): Promise<IDiffArtefactsResult> {
    const baseDirectory = command.baseDirectory || process.cwd();

    const response = await this.packmindGateway.deployment.pull({
      packagesSlugs: command.packagesSlugs,
      previousPackagesSlugs: command.previousPackagesSlugs,
      gitRemoteUrl: command.gitRemoteUrl,
      gitBranch: command.gitBranch,
      relativePath: command.relativePath,
      agents: command.agents,
    });

    const filteredFiles = response.fileUpdates.createOrUpdate.filter(
      (file) => file.path !== 'packmind.json',
    );

    const uniqueFilesMap = new Map<string, FileModification>();
    for (const file of filteredFiles) {
      uniqueFilesMap.set(file.path, file);
    }

    const diffableFiles = Array.from(uniqueFilesMap.values()).filter(
      (file): file is DiffableFile =>
        !!file.artifactType &&
        !!file.artifactName &&
        file.content !== undefined,
    );

    const diffs: ArtefactDiff[] = [];

    for (const file of diffableFiles) {
      const strategy = this.strategies.find((s) => s.supports(file));
      if (strategy) {
        const fileDiffs = await strategy.diff(file, baseDirectory);
        diffs.push(...fileDiffs);
      }
    }

    // Detect new local skill files (addSkillFile)
    const newFileDiffs = await this.skillStrategy.diffNewLocalFiles(
      response.skillFolders,
      diffableFiles,
      baseDirectory,
    );
    diffs.push(...newFileDiffs);

    return diffs;
  }
}
