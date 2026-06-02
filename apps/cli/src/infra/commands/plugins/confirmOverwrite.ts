import * as readline from 'readline';

/**
 * Prompts the user with a yes/no question and resolves to whether they confirmed.
 * Defaults to `false` (No) for any answer other than an explicit yes.
 */
export async function confirmOverwrite(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise<boolean>((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === 'y' || normalized === 'yes');
    });
  });
}
