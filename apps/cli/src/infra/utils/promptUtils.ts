import * as readline from 'readline';
import * as fs from 'fs';

/**
 * Prompts the user for a yes/no confirmation.
 * Returns true if the user confirms (y/yes), false otherwise.
 */
export async function promptConfirmation(message: string): Promise<boolean> {
  // Check if stdin is a TTY - if not, default to yes (non-interactive mode)
  if (!process.stdin.isTTY) {
    return true;
  }

  // Open /dev/tty directly for input/output to handle various environments
  let input: NodeJS.ReadableStream;
  let output: NodeJS.WritableStream;

  try {
    input = fs.createReadStream('/dev/tty');
    output = fs.createWriteStream('/dev/tty');
  } catch {
    // Fallback to stdin/stdout if /dev/tty is not available
    input = process.stdin;
    output = process.stdout;
  }

  const rl = readline.createInterface({
    input,
    output,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/n): `, (answer) => {
      rl.close();
      // Close file streams if we opened /dev/tty
      if (input !== process.stdin) {
        (input as fs.ReadStream).close();
        (output as fs.WriteStream).close();
      }

      const normalized = answer.toLowerCase().trim();
      resolve(normalized === 'y' || normalized === 'yes');
    });
  });
}
