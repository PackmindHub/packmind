import { ICheckCliVersionResult } from '../../domain/useCases/ICheckCliVersionUseCase';
import { logConsole, logWarningConsole } from '../utils/consoleLogger';
import { EXEC_NAME } from '../utils/execName';

export function displayVersionNotice(
  result: ICheckCliVersionResult | null,
): void {
  if (!result?.updateAvailable) {
    return;
  }

  logConsole('');
  logWarningConsole(
    `Update available: ${result.currentVersion} \u2192 ${result.latestVersion} \u2014 run \`${EXEC_NAME} update\` to upgrade`,
  );
}
