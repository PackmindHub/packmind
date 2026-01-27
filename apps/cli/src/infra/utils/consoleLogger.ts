// Dynamic import for ESM-only chalk package (works in CJS bundle)
let chalkPromise: Promise<typeof import('chalk')> | null = null;

async function getChalk() {
  if (!chalkPromise) {
    chalkPromise = import('chalk');
  }
  return (await chalkPromise).default;
}

const CLI_PREFIX = 'packmind-cli';

export function logConsole(message: string, logger = console): void {
  logger.log(message);
}

// ============================================
// Console Log Functions (with packmind-cli prefix)
// ============================================

/**
 * Logs a warning message to the console with yellow styling.
 * Format: [packmind-cli] message
 */
export async function logWarningConsole(
  message: string,
  logger = console,
): Promise<void> {
  const chalk = await getChalk();
  logger.warn(chalk.bgYellow.bold(CLI_PREFIX), chalk.yellow(message));
}

/**
 * Logs an info message to the console with blue styling.
 * Format: [packmind-cli] message
 */
export async function logInfoConsole(
  message: string,
  logger = console,
): Promise<void> {
  const chalk = await getChalk();
  logger.log(chalk.bgBlue.bold(CLI_PREFIX), chalk.blue(message));
}

/**
 * Logs an error message to the console with red styling.
 * Format: [packmind-cli] message
 */
export async function logErrorConsole(
  message: string,
  logger = console,
): Promise<void> {
  const chalk = await getChalk();
  logger.error(chalk.bgRed.bold(CLI_PREFIX), chalk.red(message));
}

/**
 * Logs a success message to the console with green styling.
 * Format: [packmind-cli] message
 */
export async function logSuccessConsole(
  message: string,
  logger = console,
): Promise<void> {
  const chalk = await getChalk();
  logger.log(chalk.bgGreen.bold(CLI_PREFIX), chalk.green.bold(message));
}

// ============================================
// Text Formatting Functions (returns styled string)
// ============================================

/**
 * Formats text as a highlighted slug (blue bold).
 */
export async function formatSlug(text: string): Promise<string> {
  const chalk = await getChalk();
  return chalk.blue.bold(text);
}

/**
 * Formats text as a dimmed label.
 */
export async function formatLabel(text: string): Promise<string> {
  const chalk = await getChalk();
  return chalk.dim(text);
}

/**
 * Formats text as an error (red).
 */
export async function formatError(text: string): Promise<string> {
  const chalk = await getChalk();
  return chalk.red(text);
}

/**
 * Formats text as bold.
 */
export async function formatBold(text: string): Promise<string> {
  const chalk = await getChalk();
  return chalk.bold(text);
}

/**
 * Formats text as underlined gray (for file paths).
 */
export async function formatFilePath(text: string): Promise<string> {
  const chalk = await getChalk();
  return chalk.underline.gray(text);
}
