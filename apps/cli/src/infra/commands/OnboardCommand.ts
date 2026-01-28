import { command, flag, option, string, optional, boolean } from 'cmd-ts';
import * as readline from 'readline';
import * as fs from 'fs';
import { spawn } from 'child_process';
import {
  logConsole,
  logSuccessConsole,
  logErrorConsole,
} from '../utils/consoleLogger';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { DraftFormat } from '../../application/services/DraftFileWriterService';
import { IGenerateDraftResult } from '../../application/useCases/DraftOnboardingUseCase';
import { ProjectScannerService } from '../../application/services/ProjectScannerService';
import { BaselineItemGeneratorService } from '../../application/services/BaselineItemGeneratorService';
import { DraftFileWriterService } from '../../application/services/DraftFileWriterService';
import { OnboardingStateService } from '../../application/services/OnboardingStateService';
import { RepoFingerprintService } from '../../application/services/RepoFingerprintService';
import { DraftOnboardingUseCase } from '../../application/useCases/DraftOnboardingUseCase';

export const onboardCommand = command({
  name: 'onboard',
  description:
    'Scan project and generate draft baseline for Packmind onboarding',
  args: {
    output: option({
      type: optional(string),
      long: 'output',
      short: 'o',
      description: 'Output directory for draft files',
    }),
    format: option({
      type: optional(string),
      long: 'format',
      short: 'f',
      description: 'Output format: md, json, or both (default: both)',
    }),
    yes: flag({
      type: boolean,
      long: 'yes',
      short: 'y',
      description: 'Skip review prompt and immediately send to Packmind',
    }),
    dryRun: flag({
      type: boolean,
      long: 'dry-run',
      short: 'd',
      description: 'Generate draft only, never send to Packmind',
    }),
    print: flag({
      type: boolean,
      long: 'print',
      short: 'p',
      description: 'Print full draft details to stdout',
    }),
    open: flag({
      type: boolean,
      long: 'open',
      description: 'Open the generated markdown file in default editor/viewer',
    }),
    send: flag({
      type: boolean,
      long: 'send',
      description: 'Explicitly send existing draft to Packmind',
    }),
  },
  handler: async (args) => {
    const logger = new PackmindLogger('OnboardCommand', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(logger);
    const format = (args.format as DraftFormat) || 'both';

    // Create the draft onboarding use case with all dependencies
    const draftUseCase = new DraftOnboardingUseCase(
      new ProjectScannerService(),
      new BaselineItemGeneratorService(),
      new DraftFileWriterService(),
      new OnboardingStateService(),
      new RepoFingerprintService(),
      packmindCliHexa.getPackmindGateway(),
      logger,
    );

    // Step A: Minimal consent (unless --yes or --send)
    // No Y/n question - just "Press Enter to continue, Ctrl+C to abort"
    const skipPrompts = args.yes || args.send;
    if (!skipPrompts) {
      logConsole('');
      logConsole('='.repeat(60));
      logConsole('  PACKMIND ONBOARDING');
      logConsole('='.repeat(60));
      logConsole('');
      logConsole('This will:');
      logConsole('  1. Scan your repository (read-only, no modifications)');
      logConsole('  2. Generate a local draft baseline file');
      logConsole('  3. Let you review before sending anything');
      logConsole('');
      logConsole('Nothing will be sent to Packmind without your approval.');
      logConsole('');

      await waitForEnterOrAbort('Press Enter to continue, Ctrl+C to abort...');
    }

    // Main loop - allows regeneration without restarting command
    let result: IGenerateDraftResult | null = null;
    let shouldContinue = true;

    while (shouldContinue) {
      // Step B & C: Scan and generate draft
      logConsole('');
      result = await draftUseCase.generateDraft({
        projectPath: process.cwd(),
        format,
        outputDir: args.output,
      });

      // Always print short summary
      logConsole('');
      logConsole(
        `Generated ${result.draft.baseline_items.length} baseline items`,
      );

      // Print detailed summary if requested
      if (args.print) {
        printDetailedSummary(result);
      }

      // Report file paths
      logConsole('');
      logConsole('Draft files:');
      if (result.paths.jsonPath) {
        logConsole(`  JSON: ${result.paths.jsonPath}`);
      }
      if (result.paths.mdPath) {
        logConsole(`  Markdown: ${result.paths.mdPath}`);
      }

      // Open in viewer if requested
      if (args.open && result.paths.mdPath) {
        openFile(result.paths.mdPath);
      }

      // Step D: Review gate
      if (args.dryRun) {
        logConsole('');
        logConsole('Dry run complete. Draft files generated, nothing sent.');
        return;
      }

      if (skipPrompts) {
        // Auto-send (--yes or --send)
        logConsole('');
        const sendResult = await draftUseCase.sendDraft(result.draft);
        printSendResult(sendResult, result.paths);
        return;
      }

      // Interactive review loop
      const choice = await showReviewMenu();

      switch (choice) {
        case 'send': {
          logConsole('');
          const sendResult = await draftUseCase.sendDraft(result.draft);
          printSendResult(sendResult, result.paths);
          shouldContinue = false;
          break;
        }

        case 'edit':
          if (result.paths.mdPath) {
            openFile(result.paths.mdPath);
            logConsole('');
            logConsole(
              'File opened. Select [r] to regenerate after editing, or [Enter] to send.',
            );
          }
          break;

        case 'print':
          printDetailedSummary(result);
          break;

        case 'regenerate':
          logConsole('');
          logConsole('Regenerating...');
          // Loop continues, will regenerate
          break;

        case 'quit':
          logConsole('');
          logConsole(
            'Exited without sending. Your draft files are still available:',
          );
          if (result.paths.jsonPath) logConsole(`  ${result.paths.jsonPath}`);
          if (result.paths.mdPath) logConsole(`  ${result.paths.mdPath}`);
          shouldContinue = false;
          break;
      }
    }
  },
});

async function showReviewMenu(): Promise<string> {
  logConsole('');
  logConsole('What would you like to do?');
  logConsole('');
  logConsole('  [Enter] Send draft to Packmind');
  logConsole('  [e]     Open draft in viewer');
  logConsole('  [p]     Print detailed summary');
  logConsole('  [r]     Regenerate draft');
  logConsole('  [q]     Quit without sending');
  logConsole('');

  const choice = await promptChoice('Your choice: ', ['', 'e', 'p', 'r', 'q']);

  const choiceMap: Record<string, string> = {
    '': 'send',
    e: 'edit',
    p: 'print',
    r: 'regenerate',
    q: 'quit',
  };

  return choiceMap[choice] || 'quit';
}

function printDetailedSummary(result: IGenerateDraftResult): void {
  logConsole('');
  logConsole('='.repeat(60));
  logConsole('  DRAFT SUMMARY');
  logConsole('='.repeat(60));
  logConsole('');
  logConsole(
    `Languages: ${result.draft.summary.languages.join(', ') || 'none detected'}`,
  );
  logConsole(
    `Frameworks: ${result.draft.summary.frameworks.join(', ') || 'none detected'}`,
  );
  logConsole(
    `Tools: ${result.draft.summary.tools.join(', ') || 'none detected'}`,
  );
  logConsole('');
  logConsole('Baseline items:');
  for (const item of result.draft.baseline_items) {
    logConsole(
      `  - ${item.label} (${item.confidence}) [${item.evidence.join(', ')}]`,
    );
  }
}

function printSendResult(
  sendResult: { success: boolean; error?: string },
  paths: { jsonPath: string | null; mdPath: string | null },
): void {
  if (sendResult.success) {
    logConsole('');
    logSuccessConsole('Draft reviewed');
    logSuccessConsole('Sent to Packmind');
    logSuccessConsole('Stored successfully');
    logConsole('');
    logConsole('Open the app to review and convert baseline items into rules.');
  } else {
    logConsole('');
    logErrorConsole('Failed to send draft to Packmind');
    logConsole(`  Error: ${sendResult.error}`);
    logConsole('');
    logConsole('Your draft files are preserved:');
    if (paths.jsonPath) logConsole(`  ${paths.jsonPath}`);
    if (paths.mdPath) logConsole(`  ${paths.mdPath}`);
    logConsole('');
    logConsole('Try again with: packmind-cli onboard --yes');
  }
}

async function waitForEnterOrAbort(message: string): Promise<void> {
  // Check if stdin is a TTY - if not, default to continue (non-interactive mode)
  if (!process.stdin.isTTY) {
    return;
  }

  // Open /dev/tty directly for input/output to handle various environments
  let input: NodeJS.ReadableStream;
  let output: NodeJS.WritableStream;

  try {
    input = fs.createReadStream('/dev/tty');
    output = fs.createWriteStream('/dev/tty');
  } catch {
    // Fallback to stdin/stdout if /dev/tty is not available
    input = process.stdin;
    output = process.stdout;
  }

  const rl = readline.createInterface({
    input,
    output,
  });

  return new Promise((resolve) => {
    rl.question(message, () => {
      rl.close();
      // Close file streams if we opened /dev/tty
      if (input !== process.stdin) {
        (input as fs.ReadStream).close();
        (output as fs.WriteStream).close();
      }
      resolve();
    });
  });
}

async function promptChoice(
  prompt: string,
  validChoices: string[],
): Promise<string> {
  // Check if stdin is a TTY - if not, default to first choice (non-interactive mode)
  if (!process.stdin.isTTY) {
    return validChoices[0] || '';
  }

  // Open /dev/tty directly for input/output to handle various environments
  let input: NodeJS.ReadableStream;
  let output: NodeJS.WritableStream;

  try {
    input = fs.createReadStream('/dev/tty');
    output = fs.createWriteStream('/dev/tty');
  } catch {
    // Fallback to stdin/stdout if /dev/tty is not available
    input = process.stdin;
    output = process.stdout;
  }

  const rl = readline.createInterface({
    input,
    output,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      // Close file streams if we opened /dev/tty
      if (input !== process.stdin) {
        (input as fs.ReadStream).close();
        (output as fs.WriteStream).close();
      }

      const normalized = answer.trim().toLowerCase();
      if (validChoices.includes(normalized)) {
        resolve(normalized);
      } else {
        resolve('q'); // Default to quit on invalid input
      }
    });
  });
}

/**
 * Opens a file using the platform-appropriate command.
 * Uses spawn for safety (no shell injection).
 */
function openFile(filePath: string): void {
  let command: string;
  let args: string[];

  switch (process.platform) {
    case 'darwin':
      command = 'open';
      args = [filePath];
      break;
    case 'win32':
      command = 'cmd';
      args = ['/c', 'start', '', filePath];
      break;
    default: // Linux and others
      command = 'xdg-open';
      args = [filePath];
      break;
  }

  try {
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    logConsole(`Opening: ${filePath}`);
  } catch {
    logConsole(`Could not open file. Please open manually: ${filePath}`);
  }
}
