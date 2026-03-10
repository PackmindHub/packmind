import {
  IDiffArtefactsCommand,
  IDiffArtefactsResult,
  IDiffArtefactsUseCase,
  ArtefactDiff,
} from '../../domain/useCases/IDiffArtefactsUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { ILockFileRepository } from '../../domain/repositories/ILockFileRepository';
import { FileModification, IPullContentResponse } from '@packmind/types';
import { DiffableFile } from './diffStrategies/DiffableFile';
import { IDiffStrategy } from './diffStrategies/IDiffStrategy';
import { CommandDiffStrategy } from './diffStrategies/CommandDiffStrategy';
import { SkillDiffStrategy } from './diffStrategies/SkillDiffStrategy';
import { StandardDiffStrategy } from './diffStrategies/StandardDiffStrategy';

export class DiffArtefactsUseCase implements IDiffArtefactsUseCase {
  private readonly strategies: IDiffStrategy[];

  constructor(
    private readonly packmindGateway: IPackmindGateway,
    private readonly lockFileRepository: ILockFileRepository,
  ) {
    this.strategies = [
      new CommandDiffStrategy(),
      new SkillDiffStrategy(),
      new StandardDiffStrategy(),
    ];
  }

  public async execute(
    command: IDiffArtefactsCommand,
  ): Promise<IDiffArtefactsResult> {
    const baseDirectory = command.baseDirectory || process.cwd();

    const response = await this.fetchContent(command, baseDirectory);

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

    const prefixedSkillFolders = this.prefixSkillFolders(
      response.skillFolders,
      command.relativePath,
    );

    const diffs: ArtefactDiff[] = [];

    for (const file of diffableFiles) {
      const strategy = this.strategies.find((s) => s.supports(file));
      if (strategy) {
        const fileDiffs = await strategy.diff(file, baseDirectory, {
          skillFolders: prefixedSkillFolders,
        });
        diffs.push(...fileDiffs);
      }
    }

    for (const strategy of this.strategies) {
      if (strategy.diffNewFiles) {
        const newFileDiffs = await strategy.diffNewFiles(
          prefixedSkillFolders,
          diffableFiles,
          baseDirectory,
        );
        diffs.push(...newFileDiffs);
      }
    }

    return diffs;
  }

  private async fetchContent(
    command: IDiffArtefactsCommand,
    baseDirectory: string,
  ): Promise<IPullContentResponse> {
    const lockFile = await this.lockFileRepository.read(baseDirectory);

    if (lockFile) {
      return this.packmindGateway.deployment.getContentByVersions({
        artifacts: Object.values(lockFile.artifacts),
        agents: lockFile.agents,
      });
    }

    return this.packmindGateway.deployment.getDeployed({
      packagesSlugs: command.packagesSlugs,
      gitRemoteUrl: command.gitRemoteUrl,
      gitBranch: command.gitBranch,
      relativePath: command.relativePath,
      agents: command.agents,
    });
  }

  private prefixSkillFolders(
    skillFolders: string[],
    relativePath?: string,
  ): string[] {
    if (!relativePath) return skillFolders;
    let normalized = relativePath;
    while (normalized.startsWith('/')) normalized = normalized.slice(1);
    while (normalized.endsWith('/')) normalized = normalized.slice(0, -1);
    if (!normalized) return skillFolders;
    return skillFolders.map((folder) => `${normalized}/${folder}`);
  }
}
