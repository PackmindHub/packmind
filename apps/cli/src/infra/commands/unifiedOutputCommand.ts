import { command } from 'cmd-ts';
import chalk from 'chalk';

const CLI_PREFIX = 'packmind-cli';

type HelpMessage = {
  content: string;
  command?: string;
};

type Artefact = {
  title: string;
  slug: string;
  description?: string;
  url?: string;
};

class CliFormatter {
  public static success(message: string) {
    return `${chalk.bgGreen.bold(CLI_PREFIX)} ${chalk.green.bold(message)}`;
  }

  public static warning(message: string) {
    return `${chalk.bgYellow.bold(CLI_PREFIX)} ${chalk.yellow.bold(message)}`;
  }

  public static error(message: string) {
    return `${chalk.bgRed.bold(CLI_PREFIX)} ${chalk.red(message)}`;
  }

  public static command(command: string) {
    return chalk.yellow(command);
  }

  public static header(title: string) {
    return chalk.bold.underline(title);
  }

  public static subHeader(title: string) {
    return chalk.bold(title);
  }

  public static slug(slug: string) {
    return chalk.blue.bold(slug);
  }

  public static label(label: string) {
    return chalk.dim(label);
  }
}

class CliOutput {
  constructor(private readonly logger = console) {}

  notifySuccess(message: string, help?: HelpMessage) {
    this.notifyMessage(
      CliFormatter.success(message),
      (msg) => this.logger.log(msg),
      help,
    );
  }

  notifyWarning(message: string, help?: HelpMessage) {
    this.notifyMessage(
      CliFormatter.warning(message),
      (msg) => this.logger.warn(msg),
      help,
    );
  }

  notifyError(message: string, help?: HelpMessage) {
    this.notifyMessage(
      CliFormatter.error(message),
      (msg) => this.logger.error(msg),
      help,
    );
  }

  showArtefact(artefact: Artefact) {
    this.logger.log(CliFormatter.label(artefact.slug));
    this.logger.log(CliFormatter.header(artefact.title));
    if (artefact.url) {
      this.logger.log(CliFormatter.label(artefact.url));
    }
    this.logger.log('');
    if (artefact.description) {
      this.logger.log(artefact.description);
    }
  }

  listArtefacts(title: string, artefacts: Artefact[], help?: HelpMessage) {
    this.logger.log(CliFormatter.header(title));
    this.logger.log('');

    this.displayList(artefacts);
    this.displayHelp(help);
  }

  listScopedArtefacts(
    title: string,
    scopedArtefacts: { title: string; artefacts: Artefact[] }[],
    help?: HelpMessage,
  ) {
    this.logger.log(CliFormatter.header(title));
    this.logger.log('');

    for (const { title, artefacts } of scopedArtefacts) {
      this.logger.log(CliFormatter.subHeader(title));
      this.logger.log('');
      this.displayList(artefacts);
    }

    this.displayHelp(help);
  }

  private notifyMessage(
    message: string,
    output: (message: string) => void,
    help?: HelpMessage,
  ) {
    output(message);
    this.displayHelp(help);
  }

  private displayList(artefacts: Artefact[]) {
    for (const artefact of artefacts) {
      this.logger.log(`- ${CliFormatter.label(artefact.slug)}`);
      this.logger.log(` Name: ${CliFormatter.header(artefact.title)}`);
      if (artefact.url) {
        this.logger.log(` ${CliFormatter.label(artefact.url)}`);
      }
      this.logger.log('');
    }
  }

  private displayHelp(help?: HelpMessage) {
    if (help) {
      this.logger.log(help.content);

      if (help.command) {
        this.logger.log(`\n  Example: ${CliFormatter.command(help.command)}`);
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

    console.log(`
--------------------------
LIST ARTEFACTS
--------------------------

Flat:
-----
`);

    output.listArtefacts('Available spaces in the organization:', [
      {
        title: 'Default',
        slug: '@default',
        url: 'https://app.packmind.ai/orga/space/default/',
      },
      {
        title: 'My second space',
        slug: '@my-second-space',
        url: 'https://app.packmind.ai/orga/space/my-second-space',
      },
    ]);

    console.log(`

Flat (with help):
-----
`);

    output.listArtefacts(
      'Available packages:',
      [
        {
          title: 'Generic',
          slug: '@default/generic',
          url: 'https://app.packmind.ai/orga/space/default/packages/generic',
        },
        {
          title: 'Frontend',
          slug: '@my-second-space/frontend',
          url: 'https://app.packmind.ai/orga/space/my-second-space/packages/frontend',
        },
      ],
      {
        content: 'How to install a package:',
        command: 'packmind-cli install @default/generic',
      },
    );

    console.log(`
Scoped:
-----
`);

    output.listScopedArtefacts('Available packages:', [
      {
        title: 'Default space (@global)',
        artefacts: [
          {
            title: 'Generic',
            slug: '@default/generic',
            url: 'https://app.packmind.ai/orga/space/default/packages/generic',
          },
        ],
      },
      {
        title: 'Second space (@second-space)',
        artefacts: [
          {
            title: 'Frontend',
            slug: '@my-second-space/frontend',
            url: 'https://app.packmind.ai/orga/space/my-second-space/packages/frontend',
          },
        ],
      },
    ]);

    console.log(`

Scoped (with help):
-----
`);

    output.listScopedArtefacts(
      'Available packages:',
      [
        {
          title: 'Default space (@global)',
          artefacts: [
            {
              title: 'Generic',
              slug: '@default/generic',
              url: 'https://app.packmind.ai/orga/space/default/packages/generic',
            },
          ],
        },
        {
          title: 'Second space (@second-space)',
          artefacts: [
            {
              title: 'Frontend',
              slug: '@my-second-space/frontend',
              url: 'https://app.packmind.ai/orga/space/my-second-space/packages/frontend',
            },
          ],
        },
      ],
      {
        content: 'How to install a package:',
        command: 'packmind-cli install @default/generic',
      },
    );

    console.log(`
--------------------------
SHOW ARTEFACTS
--------------------------

`);

    output.showArtefact({
      title: 'My package',
      slug: '@space/my-package',
      url: 'https://app.packmind.ai/orga/id/space/space/my-package',
      description: 'With things and stuff there',
    });
  },
});
