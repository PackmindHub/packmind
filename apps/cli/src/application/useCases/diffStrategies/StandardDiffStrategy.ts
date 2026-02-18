import { ChangeProposalType } from '@packmind/types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ArtefactDiff } from '../../../domain/useCases/IDiffArtefactsUseCase';
import { parseStandardMd } from '../../utils/parseStandardMd';
import { IDiffStrategy } from './IDiffStrategy';
import { DiffableFile } from './DiffableFile';

export class StandardDiffStrategy implements IDiffStrategy {
  supports(file: DiffableFile): boolean {
    return file.artifactType === 'standard';
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

    const serverParsed = parseStandardMd(file.content);
    const localParsed = parseStandardMd(localContent);

    if (!serverParsed || !localParsed) {
      return [];
    }

    const diffs: ArtefactDiff[] = [];

    if (serverParsed.name !== localParsed.name) {
      diffs.push({
        filePath: file.path,
        type: ChangeProposalType.updateStandardName,
        payload: {
          oldValue: serverParsed.name,
          newValue: localParsed.name,
        },
        artifactName: file.artifactName,
        artifactType: file.artifactType,
        artifactId: file.artifactId,
        spaceId: file.spaceId,
      });
    }

    if (serverParsed.description !== localParsed.description) {
      diffs.push({
        filePath: file.path,
        type: ChangeProposalType.updateStandardDescription,
        payload: {
          oldValue: serverParsed.description,
          newValue: localParsed.description,
        },
        artifactName: file.artifactName,
        artifactType: file.artifactType,
        artifactId: file.artifactId,
        spaceId: file.spaceId,
      });
    }

    return diffs;
  }
}
