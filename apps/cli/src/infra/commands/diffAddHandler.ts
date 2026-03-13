import * as path from 'path';

import {
  ArtifactType,
  ChangeProposalType,
  MultiFileCodingAgent,
  TargetId,
} from '@packmind/types';

import { resolveArtefactFromPath } from '../../application/utils/resolveArtefactFromPath';
import { parseCommandFile } from '../../application/utils/parseCommandFile';
import { parseStandardMdForAgent } from '../../application/utils/parseStandardMd';
import { parseSkillDirectory } from '../../application/utils/parseSkillDirectory';
import { openEditorForMessage, validateMessage } from '../utils/editorMessage';
import {
  logErrorConsole,
  logInfoConsole,
  logSuccessConsole,
  logWarningConsole,
} from '../utils/consoleLogger';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { ArtefactDiff } from '../../domain/useCases/IDiffArtefactsUseCase';
import { findNearestConfigDir } from '../../application/utils/findNearestConfigDir';

type SkillFile = {
  path: string;
  relativePath: string;
  content: string;
  size: number;
  permissions: string;
  isBase64: boolean;
};

export type DiffAddHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  filePath: string | undefined;
  message: string | undefined;
  exit: (code: number) => void;
  getCwd: () => string;
  readFile: (path: string) => string;
  readSkillDirectory: (dirPath: string) => Promise<SkillFile[]>;
};

export async function diffAddHandler(
  deps: DiffAddHandlerDependencies,
): Promise<void> {
  const {
    packmindCliHexa,
    filePath,
    message: messageFlag,
    exit,
    getCwd,
    readFile,
    readSkillDirectory,
  } = deps;

  if (!filePath) {
    logErrorConsole('Missing file path. Usage: packmind-cli diff add <path>');
    exit(1);
    return;
  }

  const absolutePath = path.resolve(getCwd(), filePath);

  const artefactResult = resolveArtefactFromPath(absolutePath);
  if (!artefactResult) {
    logErrorConsole(
      `Unsupported file path: ${absolutePath}. File must be in a recognized artefact directory (command, standard, or skill).`,
    );
    exit(1);
    return;
  }

  let diffResult: BuildDiffSuccess;

  if (artefactResult.artifactType === 'skill') {
    const dirPath = absolutePath.endsWith('SKILL.md')
      ? path.dirname(absolutePath)
      : absolutePath;

    let files: SkillFile[];
    try {
      files = await readSkillDirectory(dirPath);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logErrorConsole(`Failed to read skill directory: ${errorMessage}`);
      exit(1);
      return;
    }

    const parseResult = parseSkillDirectory(files);
    if (!parseResult.success) {
      logErrorConsole(parseResult.error);
      exit(1);
      return;
    }

    diffResult = {
      success: true,
      diff: {
        type: ChangeProposalType.createSkill,
        payload: parseResult.payload,
        artifactName: parseResult.payload.name,
        artifactType: 'skill',
      },
    };
  } else {
    let content: string;
    try {
      content = readFile(absolutePath);
    } catch (err) {
      if (isErrnoException(err) && err.code === 'EISDIR') {
        logErrorConsole(
          `Path is a directory, not a file: ${absolutePath}. Please provide a path to an artefact file.`,
        );
      } else {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logErrorConsole(`Failed to read file: ${errorMessage}`);
      }
      exit(1);
      return;
    }

    const buildResult = buildDiff(
      artefactResult.artifactType,
      content,
      absolutePath,
      artefactResult.codingAgent,
    );
    if (!buildResult.success) {
      logErrorConsole(buildResult.error);
      exit(1);
      return;
    }
    diffResult = buildResult;
  }

  let message: string;
  if (messageFlag !== undefined) {
    const validation = validateMessage(messageFlag);
    if (!validation.valid) {
      logErrorConsole(validation.error);
      exit(1);
      return;
    }
    message = validation.message;
  } else if (process.stdin.isTTY) {
    const editorMessage = openEditorForMessage();
    const validation = validateMessage(editorMessage);
    if (!validation.valid) {
      logErrorConsole(
        'Aborting submission: empty message. Use -m to provide a message.',
      );
      exit(1);
      return;
    }
    message = validation.message;
  } else {
    logErrorConsole(
      'Non-interactive mode requires -m flag. Usage: packmind-cli diff add <path> -m "your message"',
    );
    exit(1);
    return;
  }

  const space = await packmindCliHexa.getPackmindGateway().spaces.getGlobal();

  // Infer target directory from the file path (walk up to nearest packmind.json)
  const fileDir =
    artefactResult.artifactType === 'skill'
      ? absolutePath.endsWith('SKILL.md')
        ? path.dirname(path.dirname(absolutePath))
        : path.dirname(absolutePath)
      : path.dirname(absolutePath);

  const targetDir = await findNearestConfigDir(fileDir, packmindCliHexa);
  if (!targetDir) {
    logErrorConsole(
      'Not inside a Packmind project. No packmind.json found in any parent directory.',
    );
    exit(1);
    return;
  }

  // Try to resolve targetId from git context (best-effort, non-blocking)
  let targetId: TargetId | undefined;
  try {
    const fullConfig = await packmindCliHexa.readFullConfig(targetDir);
    const configPackages = fullConfig ? Object.keys(fullConfig.packages) : [];
    const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(targetDir);
    if (gitRoot && configPackages.length > 0) {
      const gitRemoteUrl = packmindCliHexa.getGitRemoteUrlFromPath(gitRoot);
      const gitBranch = packmindCliHexa.getCurrentBranch(gitRoot);
      const rel = path.relative(gitRoot, targetDir);
      const relativePath = rel.startsWith('..') ? '/' : rel ? `/${rel}/` : '/';
      const deployedContent = await packmindCliHexa
        .getPackmindGateway()
        .deployment.getDeployed({
          packagesSlugs: configPackages,
          gitRemoteUrl,
          gitBranch,
          relativePath,
          agents: fullConfig?.agents,
        });
      targetId = deployedContent.targetId as TargetId | undefined;
    }
  } catch {
    // Proceed without targetId if git context is unavailable
  }

  const diff: ArtefactDiff = {
    ...diffResult.diff,
    filePath: absolutePath,
    spaceId: space.id,
    targetId,
  };

  const result = await packmindCliHexa.submitDiffs([[diff]], message);

  for (const err of result.errors) {
    logErrorConsole(`Failed to submit addition "${err.name}": ${err.message}`);
  }

  const summaryParts: string[] = [];
  if (result.submitted > 0) {
    summaryParts.push(`${result.submitted} submitted`);
  }
  if (result.alreadySubmitted > 0) {
    summaryParts.push(`${result.alreadySubmitted} already submitted`);
  }
  if (result.errors.length > 0) {
    const errorWord = result.errors.length === 1 ? 'error' : 'errors';
    summaryParts.push(`${result.errors.length} ${errorWord}`);
  }

  if (summaryParts.length > 0) {
    const summaryMessage = `Summary: ${summaryParts.join(', ')}`;
    if (result.errors.length === 0 && result.alreadySubmitted === 0) {
      logSuccessConsole(summaryMessage);
    } else if (
      (result.errors.length > 0 && result.submitted > 0) ||
      result.alreadySubmitted > 0
    ) {
      logWarningConsole(summaryMessage);
    } else {
      logErrorConsole(summaryMessage);
    }
  }

  if (result.submitted > 0) {
    const truncatedMessage =
      message.length > 50 ? message.slice(0, 50) + '...' : message;
    logInfoConsole(`Message: "${truncatedMessage}"`);
  }

  if (result.errors.length > 0) {
    exit(1);
    return;
  }

  exit(0);
}

