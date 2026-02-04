import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { PackmindLogger } from '@packmind/logger';
import { getErrorMessage } from '@packmind/node-utils';

const logger = new PackmindLogger('linter-IO');

export async function getFileContent(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return content.toString();
}

export async function writeFileContent(
  content: string,
  filePath: string,
): Promise<void> {
  await fs.writeFile(filePath, content);
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (err) {
    console.error('Error deleting the file:', err);
  }
}

export async function deleteFiles(paths: string[]): Promise<void> {
  //No need to wait for termination
  paths.forEach((filePath) => deleteFile(filePath));
}

export async function callIndexJsWithInput(
  programPath: string,
  input: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const directory = path.dirname(programPath);
    const baseName = path.basename(programPath);

    logger.debug(`Run program ${baseName} in ${directory}`);
    const childProcess = spawn('node', [baseName], { cwd: directory });

    let output = '';
    let errorOutput = '';

    let isTimeout = false;

    // Set a timeout
    const timeout = setTimeout(() => {
      isTimeout = true;
      childProcess.kill(); // Kill the process if it exceeds the timeout
      reject(new Error(`Operation timed out after 10,000 ms`));
    }, 10000);

    childProcess.on('error', (err) => {
      clearTimeout(timeout); // Clear timeout if an error occurs
      reject(new Error(`Failed to start child process: ${err.message}`));
    });

    // Ensure the input is sent only if the child process is ready
    childProcess.on('spawn', () => {
      try {
        // Ensure input is a string or convert it to a string
        const inputStr =
          typeof input === 'string' ? input : JSON.stringify(input);

        // Write the input and end the stream
        childProcess.stdin.write(inputStr, (err) => {
          if (err) {
            logger.error(`Error writing to stdin: ${err.message}`);
            clearTimeout(timeout); // Clear timeout
            return reject(
              new Error(`Failed to write to stdin: ${err.message}`),
            );
          }
          // Explicitly close the stdin stream
          childProcess.stdin.end();
        });
      } catch (error) {
        clearTimeout(timeout); // Clear timeout
        reject(
          new Error(
            `Error handling input for child process: ${getErrorMessage(error)}`,
          ),
        );
      }
    });

    // Handle errors on stdin separately
    childProcess.stdin.on('error', (err) => {
      logger.error(`Error in stdin stream: ${err.message}`);
      clearTimeout(timeout); // Clear timeout
      reject(new Error(`Error writing to stdin: ${err.message}`));
    });

    // Capture the output from the child process
    childProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    // Capture any error messages from the child process
    childProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    // Capture the exit code when the child process exits
    childProcess.on('close', (code) => {
      if (!isTimeout) {
        clearTimeout(timeout); // Clear timeout if the process finishes in time
        if (code === 0) {
          resolve(output);
        } else {
          reject(
            new Error(`Child process exited with code ${code}: ${errorOutput}`),
          );
        }
      }
    });
  });
}
