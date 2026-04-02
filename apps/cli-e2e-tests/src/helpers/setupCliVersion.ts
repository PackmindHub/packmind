import { detectCliVersion, getCliVersion, isProductionMode } from './cliVersion';

beforeAll(async () => {
  await detectCliVersion();

  if (isProductionMode()) {
    const version = getCliVersion();
    console.log(`[cli-e2e] Production mode — detected CLI version: ${version ?? 'unknown'}`);
  }
});
