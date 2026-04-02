import { execSync } from 'child_process';
import {
  setDetectedVersion,
  isProductionMode,
  getCliVersion,
} from './cliVersion';

if (isProductionMode()) {
  const cliPath = process.env['CLI_BINARY_PATH'];
  try {
    const isJsFile = cliPath?.endsWith('.cjs') || cliPath?.endsWith('.js');
    const cmd = isJsFile
      ? `node "${cliPath}" --version`
      : `"${cliPath}" --version`;
    const stdout = execSync(cmd, {
      encoding: 'utf-8',
    });
    const match = stdout.match(/version\s+([\d.]+(?:-[\w.]+)?)/);
    setDetectedVersion(match ? match[1] : null);
  } catch {
    setDetectedVersion(null);
  }

  const version = getCliVersion();
  console.log(
    `[cli-e2e] Production mode — detected CLI version: ${version ?? 'unknown'}`,
  );
}
