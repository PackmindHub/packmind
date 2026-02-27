import { command } from 'cmd-ts';
import { hasEmbeddedWasmFiles } from '../../wasm-runtime';
import { updateHandler } from './updateHandler';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: CLI_VERSION } = require('../../../package.json');

export const updateCommand = command({
  name: 'update',
  description: 'Update packmind-cli to the latest version',
  args: {},
  handler: async () => {
    await updateHandler({
      currentVersion: CLI_VERSION,
      isExecutableMode: hasEmbeddedWasmFiles(),
      executablePath: process.execPath,
      platform: process.platform,
      arch: process.arch,
      fetchFn: fetch,
    });
  },
});
