import {
  ChangeProposalType,
  SkillFileId,
  createSkillFileId,
} from '@packmind/types';
import { diffLines } from 'diff';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ArtefactDiff } from '../../../domain/useCases/IDiffArtefactsUseCase';
import { stripFrontmatter } from '../../utils/stripFrontmatter';
import { parseSkillMd } from '../../utils/parseSkillMd';
import { IDiffStrategy } from './IDiffStrategy';
import { DiffableFile } from './DiffableFile';

export function modeToPermissionString(mode: number): string {
  const perms = mode & 0o777;
  const chars = 'rwx';
  let result = '';
  for (let i = 8; i >= 0; i--) {
    result += perms & (1 << i) ? chars[(8 - i) % 3] : '-';
  }
  return result;
}

export class SkillDiffStrategy implements IDiffStrategy {
  supports(file: DiffableFile): boolean {
    return file.artifactType === 'skill';
  }

  async diff(
    file: DiffableFile,
    baseDirectory: string,
  ): Promise<ArtefactDiff[]> {
    if (file.path.endsWith('/SKILL.md')) {
      return this.diffSkillMd(file, baseDirectory);
    }
    return this.diffSkillFile(file, baseDirectory);
  }

  async diffNewLocalFiles(
    skillFolders: string[],
    serverFiles: DiffableFile[],
    baseDirectory: string,
  ): Promise<ArtefactDiff[]> {
    const diffs: ArtefactDiff[] = [];

    for (const folder of skillFolders) {
      const folderPath = path.join(baseDirectory, folder);
      const localFiles = await this.tryReadDir(folderPath);
      if (!localFiles) {
        continue;
      }

      const serverPathsInFolder = new Set(
        serverFiles
          .filter((f) => f.path.startsWith(folder + '/'))
          .map((f) => f.path),
      );

      const skillMdFile = serverFiles.find(
        (f) => f.path === `${folder}/SKILL.md` && f.artifactType === 'skill',
      );
      if (!skillMdFile) {
        continue;
      }

      for (const localFileName of localFiles) {
        if (localFileName === 'SKILL.md') {
          continue;
        }

        const filePath = `${folder}/${localFileName}`;
        if (serverPathsInFolder.has(filePath)) {
          continue;
        }

        const fullPath = path.join(baseDirectory, filePath);
        const stat = await this.tryStatFile(fullPath);
        if (!stat || stat.isDirectory) {
          continue;
        }

        const content = await this.tryReadFile(fullPath);
        if (content === null) {
          continue;
        }

        const newFileId = createSkillFileId(uuidv4());

        diffs.push({
          filePath,
          type: ChangeProposalType.addSkillFile,
          payload: {
            targetId: newFileId,
            item: {
              id: newFileId,
              path: localFileName,
              content,
              permissions: 'read',
              isBase64: false,
            },
          },
          artifactName: skillMdFile.artifactName,
          artifactType: 'skill',
          artifactId: skillMdFile.artifactId,
          spaceId: skillMdFile.spaceId,
        });
      }
    }

    return diffs;
  }

  private async diffSkillMd(
    file: DiffableFile,
    baseDirectory: string,
  ): Promise<ArtefactDiff[]> {
    const fullPath = path.join(baseDirectory, file.path);
    const localContent = await this.tryReadFile(fullPath);
    if (localContent === null) {
      return [];
    }

    const serverParsed = parseSkillMd(file.content);
    const localParsed = parseSkillMd(localContent);

    // Graceful degradation: if parsing fails, fall back to full-body comparison
    if (!serverParsed || !localParsed) {
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
          type: ChangeProposalType.updateSkillPrompt,
          payload: { oldValue: serverBody, newValue: localBody },
          artifactName: file.artifactName,
          artifactType: file.artifactType,
          artifactId: file.artifactId,
          spaceId: file.spaceId,
        },
      ];
    }

    const diffs: ArtefactDiff[] = [];
    const baseDiff = {
      filePath: file.path,
      artifactName: file.artifactName,
      artifactType: file.artifactType,
      artifactId: file.artifactId,
      spaceId: file.spaceId,
    };

    if (serverParsed.name !== localParsed.name) {
      diffs.push({
        ...baseDiff,
        type: ChangeProposalType.updateSkillName,
        payload: {
          oldValue: serverParsed.name,
          newValue: localParsed.name,
        },
      });
    }

    if (serverParsed.description !== localParsed.description) {
      diffs.push({
        ...baseDiff,
        type: ChangeProposalType.updateSkillDescription,
        payload: {
          oldValue: serverParsed.description,
          newValue: localParsed.description,
        },
      });
    }

    if (serverParsed.body !== localParsed.body) {
      diffs.push({
        ...baseDiff,
        type: ChangeProposalType.updateSkillPrompt,
        payload: {
          oldValue: serverParsed.body,
          newValue: localParsed.body,
        },
      });
    }

    if (serverParsed.metadataJson !== localParsed.metadataJson) {
      diffs.push({
        ...baseDiff,
        type: ChangeProposalType.updateSkillMetadata,
        payload: {
          oldValue: serverParsed.metadataJson,
          newValue: localParsed.metadataJson,
        },
      });
    }

    return diffs;
  }

  private async diffSkillFile(
    file: DiffableFile,
    baseDirectory: string,
  ): Promise<ArtefactDiff[]> {
    const fullPath = path.join(baseDirectory, file.path);
    const localContent = await this.tryReadFile(fullPath);

    if (localContent === null) {
      return [
        {
          filePath: file.path,
          type: ChangeProposalType.deleteSkillFile,
          payload: {
            targetId: file.skillFileId as SkillFileId,
            item: {
              id: createSkillFileId(file.skillFileId!),
              path: file.path,
              content: file.content,
              permissions: file.skillFilePermissions ?? 'read',
              isBase64: file.isBase64 ?? false,
            },
          },
          artifactName: file.artifactName,
          artifactType: file.artifactType,
          artifactId: file.artifactId,
          spaceId: file.spaceId,
        },
      ];
    }

    const diffs: ArtefactDiff[] = [];
    const baseDiff = {
      filePath: file.path,
      artifactName: file.artifactName,
      artifactType: file.artifactType,
      artifactId: file.artifactId,
      spaceId: file.spaceId,
    };

    if (localContent !== file.content) {
      diffs.push({
        ...baseDiff,
        type: ChangeProposalType.updateSkillFileContent,
        payload: {
          targetId: createSkillFileId(file.skillFileId!),
          oldValue: file.content,
          newValue: localContent,
        },
      });
    }

    if (file.skillFilePermissions) {
      const localPermissions = await this.tryGetPermissions(fullPath);
      if (localPermissions && localPermissions !== file.skillFilePermissions) {
        diffs.push({
          ...baseDiff,
          type: ChangeProposalType.updateSkillFilePermissions,
          payload: {
            targetId: createSkillFileId(file.skillFileId!),
            oldValue: file.skillFilePermissions,
            newValue: localPermissions,
          },
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

  private async tryReadDir(dirPath: string): Promise<string[] | null> {
    try {
      return await fs.readdir(dirPath);
    } catch {
      return null;
    }
  }

  private async tryStatFile(
    filePath: string,
  ): Promise<{ isDirectory: boolean } | null> {
    try {
      const stat = await fs.stat(filePath);
      return { isDirectory: stat.isDirectory() };
    } catch {
      return null;
    }
  }

  private async tryGetPermissions(filePath: string): Promise<string | null> {
    try {
      const stat = await fs.stat(filePath);
      return modeToPermissionString(stat.mode);
    } catch {
      return null;
    }
  }
}
