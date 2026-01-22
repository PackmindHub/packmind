import { IPackmindApi } from '../api/IPackmindApi';
import { standardFactory } from '@packmind/standards/test';
import { Standard } from '@packmind/types';

export async function apiStandardFactory(
  packmindApi: IPackmindApi,
): Promise<Standard> {
  const spaces = await packmindApi.listSpaces();
  const spaceId = spaces[0].id;

  const standardData = standardFactory({ spaceId });

  console.log('Creating standard with data:', {
    spaceId,
    name: standardData.name,
    description: standardData.description,
    scope: standardData.scope,
    rules: [],
  });

  const response = await packmindApi.createStandard({
    spaceId,
    name: standardData.name,
    description: standardData.description,
    scope: standardData.scope,
    rules: [],
  });

  console.log('CreateStandard response:', response);

  // Return the response directly as it appears to be the standard object itself
  return response;
}
