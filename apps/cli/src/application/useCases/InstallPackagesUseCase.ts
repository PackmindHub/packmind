import {
  IInstallPackagesCommand,
  IInstallPackagesResult,
  IInstallPackagesUseCase,
} from '../../domain/useCases/IInstallPackagesUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { mergeSectionsIntoFileContent } from '@packmind/node-utils';
import * as fs from 'fs/promises';
import * as path from 'path';

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
    };
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

    // Count recipes and standards from the deduplicated files
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
  ): Promise<void> {
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
      await fs.writeFile(fullPath, mergedContent, 'utf-8');

      if (fileExists) {
        result.filesUpdated++;
      } else {
        result.filesCreated++;
      }
    }
  }

  private async deleteFile(
    baseDirectory: string,
    filePath: string,
    result: IInstallPackagesResult,
  ): Promise<void> {
    const fullPath = path.join(baseDirectory, filePath);

    // Check if file exists before attempting to delete
    const fileExists = await this.fileExists(fullPath);

    if (fileExists) {
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
   * Escapes special regex characters in a string
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
