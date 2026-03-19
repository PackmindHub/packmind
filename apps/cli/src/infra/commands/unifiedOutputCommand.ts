import { command } from 'cmd-ts';
import chalk from 'chalk';

const CLI_PREFIX = 'packmind-cli';

type HelpMessage = {
  content: string;
  command?: string;
};

class CliOutput {
  constructor(private readonly logger = console) {}

  notifySuccess(message: string, help?: HelpMessage) {
    this.notifyMessage(
      `${chalk.bgGreen.bold(CLI_PREFIX)} ${chalk.green.bold(message)}`,
      (msg) => this.logger.log(msg),
      help,
    );
  }

  notifyWarning(message: string, help?: HelpMessage) {
    this.notifyMessage(
      `${chalk.bgYellow.bold(CLI_PREFIX)} ${chalk.yellow.bold(message)}`,
      (msg) => this.logger.warn(msg),
      help,
    );
  }

  notifyError(message: string, help?: HelpMessage) {
    this.notifyMessage(
      `${chalk.bgRed.bold(CLI_PREFIX)} ${chalk.red(message)}`,
      (msg) => this.logger.error(msg),
      help,
    );
  }

  private notifyMessage(
    message: string,
    output: (message: string) => void,
    help?: HelpMessage,
  ) {
    output(message);

    if (help) {
      this.logger.log(help.content);

      if (help.command) {
        this.logger.log(`\n  Example: ${chalk.yellow(help.command)}`);
      }
    }
  }
}

export const unifiedOutputCommand = command({
  name: 'unifiedOutput',
  description: 'Display various cases of output',
  args: {},
  handler: async () => {
    const output = new CliOutput();

    console.log(`Various outputs shown to the user
    
--------------------------
ERRORS
--------------------------    

Simple message:
---------------
    `);
    output.notifyError('Unable to reach packmind server');

    console.log(`

With help:    
----------
`);
    output.notifyError('You are now allowed to use this feature', {
      content: 'Contact your administrator to see about this.',
    });

    console.log(`

With help and runnable command:    
-------------------------------
`);
    output.notifyError('You did not specify the space', {
      content:
        'Available spaces: \n - Default (@default)\n - Frontend (@frontend)',
      command: 'packmind-cli do-something --space @default',
    });

    console.log(`    
--------------------------
SUCCESS
--------------------------    

Simple message:
---------------
    `);
    output.notifySuccess('This worked fine, hurray');

    console.log(`

With help:    
----------
`);
    output.notifySuccess('The change proposals have been submitted', {
      content: 'Someone will look at them I guess.',
    });

    console.log(`

With help and runnable command:    
-------------------------------
`);
    output.notifySuccess('The package was created', {
      content: 'Anyone will be able to install it now',
      command: 'packmind-cli install @default/my-super-package',
    });

    console.log(`    
--------------------------
WARNINGS
--------------------------    

Simple message:
---------------
    `);
    output.notifyWarning('This worked, kinda...');

    console.log(`

With help:    
----------
`);
    output.notifyWarning('This kinda worked', {
      content: 'No one will congratulate you for this...',
    });

    console.log(`

With help and runnable command:    
-------------------------------
`);
    output.notifyWarning('It worked', {
      content:
        "Je ne dirais pas que c'est un echec, plutôt que ça n'a pas marché",
      command: 'packmind-cli do-something --better',
    });
  },
});
