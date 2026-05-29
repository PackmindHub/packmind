import { Configuration } from '@packmind/node-utils';

export type PackmindEdition = 'cloud' | 'oss';

export async function resolvePackmindEdition(): Promise<PackmindEdition> {
  const raw = await Configuration.getConfig('PACKMIND_EDITION');
  return raw === 'proprietary' || raw === 'cloud' ? 'cloud' : 'oss';
}
