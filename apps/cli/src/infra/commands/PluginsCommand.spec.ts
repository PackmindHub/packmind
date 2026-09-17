jest.mock('cmd-ts', () => ({
  subcommands: jest.fn((definition) => definition),
}));

jest.mock('./plugins/RenderPluginCommand', () => ({
  renderPluginCommand: { name: 'render' },
}));

jest.mock('./plugins/DeletePluginCommand', () => ({
  deletePluginCommand: { name: 'delete' },
}));

import { pluginsCommand } from './PluginsCommand';

/** cmd-ts keeps the subcommand map off the type `subcommands()` returns. */
const leavesOf = (cmd: typeof pluginsCommand): Record<string, unknown> =>
  (cmd as unknown as { cmds: Record<string, unknown> }).cmds;

describe('pluginsCommand', () => {
  it('exposes render and delete leaves', () => {
    expect(Object.keys(leavesOf(pluginsCommand))).toEqual(
      expect.arrayContaining(['render', 'delete']),
    );
  });
});
