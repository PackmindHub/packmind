import { ArtifactType, ChangeProposalType } from '@packmind/types';
import { diffLines } from 'diff';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ArtefactDiff } from '../../../domain/useCases/IDiffArtefactsUseCase';
import { stripFrontmatter } from '../../utils/stripFrontmatter';
import { IDiffStrategy } from './IDiffStrategy';
import { DiffableFile } from './DiffableFile';

const CHANGE_TYPE: Record<
  Exclude<ArtifactType, 'skill'>,
  ChangeProposalType
> = {
  command: ChangeProposalType.updateCommandDescription,
  standard: ChangeProposalType.updateStandardDescription,
};

export class CommandDiffStrategy implements IDiffStrategy {
  supports(file: DiffableFile): boolean {
    return file.artifactType !== 'skill';
  }

  async diff(
    file: DiffableFile,
    baseDirectory: string,
  ): Promise<ArtefactDiff[]> {
    const fullPath = path.join(baseDirectory, file.path);
    let localContent: string;
    try {
      localContent = await fs.readFile(fullPath, 'utf-8');
    } catch {
      return [];
    }

    const serverBody = stripFrontmatter(file.content);
    const localBody = stripFrontmatter(localContent);
    const changes = diffLines(serverBody, localBody);
    const hasDifferences = changes.some(
      (change) => change.added || change.removed,
    );

    if (!hasDifferences) {
      return [];
    }

    return [
      {
        filePath: file.path,
        type: CHANGE_TYPE[file.artifactType as Exclude<ArtifactType, 'skill'>],
        payload: {
          oldValue: serverBody,
          newValue: localBody,
        },
        artifactName: file.artifactName,
        artifactType: file.artifactType,
        artifactId: file.artifactId,
        spaceId: file.spaceId,
      },
    ];
  }
}
