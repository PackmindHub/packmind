import { subcommands } from 'cmd-ts';
import { renderPluginCommand } from './plugins/RenderPluginCommand';
import { deletePluginCommand } from './plugins/DeletePluginCommand';

export const pluginsCommand = subcommands({
  name: 'plugins',
  description:
    'Render Packmind packages as Claude Code or GitHub Copilot plugins',
  cmds: {
    render: renderPluginCommand,
    delete: deletePluginCommand,
  },
});
