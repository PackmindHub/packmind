import {
  IPullDataCommand,
  IPullDataResult,
  IPullDataUseCase,
} from '../../domain/useCases/IPullDataUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import * as fs from 'fs/promises';
import * as path from 'path';

export class PullDataUseCase implements IPullDataUseCase {
  constructor(private readonly packmindGateway: IPackmindGateway) {}

  public async execute(command: IPullDataCommand): Promise<IPullDataResult> {
    const baseDirectory = command.baseDirectory || process.cwd();

    const result: IPullDataResult = {
      filesCreated: 0,
      filesUpdated: 0,
      filesDeleted: 0,
      errors: [],
    };
    // Fetch data from the gateway
    const response = await this.packmindGateway.getPullData({
      packagesSlugs: command.packagesSlugs,
    });

    try {
      // Process createOrUpdate files
      for (const file of response.fileUpdates.createOrUpdate) {
        try {
          await this.createOrUpdateFile(
            baseDirectory,
            file.path,
            file.content,
            result,
          );
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
      result.errors.push(`Failed to pull data: ${errorMsg}`);
    }

    return result;
  }

  private async createOrUpdateFile(
    baseDirectory: string,
    filePath: string,
    content: string,
    result: IPullDataResult,
  ): Promise<void> {
    const fullPath = path.join(baseDirectory, filePath);
    const directory = path.dirname(fullPath);

    // Create directory if it doesn't exist
    await fs.mkdir(directory, { recursive: true });

    // Check if file exists
    const fileExists = await this.fileExists(fullPath);

    if (fileExists) {
      // Append to existing file
      await fs.appendFile(fullPath, content, 'utf-8');
      result.filesUpdated++;
    } else {
      // Create new file
      await fs.writeFile(fullPath, content, 'utf-8');
      result.filesCreated++;
    }
  }

  private async deleteFile(
    baseDirectory: string,
    filePath: string,
    result: IPullDataResult,
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
}
