import * as fs from 'fs/promises';
import * as path from 'path';
import {
  IUpdateLocalSkillCommand,
  IUpdateLocalSkillResult,
  IUpdateLocalSkillUseCase,
} from '../../domain/useCases/IUpdateLocalSkillUseCase';
import {
  AgentType,
  ALL_AGENTS,
  AGENT_SKILL_PATHS,
} from '../../domain/constants/AgentPaths';

type SkillFile = {
  relativePath: string;
  content: string;
  isBase64: boolean;
};

export interface IUpdateLocalSkillDependencies {
  pathExists: (path: string) => Promise<boolean>;
  readDirectory: (path: string) => Promise<SkillFile[]>;
  writeFile: (path: string, content: string | Buffer) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  readFile: (path: string) => Promise<string>;
  listFiles: (dirPath: string) => Promise<string[]>;
  mkdir: (path: string) => Promise<void>;
}

async function defaultPathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function defaultReadDirectory(dirPath: string): Promise<SkillFile[]> {
  const { readSkillDirectory } =
    await import('../../infra/utils/readSkillDirectory');
  const files = await readSkillDirectory(dirPath);
  return files.map((f) => ({
    relativePath: f.relativePath,
    content: f.content,
    isBase64: f.isBase64,
  }));
}

async function defaultWriteFile(
  filePath: string,
  content: string | Buffer,
): Promise<void> {
  await fs.writeFile(filePath, content);
}

async function defaultDeleteFile(filePath: string): Promise<void> {
  await fs.unlink(filePath);
}

async function defaultReadFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8');
}

async function defaultListFiles(dirPath: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(currentPath: string, basePath: string) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath, basePath);
      } else if (entry.isFile()) {
        const relativePath = path.relative(basePath, fullPath);
        files.push(relativePath.replace(/\\/g, '/'));
      }
    }
  }

  await walk(dirPath, dirPath);
  return files;
}

async function defaultMkdir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

function validateSkillName(skillName: string): void {
  if (!skillName || skillName.trim() === '') {
    throw new Error('Skill name cannot be empty');
  }

  if (skillName.includes('/') || skillName.includes('\\')) {
    throw new Error('Skill name cannot contain path separators');
  }

  if (skillName === '.' || skillName === '..') {
    throw new Error('Skill name cannot be "." or ".."');
  }
}

export class UpdateLocalSkillUseCase implements IUpdateLocalSkillUseCase {
  private readonly deps: IUpdateLocalSkillDependencies;

  constructor(deps?: Partial<IUpdateLocalSkillDependencies>) {
    this.deps = {
      pathExists: deps?.pathExists ?? defaultPathExists,
      readDirectory: deps?.readDirectory ?? defaultReadDirectory,
      writeFile: deps?.writeFile ?? defaultWriteFile,
      deleteFile: deps?.deleteFile ?? defaultDeleteFile,
      readFile: deps?.readFile ?? defaultReadFile,
      listFiles: deps?.listFiles ?? defaultListFiles,
      mkdir: deps?.mkdir ?? defaultMkdir,
    };
  }

  async execute(
    command: IUpdateLocalSkillCommand,
  ): Promise<IUpdateLocalSkillResult> {
    validateSkillName(command.skillName);

    // Check if skill is Packmind-managed (exists in .packmind/skills/)
    const packmindSkillPath = path.join(
      command.baseDirectory,
      '.packmind/skills',
      command.skillName,
    );
    const isPackmindManaged = await this.deps.pathExists(packmindSkillPath);

    if (!isPackmindManaged) {
      return {
        updatedPaths: [],
        notFoundPaths: [],
        filesUpdated: 0,
        filesCreated: 0,
        filesDeleted: 0,
        errors: [],
        skippedAsUserCreated: true,
      };
    }

    const sourceExists = await this.deps.pathExists(command.sourcePath);
    if (!sourceExists) {
      throw new Error(`Source path does not exist: ${command.sourcePath}`);
    }

    const skillMdPath = path.join(command.sourcePath, 'SKILL.md');
    const skillMdExists = await this.deps.pathExists(skillMdPath);
    if (!skillMdExists) {
      throw new Error(
        `Source path must contain SKILL.md: ${command.sourcePath}`,
      );
    }

    const sourceFiles = await this.deps.readDirectory(command.sourcePath);
    const agents: AgentType[] = command.agents ?? ALL_AGENTS;

    const updatedPaths: string[] = [];
    const notFoundPaths: string[] = [];
    const errors: string[] = [];
    let totalFilesUpdated = 0;
    let totalFilesCreated = 0;
    let totalFilesDeleted = 0;

    for (const agent of agents) {
      const skillPath = path.join(
        command.baseDirectory,
        AGENT_SKILL_PATHS[agent],
        command.skillName,
      );

      try {
        const exists = await this.deps.pathExists(skillPath);

        if (!exists) {
          notFoundPaths.push(skillPath);
          continue;
        }

        const existingFiles = await this.deps.listFiles(skillPath);
        const sourceRelativePaths = new Set(
          sourceFiles.map((f) => f.relativePath),
        );

        // Delete files that no longer exist in source
        for (const existingFile of existingFiles) {
          if (!sourceRelativePaths.has(existingFile)) {
            const filePath = path.join(skillPath, existingFile);
            await this.deps.deleteFile(filePath);
            totalFilesDeleted++;
          }
        }

        // Update or create files from source
        const existingFilesSet = new Set(existingFiles);
        for (const sourceFile of sourceFiles) {
          const targetFilePath = path.join(skillPath, sourceFile.relativePath);
          const targetDir = path.dirname(targetFilePath);

          await this.deps.mkdir(targetDir);

          const fileExists = existingFilesSet.has(sourceFile.relativePath);

          if (sourceFile.isBase64) {
            const buffer = Buffer.from(sourceFile.content, 'base64');
            await this.deps.writeFile(targetFilePath, buffer);
          } else {
            // Check if content changed for text files
            if (fileExists) {
              const existingContent = await this.deps.readFile(targetFilePath);
              if (existingContent === sourceFile.content) {
                continue; // Skip unchanged files
              }
            }
            await this.deps.writeFile(targetFilePath, sourceFile.content);
          }

          if (fileExists) {
            totalFilesUpdated++;
          } else {
            totalFilesCreated++;
          }
        }

        updatedPaths.push(skillPath);
      } catch (error) {
        errors.push(
          `Failed to update ${skillPath}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return {
      updatedPaths,
      notFoundPaths,
      filesUpdated: totalFilesUpdated,
      filesCreated: totalFilesCreated,
      filesDeleted: totalFilesDeleted,
      errors,
      skippedAsUserCreated: false,
    };
  }
}