type BuildDiffSuccess = {
  success: true;
  diff: Pick<
    ArtefactDiff,
    'type' | 'payload' | 'artifactName' | 'artifactType'
  >;
};

type BuildDiffFailure = {
  success: false;
  error: string;
};

function buildDiff(
  artifactType: ArtifactType,
  content: string,
  filePath: string,
  codingAgent: MultiFileCodingAgent,
): BuildDiffSuccess | BuildDiffFailure {
  if (artifactType === 'command') {
    const parseResult = parseCommandFile(content, filePath);
    if (!parseResult.success) {
      return {
        success: false,
        error: `Failed to parse command file: ${parseResult.error}`,
      };
    }
    return {
      success: true,
      diff: {
        type: ChangeProposalType.createCommand,
        payload: {
          name: parseResult.parsed.name,
          content: parseResult.parsed.content,
        },
        artifactName: parseResult.parsed.name,
        artifactType: 'command',
      },
    };
  }

  const parsed = parseStandardMdForAgent(content, codingAgent);
  if (!parsed) {
    return {
      success: false,
      error: `File format is invalid. It should be formatted like:\n\n${getStandardFormatExample(codingAgent)}`,
    };
  }

  if (parsed.rules.length === 0) {
    return {
      success: false,
      error: `Standard has no rules. Add at least one rule, formatted like:\n\n${getStandardFormatExample(codingAgent)}`,
    };
  }

  return {
    success: true,
    diff: {
      type: ChangeProposalType.createStandard,
      payload: {
        name: parsed.name,
        description: parsed.description,
        scope: parsed.scope || null,
        rules: parsed.rules.map((r) => ({ content: r })),
      },
      artifactName: parsed.name,
      artifactType: 'standard',
    },
  };
}

function getStandardFormatExample(agent: MultiFileCodingAgent): string {
  if (agent === 'packmind') {
    return '# <name>\n\n<description>\n\n## Rules\n\n* <rule 1>\n* <rule 2>';
  }
  return '## Standard: <name>\n\n<description>\n\n* <rule 1>\n* <rule 2>';
}

function isErrnoException(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}
