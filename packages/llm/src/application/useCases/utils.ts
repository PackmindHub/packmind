import { Configuration } from '@packmind/node-utils';

export async function isPackmindProviderAvailable(): Promise<boolean> {
  const isProprietaryEdition = process.env.PACKMIND_EDITION === 'proprietary';
  const isProviderEnabled =
    (await Configuration.getConfig('PACKMIND_AI_PROVIDER_AVAILABLE')) ===
    'true';

  return isProprietaryEdition && isProviderEnabled;
}
