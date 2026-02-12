import {
  IDiffArtefactsCommand,
  IDiffArtefactsResult,
  IDiffArtefactsUseCase,
  ArtefactDiff,
} from '../../domain/useCases/IDiffArtefactsUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import {
  ArtifactType,
  ChangeProposalType,
  FileModification,
} from '@packmind/types';
import { diffLines } from 'diff';
import * as fs from 'fs/promises';
import * as path from 'path';
import { stripFrontmatter } from '../utils/stripFrontmatter';

type DiffableFile = FileModification & {
  content: string;
  artifactType: ArtifactType;
  artifactName: string;
};

const ARTIFACT_TYPE_TO_CHANGE_TYPE: Record<ArtifactType, ChangeProposalType> = {
  command: ChangeProposalType.updateCommandDescription,
  standard: ChangeProposalType.updateStandardDescription,
  skill: ChangeProposalType.updateSkillDescription,
};

export class DiffArtefactsUseCase implements IDiffArtefactsUseCase {
  constructor(private readonly packmindGateway: IPackmindGateway) {}

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
      const fullPath = path.join(baseDirectory, file.path);

      const localContent = await this.tryReadFile(fullPath);
      if (localContent === null) {
        continue;
      }

      const serverBody = stripFrontmatter(file.content);
      const localBody = stripFrontmatter(localContent);
      const changes = diffLines(serverBody, localBody);
      const hasDifferences = changes.some(
        (change) => change.added || change.removed,
      );

      if (hasDifferences) {
        diffs.push({
          filePath: file.path,
          type: ARTIFACT_TYPE_TO_CHANGE_TYPE[file.artifactType],
          payload: {
            oldValue: serverBody,
            newValue: localBody,
          },
          artifactName: file.artifactName,
          artifactType: file.artifactType,
          artifactId: file.artifactId,
          spaceId: file.spaceId,
        });
      }
    }

    return diffs;
  }

  private async tryReadFile(filePath: string): Promise<string | null> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch {
      return null;
    }
  }
}
