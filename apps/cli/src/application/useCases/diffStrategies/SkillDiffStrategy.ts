import {
  ChangeProposalType,
  SkillFileId,
  createSkillFileId,
} from '@packmind/types';
import { diffLines } from 'diff';
import * as fs from 'fs/promises';
import * as path from 'path';

import { ArtefactDiff } from '../../../domain/useCases/IDiffArtefactsUseCase';
import { stripFrontmatter } from '../../utils/stripFrontmatter';
import { ParsedSkillMd, parseSkillMd } from '../../utils/parseSkillMd';
import { DiffContext, IDiffStrategy } from './IDiffStrategy';
import { DiffableFile } from './DiffableFile';

function modeToPermissionString(mode: number): string {
  const perms = mode & 0o777;
  const chars = 'rwx';
  let result = '';
  for (let i = 8; i >= 0; i--) {
    result += perms & (1 << i) ? chars[(8 - i) % 3] : '-';
  }
  return result;
}

type BaseDiff = Pick<
  ArtefactDiff,
  'filePath' | 'artifactName' | 'artifactType' | 'artifactId' | 'spaceId'
>;

export class SkillDiffStrategy implements IDiffStrategy {
  supports(file: DiffableFile): boolean {
    return file.artifactType === 'skill';
  }

  async diff(
    file: DiffableFile,
    baseDirectory: string,
    context?: DiffContext,
  ): Promise<ArtefactDiff[]> {
    if (file.path.endsWith('/SKILL.md')) {
      return this.diffSkillMd(file, baseDirectory);
    }
    return this.diffSkillFile(file, baseDirectory, context?.skillFolders ?? []);
  }

