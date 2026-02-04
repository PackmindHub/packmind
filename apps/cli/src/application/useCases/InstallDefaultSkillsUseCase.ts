import {
  IInstallDefaultSkillsCommand,
  IInstallDefaultSkillsResult,
  IInstallDefaultSkillsUseCase,
} from '../../domain/useCases/IInstallDefaultSkillsUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import * as fs from 'fs/promises';
import * as path from 'path';

export class InstallDefaultSkillsUseCase implements IInstallDefaultSkillsUseCase {
  constructor(private readonly packmindGateway: IPackmindGateway) {}

  public async execute(
    command: IInstallDefaultSkillsCommand,
  ): Promise<IInstallDefaultSkillsResult> {
    const baseDirectory = command.baseDirectory || process.cwd();

    const result: IInstallDefaultSkillsResult = {
      filesCreated: 0,
      filesUpdated: 0,
      errors: [],
    };

    // Fetch default skills from the gateway
    // Note: userId and organizationId are extracted from the API key by the gateway
    const response = await this.packmindGateway.skills.getDefaults({
      cliVersion: command.cliVersion,
      includeBeta: command.includeBeta,
    });

    try {
      // Process createOrUpdate files
      for (const file of response.fileUpdates.createOrUpdate) {
        try {
          if (file.content) {
            await this.createOrUpdateFile(baseDirectory, file, result);
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          result.errors.push(
            `Failed to create/update ${file.path}: ${errorMsg}`,
          );
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(`Failed to install default skills: ${errorMsg}`);
    }

    return result;
  }

  private async createOrUpdateFile(
    baseDirectory: string,
    file: {
      path: string;
      content: string;
    },
    result: IInstallDefaultSkillsResult,
  ): Promise<void> {
    const fullPath = path.join(baseDirectory, file.path);
    const directory = path.dirname(fullPath);

    // Create directory if it doesn't exist
    await fs.mkdir(directory, { recursive: true });

    // Check if file exists
    const fileExists = await this.fileExists(fullPath);

    if (fileExists) {
      // Read existing file content
      const existingContent = await fs.readFile(fullPath, 'utf-8');

      // Only write and count as updated if content actually changed
      if (existingContent !== file.content) {
        await fs.writeFile(fullPath, file.content, 'utf-8');
        result.filesUpdated++;
      }
    } else {
      // Create new file
      await fs.writeFile(fullPath, file.content, 'utf-8');
      result.filesCreated++;
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
}
