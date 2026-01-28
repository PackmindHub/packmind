import { command, option, string, optional } from 'cmd-ts';
import { logConsole } from '../utils/consoleLogger';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { PackmindCliHexa } from '../../PackmindCliHexa';

export const onboardStatusCommand = command({
  name: 'onboard-status',
  description: 'Show onboarding status for current project',
  args: {
    path: option({
      type: optional(string),
      long: 'path',
      short: 'p',
      description: 'Project path (default: current directory)',
    }),
  },
  handler: async (args) => {
    const logger = new PackmindLogger('OnboardStatusCommand', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(logger);

    // Get the draft onboarding use case from the hexa factory
    const draftUseCase = packmindCliHexa.getDraftOnboardingUseCase();

    const projectPath = args.path || process.cwd();
    const status = await draftUseCase.getStatus(projectPath);

    logConsole('');
    logConsole('='.repeat(60));
    logConsole('  ONBOARDING STATUS');
    logConsole('='.repeat(60));
    logConsole('');

    if (!status.last_run_at) {
      logConsole('No onboarding has been run for this project yet.');
      logConsole('');
      logConsole('Run `packmind-cli onboard` to get started.');
      return;
    }

    logConsole(`Last run:          ${status.last_run_at}`);
    logConsole(`Baseline items:    ${status.baseline_item_count}`);
    logConsole(`Repo fingerprint:  ${status.repo_fingerprint}`);
    logConsole('');

    logConsole('Draft files:');
    if (status.last_draft_paths.json) {
      logConsole(`  JSON: ${status.last_draft_paths.json}`);
    }
    if (status.last_draft_paths.md) {
      logConsole(`  Markdown: ${status.last_draft_paths.md}`);
    }
    logConsole('');

    logConsole('Push status:');
    if (status.last_push_status.status === 'sent') {
      logConsole(`  Sent to Packmind at ${status.last_push_status.timestamp}`);
    } else {
      logConsole('  Not yet sent to Packmind');
    }
    logConsole('');
  },
});
