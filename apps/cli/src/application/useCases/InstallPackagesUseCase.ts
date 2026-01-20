import {
  IInstallPackagesCommand,
  IInstallPackagesResult,
  IInstallPackagesUseCase,
} from '../../domain/useCases/IInstallPackagesUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { mergeSectionsIntoFileContent } from '@packmind/node-utils';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  ALL_AGENTS,
  AGENT_SKILL_PATHS,
} from '../../domain/constants/AgentPaths';

export class InstallPackagesUseCase implements IInstallPackagesUseCase {
  constructor(private readonly packmindGateway: IPackmindGateway) {}

  public async execute(
    command: IInstallPackagesCommand,
  ): Promise<IInstallPackagesResult> {
    const baseDirectory = command.baseDirectory || process.cwd();

    const result: IInstallPackagesResult = {
      filesCreated: 0,
      filesUpdated: 0,
      filesDeleted: 0,
      errors: [],
      recipesCount: 0,
      standardsCount: 0,
      skillsCount: 0,
      skillsSyncedToAgents: 0,
    };

    // Track skill slugs for syncing to agent directories
    const skillSlugs = new Set<string>();
    // Fetch data from the gateway
    const response = await this.packmindGateway.getPullData({
      packagesSlugs: command.packagesSlugs,
      previousPackagesSlugs: command.previousPackagesSlugs,
    });

    // Deduplicate files by path (when multiple packages share standards/recipes)
    const uniqueFilesMap = new Map<
      string,
      {
        path: string;
        content?: string;
        sections?: { key: string; content: string }[];
      }
    >();

    for (const file of response.fileUpdates.createOrUpdate) {
      uniqueFilesMap.set(file.path, file);
    }

    const uniqueFiles = Array.from(uniqueFilesMap.values());

    // Count recipes, standards, and skills from the deduplicated files
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
      } else if (file.path.includes('.packmind/skills/')) {
        // Extract skill slug from path (e.g., ".packmind/skills/signal-capture/SKILL.md" -> "signal-capture")
        const skillSlug = this.extractSkillSlug(file.path);
        if (skillSlug) {
          skillSlugs.add(skillSlug);
        }
        if (file.path.endsWith('.md')) {
          result.skillsCount++;
        }
      }
    }

    try {
      // Process createOrUpdate files (deduplicated)
      for (const file of uniqueFiles) {
        try {
          await this.createOrUpdateFile(baseDirectory, file, result);
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          result.errors.push(
            `Failed to create/update ${file.path}: ${errorMsg}`,
          );
        }
      }

      // Process delete files
      for (const file of response.fileUpdates.delete) {
        try {
          await this.deleteFile(baseDirectory, file.path, result);
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          result.errors.push(`Failed to delete ${file.path}: ${errorMsg}`);
        }
      }

      // Sync skills to agent directories (.claude/skills, .github/skills)
      for (const skillSlug of skillSlugs) {
        try {
          const syncedCount = await this.syncSkillToAgentDirectories(
            baseDirectory,
            skillSlug,
          );
          result.skillsSyncedToAgents += syncedCount;
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          result.errors.push(
            `Failed to sync skill "${skillSlug}" to agent directories: ${errorMsg}`,
          );
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(`Failed to install packages: ${errorMsg}`);
    }

    return result;
  }

  private async createOrUpdateFile(
    baseDirectory: string,
    file: {
      path: string;
      content?: string;
      sections?: { key: string; content: string }[];
      isBase64?: boolean;
    },
    result: IInstallPackagesResult,
  ): Promise<void> {
    const fullPath = path.join(baseDirectory, file.path);
    const directory = path.dirname(fullPath);

    // Create directory if it doesn't exist
    await fs.mkdir(directory, { recursive: true });

    // Check if file exists
    const fileExists = await this.fileExists(fullPath);

    if (file.content !== undefined) {
      // Handle full content replacement
      await this.handleFullContentUpdate(
        fullPath,
        file.content,
        fileExists,
        result,
        file.isBase64,
      );
    } else if (file.sections !== undefined) {
      // Handle section-based update
      await this.handleSectionsUpdate(
        fullPath,
        file.sections,
        fileExists,
        result,
      );
    }
  }

  private async handleFullContentUpdate(
    fullPath: string,
    content: string,
    fileExists: boolean,
    result: IInstallPackagesResult,
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
      // Read existing file content
      const existingContent = await fs.readFile(fullPath, 'utf-8');

      // Extract comment marker from new content (if present)
      const commentMarker = this.extractCommentMarker(content);

      let finalContent: string;

      if (!commentMarker) {
        // No comment markers: replace entire file content
        finalContent = content;
      } else {
        // Has comment markers: intelligently merge with existing content
        finalContent = this.mergeContentWithMarkers(
          existingContent,
          content,
          commentMarker,
        );
      }

      // Only write and count as updated if content actually changed
      if (existingContent !== finalContent) {
        await fs.writeFile(fullPath, finalContent, 'utf-8');
        result.filesUpdated++;
      }
    } else {
      // Create new file
      await fs.writeFile(fullPath, content, 'utf-8');
      result.filesCreated++;
    }
  }

  private async handleSectionsUpdate(
    fullPath: string,
    sections: { key: string; content: string }[],
    fileExists: boolean,
    result: IInstallPackagesResult,
  ): Promise<void> {
    let currentContent = '';

    if (fileExists) {
      // Read existing file content
      currentContent = await fs.readFile(fullPath, 'utf-8');
    }

    // Merge all sections into the content using shared utility
    const mergedContent = mergeSectionsIntoFileContent(
      currentContent,
      sections,
    );

    // Only write and count if content actually changed
    if (currentContent !== mergedContent) {
      if (this.isEffectivelyEmpty(mergedContent) && fileExists) {
        // File is empty after section removal - delete it instead of writing empty content
        await fs.unlink(fullPath);
        result.filesDeleted++;
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
    result: IInstallPackagesResult,
  ): Promise<void> {
    const fullPath = path.join(baseDirectory, filePath);
    const stat = await fs.stat(fullPath).catch(() => null);

    if (stat?.isDirectory()) {
      await fs.rm(fullPath, { recursive: true, force: true });
      result.filesDeleted++;
    } else if (stat?.isFile()) {
      await fs.unlink(fullPath);
      result.filesDeleted++;
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extracts the comment marker from content if it's wrapped with HTML comments.
   * E.g., "<!-- start: Packmind recipes -->" returns "Packmind recipes"
   */
  private extractCommentMarker(content: string): string | null {
    const startMarkerPattern = /<!--\s*start:\s*([^-]+?)\s*-->/;
    const match = content.match(startMarkerPattern);
    return match ? match[1].trim() : null;
  }

  /**
   * Merges new content with existing content using comment markers.
   * If the section exists, replaces it; otherwise, appends it.
   */
  private mergeContentWithMarkers(
    existingContent: string,
    newContent: string,
    commentMarker: string,
  ): string {
    const startMarker = `<!-- start: ${commentMarker} -->`;
    const endMarker = `<!-- end: ${commentMarker} -->`;

    // Extract the section content from newContent (content between markers)
    const newSectionPattern = new RegExp(
      `${this.escapeRegex(startMarker)}([\\s\\S]*?)${this.escapeRegex(endMarker)}`,
    );
    const newSectionMatch = newContent.match(newSectionPattern);
    const newSectionContent = newSectionMatch
      ? newSectionMatch[1].trim()
      : newContent;

    // Check if the section exists in existing content
    const existingSectionPattern = new RegExp(
      `${this.escapeRegex(startMarker)}[\\s\\S]*?${this.escapeRegex(endMarker)}`,
      'g',
    );

    if (existingSectionPattern.test(existingContent)) {
      // Replace existing section
      return existingContent.replace(
        existingSectionPattern,
        `${startMarker}\n${newSectionContent}\n${endMarker}`,
      );
    } else {
      // Append new section
      return `${existingContent}\n${startMarker}\n${newSectionContent}\n${endMarker}`;
    }
  }

  /**
   * Checks if content is effectively empty (only whitespace and empty section markers).
   * This helps determine if a file should be deleted after section removal.
   */
  private isEffectivelyEmpty(content: string): boolean {
    // Remove all empty section markers (markers with only whitespace between them)
    const withoutEmptySections = content.replace(
      /<!--\s*start:\s*[^-]+?\s*-->\s*<!--\s*end:\s*[^-]+?\s*-->/g,
      '',
    );
    return withoutEmptySections.trim() === '';
  }

  /**
   * Escapes special regex characters in a string
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Extracts skill slug from a .packmind/skills path.
   * E.g., ".packmind/skills/signal-capture/SKILL.md" -> "signal-capture"
   */
  private extractSkillSlug(filePath: string): string | null {
    const match = filePath.match(/\.packmind\/skills\/([^/]+)\//);
    return match ? match[1] : null;
  }

  /**
   * Syncs a skill from .packmind/skills/{slug} to all agent directories.
   * Returns the number of agent directories synced.
   */
  private async syncSkillToAgentDirectories(
    baseDirectory: string,
    skillSlug: string,
  ): Promise<number> {
    const sourcePath = path.join(baseDirectory, '.packmind/skills', skillSlug);

    // Check if source skill directory exists
    const sourceExists = await this.fileExists(sourcePath);
    if (!sourceExists) {
      return 0;
    }

    let syncedCount = 0;

    for (const agent of ALL_AGENTS) {
      const targetPath = path.join(
        baseDirectory,
        AGENT_SKILL_PATHS[agent],
        skillSlug,
      );

      try {
        // Read all files from source directory
        const sourceFiles = await this.readDirectoryRecursive(sourcePath);

        // Create target directory
        await fs.mkdir(targetPath, { recursive: true });

        // Copy each file
        for (const file of sourceFiles) {
          const sourceFilePath = path.join(sourcePath, file.relativePath);
          const targetFilePath = path.join(targetPath, file.relativePath);
          const targetFileDir = path.dirname(targetFilePath);

          await fs.mkdir(targetFileDir, { recursive: true });
          await fs.copyFile(sourceFilePath, targetFilePath);
        }

        // Delete files in target that no longer exist in source
        const targetFiles = await this.readDirectoryRecursive(targetPath).catch(
          () => [],
        );
        const sourceRelativePaths = new Set(
          sourceFiles.map((f) => f.relativePath),
        );

        for (const targetFile of targetFiles) {
          if (!sourceRelativePaths.has(targetFile.relativePath)) {
            const targetFilePath = path.join(
              targetPath,
              targetFile.relativePath,
            );
            await fs.unlink(targetFilePath).catch(() => {
              // Ignore errors when deleting files
            });
          }
        }

        syncedCount++;
      } catch {
        // Continue with other agents even if one fails
      }
    }

    return syncedCount;
  }

  /**
   * Recursively reads all files in a directory.
   * Returns an array of objects with relativePath property.
   */
  private async readDirectoryRecursive(
    dirPath: string,
  ): Promise<{ relativePath: string }[]> {
    const files: { relativePath: string }[] = [];

    const readDir = async (currentPath: string, basePath: string) => {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(basePath, fullPath);

        if (entry.isDirectory()) {
          await readDir(fullPath, basePath);
        } else if (entry.isFile()) {
          files.push({ relativePath: relativePath.replace(/\\/g, '/') });
        }
      }
    };

    await readDir(dirPath, dirPath);
    return files;
  }
}
