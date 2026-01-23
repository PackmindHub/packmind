import { PackmindHttpClient } from './PackmindHttpClient';
import { NotLoggedInError } from '../../domain/errors/NotLoggedInError';

describe('PackmindHttpClient', () => {
  const createTestApiKey = (orgId = 'org-123') => {
    const jwtPayload = { organization: { id: orgId, name: 'Test Org' } };
    const jwtPayloadBase64 = Buffer.from(JSON.stringify(jwtPayload)).toString(
      'base64',
    );
    const jwt = `header.${jwtPayloadBase64}.signature`;
    return Buffer.from(
      JSON.stringify({
        host: 'https://api.packmind.com',
        jwt,
      }),
    ).toString('base64');
  };

  describe('getAuthContext', () => {
    it('returns host, jwt and organizationId for valid API key', () => {
      const client = new PackmindHttpClient(createTestApiKey('org-456'));

      const context = client.getAuthContext();

      expect(context.host).toBe('https://api.packmind.com');
      expect(context.organizationId).toBe('org-456');
      expect(context.jwt).toContain('header.');
    });

    describe('when API key is empty', () => {
      it('throws NotLoggedInError', () => {
        const client = new PackmindHttpClient('');

        expect(() => client.getAuthContext()).toThrow(NotLoggedInError);
      });
    });

    describe('when API key is invalid base64', () => {
      it('throws error', () => {
        const client = new PackmindHttpClient('not-valid-base64!@#');

        expect(() => client.getAuthContext()).toThrow('Invalid API key');
      });
    });

    describe('when JWT is missing organizationId', () => {
      it('throws error', () => {
        const jwtPayload = { user: 'test' };
        const jwtPayloadBase64 = Buffer.from(
          JSON.stringify(jwtPayload),
        ).toString('base64');
        const jwt = `header.${jwtPayloadBase64}.signature`;
        const apiKey = Buffer.from(
          JSON.stringify({
            host: 'https://api.packmind.com',
            jwt,
          }),
        ).toString('base64');
        const client = new PackmindHttpClient(apiKey);

        expect(() => client.getAuthContext()).toThrow('missing organizationId');
      });
    });
  });
});
