import { IUseCase, PackmindCommand } from '../../UseCase';
import { CodingAgent } from '../../coding-agent/CodingAgent';
import { FileUpdates } from '../FileUpdates';
import { PackmindLockFileEntry } from '../PackmindLockFile';

export type DeployDefaultSkillsCommand = PackmindCommand & {
  cliVersion?: string;
  includeBeta?: boolean;
  excludeDeprecated?: boolean;
  // Optional agents to generate skills for (overrides org-level config when present)
  agents?: CodingAgent[];
};

export type DeployDefaultSkillsResponse = {
  fileUpdates: FileUpdates;
  skippedSkillsCount: number;
  /**
   * Default-skill slice of the lockfile `artifacts` map, keyed as
   * `default:${type}:${slug}`. The CLI merges this slice into the local
   * `packmind-lock.json` without touching user-authored or package-distributed
   * entries.
   */
  lockFileSlice: Record<string, PackmindLockFileEntry>;
};

export type IDeployDefaultSkillsUseCase = IUseCase<
  DeployDefaultSkillsCommand,
  DeployDefaultSkillsResponse
>;
