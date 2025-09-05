import { PackmindCliHexa } from './PackmindCliHexa';
import { ILogger } from './domain/repositories/ILogger';
import { IDELintLogger } from './infra/repositories/IDELintLogger';
import { HumanReadableLogger } from './infra/repositories/HumanReadableLogger';
import chalk from 'chalk';

const args = process.argv.slice(2);
const command = args[0];
const subArgs = args.slice(1);

function showMainHelp() {
  console.log('packmind-cli - Packmind CLI tool');
  console.log('');
  console.log('Usage: packmind-cli <command> [options]');
  console.log('');
  console.log('Available commands:');
  console.log('  lint <path>  - Lint code at the specified path');
  console.log('  pull         - Pull latest data');
  console.log('');
  console.log('Options:');
  console.log('  --help       - Show help for a command');
  console.log('');
  console.log('Examples:');
  console.log('  packmind-cli lint .');
  console.log('  packmind-cli lint --help');
  console.log('  packmind-cli pull');
  console.log('  packmind-cli pull --help');
}

function showLintHelp() {
  console.log('packmind-cli lint - Lint code at the specified path');
  console.log('');
  console.log('Usage: packmind-cli lint <path>');
  console.log('');
  console.log('Arguments:');
  console.log('  <path>       - Path to lint (e.g., . for current directory)');
  console.log('');
  console.log('Options:');
  console.log('  --help       - Show this help message');
  console.log(
    '  --logger     - Output format (ide | human). Default is human.',
  );
}

function showPullHelp() {
  console.log('packmind-cli pull - Pull latest data');
  console.log('');
  console.log('Usage: packmind-cli pull');
  console.log('');
  console.log('Options:');
  console.log('  --help       - Show this help message');
}

async function handleLint(args: string[]) {
  if (args.includes('--help')) {
    showLintHelp();
    return;
  }

  const path = args[0];
  if (!path) {
    console.error('Error: Missing path argument');
    console.log('');
    showLintHelp();
    process.exit(1);
  }

  const packmindCliHexa = new PackmindCliHexa();
  const { violations } = await packmindCliHexa.lintFilesInDirectory({
    path,
  });

  const logger: ILogger = args.includes('--logger=ide')
    ? new IDELintLogger()
    : new HumanReadableLogger();
  logger.logViolations(violations);

  if (violations.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

function handlePull(args: string[]) {
  if (args.includes('--help')) {
    showPullHelp();
    return;
  }

  console.log('called packmind-cli pull');
}

// Main command handling
async function main() {
  if (!command || command === '--help') {
    showMainHelp();
  } else if (command === 'lint') {
    await handleLint(subArgs);
  } else if (command === 'pull') {
    handlePull(subArgs);
  } else {
    console.error(`Error: Unknown command '${command}'`);
    console.log('');
    showMainHelp();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(chalk.bgRed.bold('packmind-cli'), chalk.red(error.message));
  process.exit(1);
});
