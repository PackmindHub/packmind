import chalk from 'chalk';
import { run, subcommands } from 'cmd-ts';
import { lintCommand } from './infra/commands/LinterCommand';

const app = subcommands({
  name: 'packmind-cli',
  description: 'Packmind CLI tool',
  cmds: {
    lint: lintCommand,
  },
});

run(app, process.argv.slice(2)).catch((error) => {
  console.error(chalk.bgRed.bold('packmind-cli'), chalk.red(error.message));
  process.exit(1);
});
