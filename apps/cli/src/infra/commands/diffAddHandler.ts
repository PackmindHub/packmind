import * as path from 'path';

import {
  ArtifactType,
  ChangeProposalType,
  MultiFileCodingAgent,
} from '@packmind/types';

import { resolveArtefactFromPath } from '../../application/utils/resolveArtefactFromPath';
import { parseCommandFile } from '../../application/utils/parseCommandFile';
import { parseStandardMdForAgent } from '../../application/utils/parseStandardMd';
import { openEditorForMessage, validateMessage } from '../utils/editorMessage';
import {
  logErrorConsole,
  logInfoConsole,
  logSuccessConsole,
  logWarningConsole,
} from '../utils/consoleLogger';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { ArtefactDiff } from '../../domain/useCases/IDiffArtefactsUseCase';

export type DiffAddHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  filePath: string | undefined;
  message: string | undefined;
  exit: (code: number) => void;
  getCwd: () => string;
  readFile: (path: string) => string;
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
      `Unsupported file path: ${absolutePath}. File must be in a recognized artefact directory (command or standard).`,
    );
    exit(1);
    return;
  }

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

  const diffResult = buildDiff(
    artefactResult.artifactType,
    content,
    absolutePath,
    artefactResult.codingAgent,
  );
  if (!diffResult.success) {
    logErrorConsole(diffResult.error);
    exit(1);
    return;
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

  const diff: ArtefactDiff = {
    ...diffResult.diff,
    filePath: absolutePath,
    spaceId: space.id,
  };

  const result = await packmindCliHexa.submitDiffs([[diff]], message);

  for (const err of result.errors) {
    logErrorConsole(`Failed to submit "${err.name}": ${err.message}`);
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
      error:
        'Failed to parse standard file: file content does not match any recognized standard format.',
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

function isErrnoException(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}
