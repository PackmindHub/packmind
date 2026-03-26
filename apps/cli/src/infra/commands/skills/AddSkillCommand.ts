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
import {
  addResolvedSkillPath,
  resolveSkillInputPaths,
} from '../../../application/utils/resolveSkillInputPaths';

type AddSkillCommandArgs = {
  skillPaths: readonly string[];
  space?: string;
  originSkill?: string;
};

type SkillPathResolutionFailure = {
  inputPath: string;
  message: string;
};

type ResolvedSkillPathsForUpload = {
  resolvedSkillPaths: string[];
  resolutionFailures: SkillPathResolutionFailure[];
};

type UploadBatchResult = {
  successCount: number;
  failureCount: number;
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
    const onData = (data: Buffer | string) => {
      process.stdin.removeListener('close', onClose);
      const line = data.toString().trim();
      resolve(line.toLowerCase() === 'y' || line.toLowerCase() === 'yes');
    };
    const onClose = () => {
      process.stdin.removeListener('data', onData);
      resolve(false);
    };
    process.stdin.once('data', onData);
    process.stdin.once('close', onClose);
  });
}

function logUploadResult(result: UploadSkillResult): void {
  if (result.isNewSkill) {
    logSuccessConsole('Skill created successfully!');
  } else if (result.versionCreated) {
    logSuccessConsole(`Skill updated to version ${result.version}!`);
  } else {
    logInfoConsole(
      `Skill content is identical to version ${result.version}, no new version created.`,
    );
  }

  logInfoConsole(`  Name: ${result.name}`);
  logInfoConsole(`  Version: ${result.version}`);
  logInfoConsole(`  Files: ${result.fileCount}`);
  logInfoConsole(`  Total size: ${(result.totalSize / 1024).toFixed(2)} KB`);
}

function logMultipleSpacesExample(skillPath: string): void {
  const commandText = `packmind-cli skills add --space <slug> ${skillPath}`;
  logConsole(`\nExample: ${formatCommand(commandText)}`);
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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isPermissionError(error: unknown): boolean {
  if (!(error instanceof Error) || !('code' in error)) {
    return false;
  }

  return error.code === 'EACCES' || error.code === 'EPERM';
}

async function resolveSkillPathsForUpload(
  inputPaths: readonly string[],
  cwd: string,
): Promise<ResolvedSkillPathsForUpload> {
  try {
    return {
      resolvedSkillPaths: await resolveSkillInputPaths(inputPaths, cwd),
      resolutionFailures: [],
    };
  } catch (error) {
    if (!isPermissionError(error)) {
      throw error;
    }

    const resolvedSkillPaths: string[] = [];
    const resolutionFailures: SkillPathResolutionFailure[] = [];
    const seenPaths = new Set<string>();

    for (const inputPath of inputPaths) {
      try {
        const resolvedPaths = await resolveSkillInputPaths([inputPath], cwd);

        for (const resolvedPath of resolvedPaths) {
          addResolvedSkillPath(resolvedSkillPaths, seenPaths, resolvedPath);
        }
      } catch (error) {
        if (!isPermissionError(error)) {
          throw error;
        }

        resolutionFailures.push({
          inputPath,
          message: getErrorMessage(error),
        });
      }
    }

    return {
      resolvedSkillPaths,
      resolutionFailures,
    };
  }
}

function logResolutionFailures(
  resolutionFailures: readonly SkillPathResolutionFailure[],
): void {
  for (const resolutionFailure of resolutionFailures) {
    logErrorConsole(
      `Skill discovery failed for ${resolutionFailure.inputPath}: ${resolutionFailure.message}`,
    );
  }
}

function exitWhenNoSkillPathsResolved(
  resolvedSkillPaths: readonly string[],
  resolutionFailures: readonly SkillPathResolutionFailure[],
  exit: (code: number) => void,
): boolean {
  if (resolvedSkillPaths.length > 0) {
    return false;
  }

  if (resolutionFailures.length > 0) {
    exit(1);
    return true;
  }

  logErrorConsole(
    'No skill directories found in the provided paths. Usage: packmind-cli skills add <path> [additional-paths...]',
  );
  exit(1);
  return true;
}

async function confirmBatchUploadIfNeeded(
  resolvedSkillPaths: readonly string[],
  resolutionFailures: readonly SkillPathResolutionFailure[],
  exit: (code: number) => void,
): Promise<boolean> {
  if (resolvedSkillPaths.length <= 1 || !process.stdin.isTTY) {
    return true;
  }

  if (await confirmBatchUpload([...resolvedSkillPaths])) {
    return true;
  }

  logConsole('Import cancelled.');

  if (resolutionFailures.length > 0) {
    exit(1);
  }

  return false;
}

async function uploadResolvedSkillPaths(
  resolvedSkillPaths: readonly string[],
  args: AddSkillCommandArgs,
  packmindCliHexa: Pick<PackmindCliHexa, 'uploadSkill'>,
  initialFailureCount: number,
): Promise<UploadBatchResult> {
  let successCount = 0;
  let failureCount = initialFailureCount;

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

      const message = getErrorMessage(error);
      logErrorConsole(`Upload failed for ${skillPath}: ${message}`);

      if (message.includes('Multiple spaces found')) {
        logMultipleSpacesExample(skillPath);
      }
    }
  }

  return { successCount, failureCount };
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

  const { resolvedSkillPaths, resolutionFailures } =
    await resolveSkillPathsForUpload(args.skillPaths, deps.getCwd());

  logResolutionFailures(resolutionFailures);

  if (
    exitWhenNoSkillPathsResolved(
      resolvedSkillPaths,
      resolutionFailures,
      deps.exit,
    )
  ) {
    return;
  }

  if (
    !(await confirmBatchUploadIfNeeded(
      resolvedSkillPaths,
      resolutionFailures,
      deps.exit,
    ))
  ) {
    return;
  }

  const packmindCliHexa = deps.createPackmindCliHexa();

  const { successCount, failureCount } = await uploadResolvedSkillPaths(
    resolvedSkillPaths,
    args,
    packmindCliHexa,
    resolutionFailures.length,
  );

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
