import * as fs from 'fs/promises';
import * as path from 'path';
import {
  IDeleteLocalSkillCommand,
  IDeleteLocalSkillResult,
  IDeleteLocalSkillUseCase,
} from '../../domain/useCases/IDeleteLocalSkillUseCase';
import {
  AgentType,
  ALL_AGENTS,
  AGENT_SKILL_PATHS,
} from '../../domain/constants/AgentPaths';

export interface IDeleteLocalSkillDependencies {
  pathExists: (path: string) => Promise<boolean>;
  deleteDirectory: (path: string) => Promise<void>;
}

async function defaultPathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function defaultDeleteDirectory(targetPath: string): Promise<void> {
  await fs.rm(targetPath, { recursive: true, force: true });
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

export class DeleteLocalSkillUseCase implements IDeleteLocalSkillUseCase {
  private readonly deps: IDeleteLocalSkillDependencies;

  constructor(deps?: Partial<IDeleteLocalSkillDependencies>) {
    this.deps = {
      pathExists: deps?.pathExists ?? defaultPathExists,
      deleteDirectory: deps?.deleteDirectory ?? defaultDeleteDirectory,
    };
  }

  async execute(
    command: IDeleteLocalSkillCommand,
  ): Promise<IDeleteLocalSkillResult> {
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
        deletedPaths: [],
        notFoundPaths: [],
        errors: [],
        skippedAsUserCreated: true,
      };
    }

    const agents: AgentType[] = command.agents ?? ALL_AGENTS;
    const deletedPaths: string[] = [];
    const notFoundPaths: string[] = [];
    const errors: string[] = [];

    for (const agent of agents) {
      const skillPath = path.join(
        command.baseDirectory,
        AGENT_SKILL_PATHS[agent],
        command.skillName,
      );

      try {
        const exists = await this.deps.pathExists(skillPath);

        if (exists) {
          await this.deps.deleteDirectory(skillPath);
          deletedPaths.push(skillPath);
        } else {
          notFoundPaths.push(skillPath);
        }
      } catch (error) {
        errors.push(
          `Failed to delete ${skillPath}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return {
      deletedPaths,
      notFoundPaths,
      errors,
      skippedAsUserCreated: false,
    };
  }
}
