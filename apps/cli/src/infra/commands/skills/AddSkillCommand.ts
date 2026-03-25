import { command, string, option, optional, restPositionals } from 'cmd-ts';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import type { UploadSkillResult } from '../../../domain/useCases/IUploadSkillUseCase';
import {
  logSuccessConsole,
  logErrorConsole,
  logInfoConsole,
  logConsole,
  formatCommand,
} from '../../utils/consoleLogger';
import { originSkillOption } from '../sharedOptions';
import { resolveSkillInputPaths } from '../../../application/utils/resolveSkillInputPaths';

type AddSkillCommandArgs = {
  skillPaths: readonly string[];
  space?: string;
  originSkill?: string;
};

export type AddSkillCommandDependencies = {
  createPackmindCliHexa: () => Pick<PackmindCliHexa, 'uploadSkill'>;
  exit: (code: number) => void;
  getCwd: () => string;
};

function createDefaultDependencies(): AddSkillCommandDependencies {
  return {
    createPackmindCliHexa: () => {
      const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
      return new PackmindCliHexa(packmindLogger);
    },
    exit: process.exit,
    getCwd: () => process.cwd(),
  };
}

function logUploadStart(
  skillPath: string,
  totalPaths: number,
  index: number,
): void {
  if (totalPaths === 1) {
    logInfoConsole(`Uploading skill from ${skillPath}...`);
    return;
  }

  logInfoConsole(
    `Uploading skill ${index + 1}/${totalPaths} from ${skillPath}...`,
  );
}

async function confirmBatchUpload(skillPaths: string[]): Promise<boolean> {
  logConsole('');
  logConsole(`Import ${skillPaths.length} skill directories?`);
  skillPaths.forEach((skillPath) => {
    logConsole(`  • ${skillPath}`);
  });
  logConsole('\nContinue? (y/n)');

  return new Promise((resolve) => {
    process.stdin.once('data', (data: Buffer | string) => {
      const line = data.toString().trim();
      resolve(line.toLowerCase() === 'y' || line.toLowerCase() === 'yes');
    });
  });
}

function logUploadResult(result: UploadSkillResult): void {
  if (result.isNewSkill) {
    logSuccessConsole('Skill created successfully!');
  } else if (!result.versionCreated) {
    logInfoConsole(
      `Skill content is identical to version ${result.version}, no new version created.`,
    );
  } else {
    logSuccessConsole(`Skill updated to version ${result.version}!`);
  }

  logInfoConsole(`  Name: ${result.name}`);
  logInfoConsole(`  Version: ${result.version}`);
  logInfoConsole(`  Files: ${result.fileCount}`);
  logInfoConsole(`  Total size: ${(result.totalSize / 1024).toFixed(2)} KB`);
}

function logMultipleSpacesExample(skillPath: string): void {
  logConsole(
    `\nExample: ${formatCommand(`packmind-cli skills add --space <slug> ${skillPath}`)}`,
  );
}

function formatSkillDirectoryLabel(count: number): string {
  return count === 1 ? 'skill directory' : 'skill directories';
}

function logUploadSummary(successCount: number, failureCount: number): void {
  const totalPaths = successCount + failureCount;
  if (failureCount === 0) {
    logSuccessConsole(
      `Imported ${successCount} of ${totalPaths} ${formatSkillDirectoryLabel(totalPaths)} successfully.`,
    );
    return;
  }

  logErrorConsole(
    `Imported ${successCount} of ${totalPaths} ${formatSkillDirectoryLabel(totalPaths)} successfully; ${failureCount} failed.`,
  );
}

export async function addSkillHandler(
  args: AddSkillCommandArgs,
  deps: AddSkillCommandDependencies = createDefaultDependencies(),
): Promise<void> {
  if (args.skillPaths.length === 0) {
    logErrorConsole(
      'Missing skill path. Usage: packmind-cli skills add <path> [additional-paths...]',
    );
    deps.exit(1);
    return;
  }

  const packmindCliHexa = deps.createPackmindCliHexa();
  const resolvedSkillPaths = await resolveSkillInputPaths(
    args.skillPaths,
    deps.getCwd(),
  );

  if (resolvedSkillPaths.length === 0) {
    logErrorConsole(
      'No skill directories found in the provided paths. Usage: packmind-cli skills add <path> [additional-paths...]',
    );
    deps.exit(1);
    return;
  }

  if (resolvedSkillPaths.length > 1 && process.stdin.isTTY) {
    const confirmed = await confirmBatchUpload(resolvedSkillPaths);
    if (!confirmed) {
      logConsole('Import cancelled.');
      return;
    }
  }

  let successCount = 0;
  let failureCount = 0;

  for (const [index, skillPath] of resolvedSkillPaths.entries()) {
    try {
      logUploadStart(skillPath, resolvedSkillPaths.length, index);

      const result = await packmindCliHexa.uploadSkill({
        skillPath,
        originSkill: args.originSkill,
        spaceSlug: args.space,
      });

      logUploadResult(result);
      successCount += 1;
    } catch (error) {
      failureCount += 1;

      const message = error instanceof Error ? error.message : String(error);
      logErrorConsole(`Upload failed for ${skillPath}: ${message}`);

      if (message.includes('Multiple spaces found')) {
        logMultipleSpacesExample(skillPath);
      }
    }
  }

  if (resolvedSkillPaths.length > 1 || failureCount > 0) {
    logUploadSummary(successCount, failureCount);
  }

  if (failureCount > 0) {
    deps.exit(1);
  }
}

export const addSkillCommand = command({
  name: 'add',
  description:
    'Add one or more skills from local directories to a Packmind organization',
  args: {
    skillPaths: restPositionals({
      type: string,
      displayName: 'paths',
      description:
        'Skill directory paths containing SKILL.md (supports multiple paths)',
    }),
    space: option({
      long: 'space',
      description:
        'Slug of the space in which to add the skill (with or without leading @)',
      type: optional(string),
    }),
    originSkill: originSkillOption,
  },
  handler: async ({ skillPaths, space, originSkill }) =>
    addSkillHandler({
      skillPaths,
      space: space ?? undefined,
      originSkill,
    }),
});
