import { ICheckCliVersionResult } from '../../domain/useCases/ICheckCliVersionUseCase';
import { logConsole, logWarningConsole } from '../utils/consoleLogger';

export function displayVersionNotice(
  result: ICheckCliVersionResult | null,
): void {
  if (!result?.updateAvailable) {
    return;
  }

  logConsole('');
  logWarningConsole(
    `Update available: ${result.currentVersion} \u2192 ${result.latestVersion} \u2014 run \`packmind-cli update\` to upgrade`,
  );
}
