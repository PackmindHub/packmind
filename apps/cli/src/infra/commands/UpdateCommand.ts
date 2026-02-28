import { command, flag } from 'cmd-ts';
import { hasEmbeddedWasmFiles } from '../../wasm-runtime';
import { updateHandler } from './updateHandler';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: CLI_VERSION } = require('../../../package.json');

export const updateCommand = command({
  name: 'update',
  description: 'Update packmind-cli to the latest version',
  args: {
    check: flag({
      long: 'check',
      description:
        'Only check if a newer version is available without performing the update',
    }),
  },
  handler: async ({ check }) => {
    await updateHandler({
      currentVersion: CLI_VERSION,
      isExecutableMode: hasEmbeddedWasmFiles(),
      executablePath: process.execPath,
      platform: process.platform,
      arch: process.arch,
      fetchFn: fetch,
      checkOnly: check,
    });
  },
});
