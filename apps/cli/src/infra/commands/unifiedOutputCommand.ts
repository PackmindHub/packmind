import { command } from 'cmd-ts';
import { CliOutput } from '../repositories/CliOutput';

function displayBlock(
  title: string,
  entries: { subTitle: string; command: () => void }[],
  logger = console,
) {
  logger.log('-'.repeat(title.length));
  logger.log(title);
  logger.log('-'.repeat(title.length));
  logger.log('');
  for (const { subTitle, command } of entries) {
    logger.log(subTitle);
    logger.log('-'.repeat(subTitle.length));
    logger.log('');
    command();
    logger.log('');
  }
}

export const unifiedOutputCommand = command({
  name: 'unifiedOutput',
  description: 'Display various cases of output',
  args: {},
  handler: async () => {
    const output = new CliOutput();

    displayBlock('ERRORS', [
      {
        subTitle: 'Simple message',
        command: () => output.notifyError('Unable to reach packmind server'),
      },
      {
        subTitle: 'With help',
        command: () =>
          output.notifyError('You are now allowed to use this feature', {
            content: 'Contact your administrator to see about this.',
          }),
      },
      {
        subTitle: 'With help and runnable command',
        command: () =>
          output.notifyError('You did not specify the space', {
            content:
              'Available spaces: \n - Default (@default)\n - Frontend (@frontend)',
            exampleCommand: 'packmind-cli do-something --space @default',
          }),
      },
    ]);

    displayBlock('SUCCESS', [
      {
        subTitle: 'Simple message',
        command: () => output.notifySuccess('This worked fine, hurray'),
      },
      {
        subTitle: 'With help',
        command: () =>
          output.notifySuccess('The change proposals have been submitted', {
            content: 'Someone will look at them I guess.',
          }),
      },
      {
        subTitle: 'With help and runnable command',
        command: () =>
          output.notifySuccess('The package was created', {
            content: 'Anyone will be able to install it now',
            exampleCommand: 'packmind-cli install @default/my-super-package',
          }),
      },
    ]);

    displayBlock('WARNINGS', [
      {
        subTitle: 'Simple message',
        command: () => output.notifyWarning('This worked, kinda...'),
      },
      {
        subTitle: 'With help',
        command: () =>
          output.notifyWarning('This kinda worked', {
            content: 'No one will congratulate you for this...',
          }),
      },
      {
        subTitle: 'With help and runnable command',
        command: () =>
          output.notifyWarning('It worked', {
            content:
              "Je ne dirais pas que c'est un echec, plutôt que ça n'a pas marché",
            exampleCommand: 'packmind-cli do-something --better',
          }),
      },
    ]);

    displayBlock('LIST ARTEFACTS', [
      {
        subTitle: 'Flat',
        command: () =>
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
          ]),
      },
      {
        subTitle: 'Flat (with help)',
        command: () =>
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
              exampleCommand: 'packmind-cli install @default/generic',
            },
          ),
      },
      {
        subTitle: 'Scoped',
        command: () =>
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
          ]),
      },
      {
        subTitle: 'Scoped (with help)',
        command: () =>
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
              exampleCommand: 'packmind-cli install @default/generic',
            },
          ),
      },
    ]);

    displayBlock('SHOW ARTEFACTS', [
      {
        subTitle: 'Simple',
        command: () =>
          output.showArtefact({
            title: 'My standard',
            slug: 'my-standard',
            description: `Some description of the standard
            
Rules:
 - Be nice to others
 - And other stuff, I guess
`,
            url: 'https://app.packmind.ai/orga/standards/123',
          }),
      },
      {
        subTitle: 'With help',
        command: () =>
          output.showArtefact(
            {
              title: 'My package',
              slug: '@my-space/my-package',
              description: 'With things and stuff there',
              url: 'https://app.packmind.ai/orga/id/space/space/my-package',
            },
            {
              content: 'Install the package with the following command',
              command: `packmind-cli install @my-space/my-package`,
            },
          ),
      },
    ]);
  },
});
