import { ChangeProposalType } from '@packmind/types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ArtefactDiff } from '../../../domain/useCases/IDiffArtefactsUseCase';
import { parseStandardMd, ParsedStandardMd } from '../../utils/parseStandardMd';
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

    const serverParsed = parseStandardMd(file.content, file.path);
    const localParsed = parseStandardMd(localContent, file.path);

    if (!serverParsed || !localParsed) {
      return [];
    }

    const diffs: ArtefactDiff[] = [];

    const nameDiff = resolveFieldDiff(serverParsed, localParsed, 'name');
    if (nameDiff) {
      diffs.push({
        filePath: file.path,
        type: ChangeProposalType.updateStandardName,
        payload: nameDiff,
        artifactName: file.artifactName,
        artifactType: file.artifactType,
        artifactId: file.artifactId,
        spaceId: file.spaceId,
      });
    }

    const descDiff = resolveFieldDiff(serverParsed, localParsed, 'description');
    if (descDiff) {
      diffs.push({
        filePath: file.path,
        type: ChangeProposalType.updateStandardDescription,
        payload: descDiff,
        artifactName: file.artifactName,
        artifactType: file.artifactType,
        artifactId: file.artifactId,
        spaceId: file.spaceId,
      });
    }

    if (serverParsed.scope !== localParsed.scope) {
      diffs.push({
        filePath: file.path,
        type: ChangeProposalType.updateStandardScope,
        payload: {
          oldValue: serverParsed.scope,
          newValue: localParsed.scope,
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

type FrontmatterKey = 'name' | 'description';

const FRONTMATTER_FIELD: Record<FrontmatterKey, keyof ParsedStandardMd> = {
  name: 'frontmatterName',
  description: 'frontmatterDescription',
};

function resolveFieldDiff(
  server: ParsedStandardMd,
  local: ParsedStandardMd,
  field: FrontmatterKey,
): { oldValue: string; newValue: string } | null {
  const fmField = FRONTMATTER_FIELD[field];
  const serverFm = server[fmField] as string | undefined;
  const localFm = local[fmField] as string | undefined;

  // If both have frontmatter values, check frontmatter first (priority)
  if (serverFm !== undefined && localFm !== undefined) {
    if (serverFm !== localFm) {
      return { oldValue: serverFm, newValue: localFm };
    }
  }

  // Fall back to body values
  if (server[field] !== local[field]) {
    return {
      oldValue: server[field] as string,
      newValue: local[field] as string,
    };
  }

  return null;
}
