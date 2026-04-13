import {
  IInstallCommand,
  IInstallResult,
  IInstallUseCase,
} from '../../domain/useCases/IInstallUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { ILockFileRepository } from '../../domain/repositories/ILockFileRepository';
import { IConfigFileRepository } from '../../domain/repositories/IConfigFileRepository';
import { ISpaceService } from '../../domain/services/ISpaceService';
import { SpaceType } from '@packmind/types';
import { mergeSectionsIntoFileContent } from '@packmind/node-utils';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  parsePermissionString,
  supportsUnixPermissions,
} from '../../infra/utils/permissions';
import { normalizePackageSlugs } from '../utils/normalizePackageSlugs';

export class InstallUseCase implements IInstallUseCase {
  constructor(
    private readonly packmindGateway: IPackmindGateway,
    private readonly lockFileRepository: ILockFileRepository,
    private readonly configFileRepository: IConfigFileRepository,
    private readonly spaceService: ISpaceService,
  ) {}

  public async execute(command: IInstallCommand): Promise<IInstallResult> {
    const baseDirectory = command.baseDirectory || process.cwd();

    const result: IInstallResult = {
      filesCreated: 0,
      filesUpdated: 0,
      filesDeleted: 0,
      contentFilesChanged: 0,
      errors: [],
      recipesCount: 0,
      standardsCount: 0,
      commandsCount: 0,
      skillsCount: 0,
      recipesRemoved: 0,
      standardsRemoved: 0,
      commandsRemoved: 0,
      skillsRemoved: 0,
      skillDirectoriesDeleted: 0,
      missingAccess: [],
    };

    const hasExplicitPackages = command.packages && command.packages.length > 0;

    const lockFile = await this.lockFileRepository.read(baseDirectory);
    const config = await this.configFileRepository.readConfig(baseDirectory);

    if (!config && !hasExplicitPackages) {
      throw new Error(
        'No packmind.json found in this directory. Run `packmind-cli install <@space/package>` first to install your packages.',
      );
    }

    const effectiveLockFile = lockFile ?? {
      lockfileVersion: 1,
      packageSlugs: [],
      agents: [],
      installedAt: new Date().toISOString(),
      artifacts: {},
    };

    let packagesSlugs: string[];
    let normalizedPackages: string[] = [];

    if (hasExplicitPackages) {
      normalizedPackages = await this.normalizePackageSlugs(command.packages!);
      await this.validatePackageAccess(normalizedPackages);

      const configPackages = config ? Object.keys(config.packages) : [];
      packagesSlugs = [...new Set([...configPackages, ...normalizedPackages])];
    } else {
      packagesSlugs = Object.keys(config!.packages);
    }

    if (packagesSlugs.length === 0) {
      try {
        for (const entry of Object.values(effectiveLockFile.artifacts)) {
          for (const file of entry.files) {
            await this.deleteFile(baseDirectory, file.path, result);
          }
        }
        await this.deleteFile(baseDirectory, 'packmind-lock.json', result);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.errors.push(`Failed to clean up artifacts: ${errorMsg}`);
      }
      return result;
    }

    const response = await this.packmindGateway.deployment.install({
      packagesSlugs,
      packmindLockFile: effectiveLockFile,
      agents: config?.agents,
    });

    result.missingAccess = response.missingAccess;

    if (result.missingAccess.length > 0) {
      result.joinSpaceUrl = await this.computeJoinSpaceUrl(
        result.missingAccess,
      );
    }

    // Filter out packmind.json from server response - config writing is handled separately
    // by the CLI to preserve property order
    const filteredCreateOrUpdate = response.fileUpdates.createOrUpdate.filter(
      (file) => file.path !== 'packmind.json',
    );

    // Deduplicate files by path
    const uniqueFilesMap = new Map<
      string,
      {
        path: string;
        content?: string;
        sections?: { key: string; content: string }[];
        skillFilePermissions?: string;
      }
    >();

    for (const file of filteredCreateOrUpdate) {
      uniqueFilesMap.set(file.path, file);
    }

    const uniqueFiles = Array.from(uniqueFilesMap.values());

    // Count artifact types
    for (const file of uniqueFiles) {
      if (
        file.path.includes('.packmind/recipes/') &&
        file.path.endsWith('.md')
      ) {
        result.recipesCount++;
      } else if (
        file.path.includes('.packmind/standards/') &&
        file.path.endsWith('.md')
      ) {
        result.standardsCount++;
      } else if (
        file.path.includes('.packmind/commands/') &&
        file.path.endsWith('.md')
      ) {
        result.commandsCount++;
      } else if (
        file.path.includes('.packmind/skills/') &&
        file.path.endsWith('.md')
      ) {
        result.skillsCount++;
      }
    }

    try {
      result.skillDirectoriesDeleted = await this.deleteSkillFolders(
        baseDirectory,
        response.skillFolders,
      );

      for (const file of uniqueFiles) {
        try {
          const changesBefore = result.filesCreated + result.filesUpdated;
          await this.createOrUpdateFile(
            baseDirectory,
            file,
            result,
            file.skillFilePermissions,
          );
          if (
            result.filesCreated + result.filesUpdated > changesBefore &&
            this.isContentFile(file.path)
          ) {
            result.contentFilesChanged++;
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          result.errors.push(
            `Failed to create/update ${file.path}: ${errorMsg}`,
          );
        }
      }

      for (const file of response.fileUpdates.delete) {
        try {
          const deletedBefore = result.filesDeleted;
          await this.deleteFile(baseDirectory, file.path, result);
          if (result.filesDeleted > deletedBefore) {
            if (
              file.path.includes('.packmind/standards/') &&
              file.path.endsWith('.md')
            ) {
              result.standardsRemoved++;
              result.contentFilesChanged++;
            } else if (
              file.path.includes('.packmind/commands/') &&
              file.path.endsWith('.md')
            ) {
              result.commandsRemoved++;
              result.contentFilesChanged++;
            } else if (
              file.path.includes('.packmind/skills/') &&
              file.path.endsWith('.md')
            ) {
              result.skillsRemoved++;
              result.contentFilesChanged++;
            } else if (
              file.path.includes('.packmind/recipes/') &&
              file.path.endsWith('.md')
            ) {
              result.recipesRemoved++;
              result.contentFilesChanged++;
            }
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          result.errors.push(`Failed to delete ${file.path}: ${errorMsg}`);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(`Failed to install packages: ${errorMsg}`);
    }

    if (normalizedPackages.length > 0) {
      await this.configFileRepository.addPackagesToConfig(
        baseDirectory,
        normalizedPackages,
      );
    }

    return result;
  }

  private async normalizePackageSlugs(slugs: string[]): Promise<string[]> {
    return normalizePackageSlugs(slugs, this.spaceService);
  }

  private async validatePackageAccess(packages: string[]): Promise<void> {
    const userSpaces = await this.spaceService.getSpaces();
    const userSpaceSlugs = new Set(userSpaces.map((s) => s.slug));
    const { host } = this.spaceService.getApiContext();

    const errors: string[] = [];

    for (const pkg of packages) {
      const spaceSlug = pkg.startsWith('@') ? pkg.slice(1).split('/')[0] : null;
      if (!spaceSlug || userSpaceSlugs.has(spaceSlug)) continue;

      const space = await this.spaceService.getSpaceBySlug(spaceSlug);
      if (!space || space.type === SpaceType.private) {
        errors.push(`Package ${pkg} does not exist.`);
      } else {
        const organization =
          await this.packmindGateway.organization.getOrganization();
        const joinUrl = `${host}/org/${organization.slug}/spaces/${spaceSlug}/join`;
        errors.push(
          `You don't have access to space @${spaceSlug}. It is a public space — you can join at: ${joinUrl}`,
        );
      }
    }

    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }
  }

  private async computeJoinSpaceUrl(
    missingAccessSlugs: string[],
  ): Promise<string | undefined> {
    const spaceSlugs = new Set<string>();
    for (const slug of missingAccessSlugs) {
      if (slug.startsWith('@')) {
        const spaceSlug = slug.slice(1).split('/')[0];
        spaceSlugs.add(spaceSlug);
      }
    }

    if (spaceSlugs.size !== 1) return undefined;

    const [spaceSlug] = spaceSlugs;
    const space = await this.spaceService.getSpaceBySlug(spaceSlug);

    if (!space || space.type !== SpaceType.open) return undefined;

    const organization =
      await this.packmindGateway.organization.getOrganization();
    const { host } = this.spaceService.getApiContext();
    return `${host}/org/${organization.slug}/spaces/${spaceSlug}/join`;
  }

  private async createOrUpdateFile(
    baseDirectory: string,
    file: {
      path: string;
      content?: string;
      sections?: { key: string; content: string }[];
      isBase64?: boolean;
    },
    result: IInstallResult,
    skillFilePermissions?: string,
  ): Promise<void> {
    const fullPath = path.join(baseDirectory, file.path);
    const directory = path.dirname(fullPath);

    await fs.mkdir(directory, { recursive: true });

    const fileExists = await this.fileExists(fullPath);

    if (file.content !== undefined) {
      await this.handleFullContentUpdate(
        fullPath,
        file.content,
        fileExists,
        result,
        file.isBase64,
      );
    } else if (file.sections !== undefined) {
      await this.handleSectionsUpdate(
        fullPath,
        file.sections,
        fileExists,
        result,
        baseDirectory,
      );
    }

    if (skillFilePermissions && supportsUnixPermissions()) {
      await fs.chmod(fullPath, parsePermissionString(skillFilePermissions));
    }
  }

  private async handleFullContentUpdate(
    fullPath: string,
    content: string,
    fileExists: boolean,
    result: IInstallResult,
    isBase64?: boolean,
  ): Promise<void> {
    if (isBase64) {
      const buffer = Buffer.from(content, 'base64');
      await fs.writeFile(fullPath, buffer);
      if (fileExists) {
        result.filesUpdated++;
      } else {
        result.filesCreated++;
      }
      return;
    }

    if (fileExists) {
      const existingContent = await fs.readFile(fullPath, 'utf-8');
      const commentMarker = this.extractCommentMarker(content);
      let finalContent: string;

      if (!commentMarker) {
        finalContent = content;
      } else {
        finalContent = this.mergeContentWithMarkers(
          existingContent,
          content,
          commentMarker,
        );
      }

      if (existingContent !== finalContent) {
        await fs.writeFile(fullPath, finalContent, 'utf-8');
        result.filesUpdated++;
      }
    } else {
      await fs.writeFile(fullPath, content, 'utf-8');
      result.filesCreated++;
    }
  }

  private async handleSectionsUpdate(
    fullPath: string,
    sections: { key: string; content: string }[],
    fileExists: boolean,
    result: IInstallResult,
    baseDirectory: string,
  ): Promise<void> {
    let currentContent = '';

    if (fileExists) {
      currentContent = await fs.readFile(fullPath, 'utf-8');
    }

    const mergedContent = mergeSectionsIntoFileContent(
      currentContent,
      sections,
    );

    if (currentContent !== mergedContent) {
      if (this.isEffectivelyEmpty(mergedContent) && fileExists) {
        await fs.unlink(fullPath);
        result.filesDeleted++;
        await this.removeEmptyParentDirectories(fullPath, baseDirectory);
      } else {
        await fs.writeFile(fullPath, mergedContent, 'utf-8');

        if (fileExists) {
          result.filesUpdated++;
        } else {
          result.filesCreated++;
        }
      }
    }
  }

  private async deleteFile(
    baseDirectory: string,
    filePath: string,
    result: IInstallResult,
  ): Promise<void> {
    const fullPath = path.join(baseDirectory, filePath);
    const stat = await fs.stat(fullPath).catch(() => null);

    if (stat?.isDirectory()) {
      await fs.rm(fullPath, { recursive: true, force: true });
      result.filesDeleted++;
      await this.removeEmptyParentDirectories(fullPath, baseDirectory);
    } else if (stat?.isFile()) {
      await fs.unlink(fullPath);
      result.filesDeleted++;
      await this.removeEmptyParentDirectories(fullPath, baseDirectory);
    }
  }

  private isContentFile(filePath: string): boolean {
    return (
      (filePath.includes('.packmind/standards/') ||
        filePath.includes('.packmind/commands/') ||
        filePath.includes('.packmind/skills/') ||
        filePath.includes('.packmind/recipes/')) &&
      filePath.endsWith('.md')
    );
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private extractCommentMarker(content: string): string | null {
    const startMarkerPattern = /<!--\s*start:\s*([^-]+?)\s*-->/;
    const match = content.match(startMarkerPattern);
    return match ? match[1].trim() : null;
  }

  private mergeContentWithMarkers(
    existingContent: string,
    newContent: string,
    commentMarker: string,
  ): string {
    const startMarker = `<!-- start: ${commentMarker} -->`;
    const endMarker = `<!-- end: ${commentMarker} -->`;

    const newSectionPattern = new RegExp(
      `${this.escapeRegex(startMarker)}([\\s\\S]*?)${this.escapeRegex(endMarker)}`,
    );
    const newSectionMatch = newContent.match(newSectionPattern);
    const newSectionContent = newSectionMatch
      ? newSectionMatch[1].trim()
      : newContent;

    const existingSectionPattern = new RegExp(
      `${this.escapeRegex(startMarker)}[\\s\\S]*?${this.escapeRegex(endMarker)}`,
      'g',
    );

    if (existingSectionPattern.test(existingContent)) {
      return existingContent.replace(
        existingSectionPattern,
        `${startMarker}\n${newSectionContent}\n${endMarker}`,
      );
    } else {
      return `${existingContent}\n${startMarker}\n${newSectionContent}\n${endMarker}`;
    }
  }

  private isEffectivelyEmpty(content: string): boolean {
    const withoutEmptySections = content.replace(
      /<!--\s*start:\s*[^-]+?\s*-->\s*<!--\s*end:\s*[^-]+?\s*-->/g,
      '',
    );
    return withoutEmptySections.trim() === '';
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async deleteSkillFolders(
    baseDirectory: string,
    folders: string[],
  ): Promise<number> {
    let deletedFilesCount = 0;

    for (const folder of folders) {
      const fullPath = path.join(baseDirectory, folder);

      try {
        await fs.access(fullPath);
        const fileCount = await this.countFilesInDirectory(fullPath);
        await fs.rm(fullPath, { recursive: true, force: true });
        deletedFilesCount += fileCount;
        await this.removeEmptyParentDirectories(fullPath, baseDirectory);
      } catch {
        // Ignore errors if folder doesn't exist or can't be deleted
      }
    }

    return deletedFilesCount;
  }

  private async countFilesInDirectory(dirPath: string): Promise<number> {
    let count = 0;
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        count += await this.countFilesInDirectory(entryPath);
      } else {
        count++;
      }
    }

    return count;
  }

  private async isDirectoryEmpty(dirPath: string): Promise<boolean> {
    try {
      const entries = await fs.readdir(dirPath);
      return entries.length === 0;
    } catch {
      return false;
    }
  }

  private async removeEmptyParentDirectories(
    fullPath: string,
    baseDirectory: string,
  ): Promise<void> {
    const normalizedBase = path.resolve(baseDirectory);
    let currentDir = path.dirname(path.resolve(fullPath));

    while (
      currentDir.startsWith(normalizedBase + path.sep) &&
      currentDir !== normalizedBase
    ) {
      const isEmpty = await this.isDirectoryEmpty(currentDir);
      if (!isEmpty) break;

      try {
        await fs.rmdir(currentDir);
      } catch {
        break;
      }
      currentDir = path.dirname(currentDir);
    }
  }
}
