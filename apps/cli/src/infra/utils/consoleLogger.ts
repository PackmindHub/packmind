import chalk from 'chalk';

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
export function logWarningConsole(message: string, logger = console): void {
  logger.warn(chalk.bgYellow.bold(CLI_PREFIX), chalk.yellow(message));
}

/**
 * Logs an info message to the console with blue styling.
 * Format: [packmind-cli] message
 */
export function logInfoConsole(message: string, logger = console): void {
  logger.log(chalk.bgBlue.bold(CLI_PREFIX), chalk.blue(message));
}

/**
 * Logs an error message to the console with red styling.
 * Format: [packmind-cli] message
 */
export function logErrorConsole(message: string, logger = console): void {
  logger.error(chalk.bgRed.bold(CLI_PREFIX), chalk.red(message));
}

/**
 * Logs a success message to the console with green styling.
 * Format: [packmind-cli] message
 */
export function logSuccessConsole(message: string, logger = console): void {
  logger.log(chalk.bgGreen.bold(CLI_PREFIX), chalk.green.bold(message));
}

// ============================================
// Text Formatting Functions (returns styled string)
// ============================================

/**
 * Formats text as a highlighted slug (blue bold).
 */
export function formatSlug(text: string): string {
  return chalk.blue.bold(text);
}

/**
 * Formats text as a dimmed label.
 */
export function formatLabel(text: string): string {
  return chalk.dim(text);
}

/**
 * Formats text as an error (red).
 */
export function formatError(text: string): string {
  return chalk.red(text);
}

/**
 * Formats text as bold.
 */
export function formatBold(text: string): string {
  return chalk.bold(text);
}

/**
 * Formats text as underlined gray (for file paths).
 */
export function formatFilePath(text: string): string {
  return chalk.underline.gray(text);
}

/**
 * Formats a URL as a clickable hyperlink in supported terminals.
 * Uses OSC 8 escape sequence: \x1b]8;;URL\x07text\x1b]8;;\x07
 * Falls back to underlined cyan text in unsupported terminals.
 */
export function formatLink(url: string, text?: string): string {
  const displayText = text || url;
  // OSC 8 hyperlink format supported by many modern terminals
  return `\x1b]8;;${url}\x07${chalk.cyan.underline(displayText)}\x1b]8;;\x07`;
}

/**
 * Formats a section header with visual emphasis.
 */
export function formatHeader(text: string): string {
  return chalk.bold.white(text);
}

/**
 * Formats a command that can be run.
 */
export function formatCommand(text: string): string {
  return chalk.yellow(text);
}
