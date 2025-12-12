import { withApi } from './fixtures/packmindTest';

withApi.describe('packmind-cli install', () => {
  withApi(
    'it stores the new distribution of the package',
    async ({ packmindApi }) => {
      console.log(await packmindApi.listOrganizations());
    },
  );
});
