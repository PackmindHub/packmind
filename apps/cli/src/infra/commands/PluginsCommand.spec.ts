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

describe('pluginsCommand', () => {
  it('exposes render and delete leaves', () => {
    expect(Object.keys(pluginsCommand.cmds)).toEqual(
      expect.arrayContaining(['render', 'delete']),
    );
  });
});