  async diffNewFiles(
    skillFolders: string[],
    serverFiles: DiffableFile[],
    baseDirectory: string,
  ): Promise<ArtefactDiff[]> {
    const diffs: ArtefactDiff[] = [];

    for (const folder of skillFolders) {
      const folderPath = path.join(baseDirectory, folder);
      const localFiles = await this.listFilesRecursively(folderPath);

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

      for (const relativePath of localFiles) {
        if (relativePath === 'SKILL.md') {
          continue;
        }

        const filePath = `${folder}/${relativePath}`;
        if (serverPathsInFolder.has(filePath)) {
          continue;
        }

        const fullPath = path.join(baseDirectory, filePath);
        const content = await this.tryReadFile(fullPath);
        if (content === null) {
          continue;
        }

        const newFileId = createSkillFileId(relativePath);
        const permissions =
          (await this.tryGetPermissions(fullPath)) ?? 'rw-r--r--';

        diffs.push({
          filePath,
          type: ChangeProposalType.addSkillFile,
          payload: {
            targetId: newFileId,
            item: {
              id: newFileId,
              path: relativePath,
              content,
              permissions,
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

    const baseDiff: BaseDiff = {
      filePath: file.path,
      artifactName: file.artifactName,
      artifactType: file.artifactType,
      artifactId: file.artifactId,
      spaceId: file.spaceId,
    };

    const checks = [
      this.checkUpdateSkillName(serverParsed, localParsed, baseDiff),
      this.checkUpdateSkillDescription(serverParsed, localParsed, baseDiff),
      this.checkUpdateSkillPrompt(serverParsed, localParsed, baseDiff),
      this.checkUpdateSkillMetadata(serverParsed, localParsed, baseDiff),
      this.checkUpdateSkillLicense(serverParsed, localParsed, baseDiff),
      this.checkUpdateSkillCompatibility(serverParsed, localParsed, baseDiff),
      this.checkUpdateSkillAllowedTools(serverParsed, localParsed, baseDiff),
    ];
    return checks.filter((d): d is ArtefactDiff => d !== null);
  }

  private async diffSkillFile(
    file: DiffableFile,
    baseDirectory: string,
    skillFolders: string[],
  ): Promise<ArtefactDiff[]> {
    if (!file.skillFileId) {
      return [];
    }

    const skillFileId = createSkillFileId(file.skillFileId);
    const fullPath = path.join(baseDirectory, file.path);
    const localContent = await this.tryReadFile(fullPath);
    const fileRelativePath = this.computeRelativePath(file.path, skillFolders);

    if (localContent === null) {
      return [
        {
          filePath: file.path,
          type: ChangeProposalType.deleteSkillFile,
          payload: {
            targetId: skillFileId,
            item: {
              id: skillFileId,
              path: fileRelativePath,
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

    const baseDiff: BaseDiff = {
      filePath: file.path,
      artifactName: file.artifactName,
      artifactType: file.artifactType,
      artifactId: file.artifactId,
      spaceId: file.spaceId,
    };

    const checks = await Promise.all([
      this.checkUpdateSkillFileContent(
        file,
        localContent,
        skillFileId,
        baseDiff,
      ),
      this.checkUpdateSkillFilePermissions(
        file,
        fullPath,
        skillFileId,
        baseDiff,
      ),
    ]);
    return checks.filter((d): d is ArtefactDiff => d !== null);
  }

  private checkUpdateSkillName(
    serverParsed: ParsedSkillMd,
    localParsed: ParsedSkillMd,
    baseDiff: BaseDiff,
  ): ArtefactDiff | null {
    if (serverParsed.name === localParsed.name) {
      return null;
    }
    return {
      ...baseDiff,
      type: ChangeProposalType.updateSkillName,
      payload: { oldValue: serverParsed.name, newValue: localParsed.name },
    };
  }

  private checkUpdateSkillDescription(
    serverParsed: ParsedSkillMd,
    localParsed: ParsedSkillMd,
    baseDiff: BaseDiff,
  ): ArtefactDiff | null {
    if (serverParsed.description === localParsed.description) {
      return null;
    }
    return {
      ...baseDiff,
      type: ChangeProposalType.updateSkillDescription,
      payload: {
        oldValue: serverParsed.description,
        newValue: localParsed.description,
      },
    };
  }

  private checkUpdateSkillPrompt(
    serverParsed: ParsedSkillMd,
    localParsed: ParsedSkillMd,
    baseDiff: BaseDiff,
  ): ArtefactDiff | null {
    if (serverParsed.body === localParsed.body) {
      return null;
    }
    return {
      ...baseDiff,
      type: ChangeProposalType.updateSkillPrompt,
      payload: { oldValue: serverParsed.body, newValue: localParsed.body },
    };
  }

  private checkUpdateSkillMetadata(
    serverParsed: ParsedSkillMd,
    localParsed: ParsedSkillMd,
    baseDiff: BaseDiff,
  ): ArtefactDiff | null {
    if (serverParsed.metadataJson === localParsed.metadataJson) {
      return null;
    }
    return {
      ...baseDiff,
      type: ChangeProposalType.updateSkillMetadata,
      payload: {
        oldValue: serverParsed.metadataJson,
        newValue: localParsed.metadataJson,
      },
    };
  }

  private checkUpdateSkillLicense(
    serverParsed: ParsedSkillMd,
    localParsed: ParsedSkillMd,
    baseDiff: BaseDiff,
  ): ArtefactDiff | null {
    if (serverParsed.license === localParsed.license) {
      return null;
    }
    return {
      ...baseDiff,
      type: ChangeProposalType.updateSkillLicense,
      payload: {
        oldValue: serverParsed.license,
        newValue: localParsed.license,
      },
    };
  }

  private checkUpdateSkillCompatibility(
    serverParsed: ParsedSkillMd,
    localParsed: ParsedSkillMd,
    baseDiff: BaseDiff,
  ): ArtefactDiff | null {
    if (serverParsed.compatibility === localParsed.compatibility) {
      return null;
    }
    return {
      ...baseDiff,
      type: ChangeProposalType.updateSkillCompatibility,
      payload: {
        oldValue: serverParsed.compatibility,
        newValue: localParsed.compatibility,
      },
    };
  }

  private checkUpdateSkillAllowedTools(
    serverParsed: ParsedSkillMd,
    localParsed: ParsedSkillMd,
    baseDiff: BaseDiff,
  ): ArtefactDiff | null {
    if (serverParsed.allowedTools === localParsed.allowedTools) {
      return null;
    }
    return {
      ...baseDiff,
      type: ChangeProposalType.updateSkillAllowedTools,
      payload: {
        oldValue: serverParsed.allowedTools,
        newValue: localParsed.allowedTools,
      },
    };
  }

  private checkUpdateSkillFileContent(
    file: DiffableFile,
    localContent: string,
    skillFileId: SkillFileId,
    baseDiff: BaseDiff,
  ): ArtefactDiff | null {
    if (localContent === file.content) {
      return null;
    }
    return {
      ...baseDiff,
      type: ChangeProposalType.updateSkillFileContent,
      payload: {
        targetId: skillFileId,
        oldValue: file.content,
        newValue: localContent,
      },
    };
  }

  private async checkUpdateSkillFilePermissions(
    file: DiffableFile,
    fullPath: string,
    skillFileId: SkillFileId,
    baseDiff: BaseDiff,
  ): Promise<ArtefactDiff | null> {
    if (!file.skillFilePermissions) {
      return null;
    }
    const localPermissions = await this.tryGetPermissions(fullPath);
    if (!localPermissions || localPermissions === file.skillFilePermissions) {
      return null;
    }
    return {
      ...baseDiff,
      type: ChangeProposalType.updateSkillFilePermissions,
      payload: {
        targetId: skillFileId,
        oldValue: file.skillFilePermissions,
        newValue: localPermissions,
      },
    };
  }

  private async tryReadFile(filePath: string): Promise<string | null> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  private async listFilesRecursively(
    dirPath: string,
    prefix = '',
  ): Promise<string[]> {
    let entries: string[];
    try {
      entries = await fs.readdir(dirPath);
    } catch {
      return [];
    }

    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const stat = await this.tryStatFile(fullPath);
      if (!stat) {
        continue;
      }

      const relativePath = prefix ? `${prefix}/${entry}` : entry;
      if (stat.isDirectory) {
        const subFiles = await this.listFilesRecursively(
          fullPath,
          relativePath,
        );
        files.push(...subFiles);
      } else {
        files.push(relativePath);
      }
    }
    return files;
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

  private computeRelativePath(
    filePath: string,
    skillFolders: string[],
  ): string {
    const skillFolder = skillFolders.find((f) => filePath.startsWith(f + '/'));
    if (skillFolder) {
      return filePath.slice(skillFolder.length + 1);
    }
    // Fallback: assume 3-segment prefix (e.g. .claude/skills/slug/)
    return filePath.split('/').slice(3).join('/');
  }
}
