import { IPackmindApi } from '../api/IPackmindApi';
import { standardFactory } from '@packmind/standards/test';
import { Standard } from '@packmind/types';

export async function apiStandardFactory(
  packmindApi: IPackmindApi,
): Promise<Standard> {
  const spaces = await packmindApi.listSpaces();
  const spaceId = spaces[0].id;

  return packmindApi.createStandard({
    ...standardFactory({ spaceId }),
    rules: [],
  });
}
