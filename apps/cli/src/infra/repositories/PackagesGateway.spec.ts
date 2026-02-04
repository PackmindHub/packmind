import { PackagesGateway } from './PackagesGateway';
import { PackmindHttpClient } from '../http/PackmindHttpClient';

const createTestApiKey = () => {
  const jwt = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
  ).toString('base64');
  const payload = Buffer.from(
    JSON.stringify({
      organization: { id: 'org-123', name: 'Test Org' },
      iat: Date.now(),
      exp: Date.now() + 3600000,
    }),
  ).toString('base64');
  const signature = 'test-signature';
  const fullJwt = `${jwt}.${payload}.${signature}`;

  return Buffer.from(
    JSON.stringify({
      host: 'http://localhost:4200',
      jwt: fullJwt,
    }),
  ).toString('base64');
};

describe('PackagesGateway', () => {
  describe('addArtefacts', () => {
    let gateway: PackagesGateway;
    let mockHttpClient: jest.Mocked<PackmindHttpClient>;

    beforeEach(() => {
      mockHttpClient = {
        getAuthContext: jest.fn().mockReturnValue({
          organizationId: 'org-123',
          host: 'https://api.packmind.com',
          jwt: 'mock-jwt',
        }),
        request: jest.fn(),
      } as unknown as jest.Mocked<PackmindHttpClient>;

      gateway = new PackagesGateway(createTestApiKey(), mockHttpClient);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('when adding standards to a package', () => {
      it('calls POST with correct payload', async () => {
        mockHttpClient.request.mockResolvedValue({
          added: { standards: ['std-1'], commands: [], skills: [] },
          skipped: { standards: [], commands: [], skills: [] },
        });

        const result = await gateway.addArtefacts({
          packageSlug: 'my-package',
          spaceId: 'space-123',
          standardIds: ['std-1'],
        });

        expect(mockHttpClient.request).toHaveBeenCalledWith(
          '/api/v0/organizations/org-123/spaces/space-123/packages/my-package/add-artifacts',
          {
            method: 'POST',
            body: { standardIds: ['std-1'] },
          },
        );
        expect(result.added.standards).toEqual(['std-1']);
      });
    });

    describe('when adding commands to a package', () => {
      it('calls POST with commandIds in payload', async () => {
        mockHttpClient.request.mockResolvedValue({
          added: { standards: [], commands: ['cmd-1'], skills: [] },
          skipped: { standards: [], commands: [], skills: [] },
        });

        const result = await gateway.addArtefacts({
          packageSlug: 'my-package',
          spaceId: 'space-123',
          commandIds: ['cmd-1'],
        });

        expect(mockHttpClient.request).toHaveBeenCalledWith(
          '/api/v0/organizations/org-123/spaces/space-123/packages/my-package/add-artifacts',
          {
            method: 'POST',
            body: { commandIds: ['cmd-1'] },
          },
        );
        expect(result.added.commands).toEqual(['cmd-1']);
      });
    });

    describe('when adding skills to a package', () => {
      it('calls POST with skillIds in payload', async () => {
        mockHttpClient.request.mockResolvedValue({
          added: { standards: [], commands: [], skills: ['skill-1'] },
          skipped: { standards: [], commands: [], skills: [] },
        });

        const result = await gateway.addArtefacts({
          packageSlug: 'my-package',
          spaceId: 'space-123',
          skillIds: ['skill-1'],
        });

        expect(mockHttpClient.request).toHaveBeenCalledWith(
          '/api/v0/organizations/org-123/spaces/space-123/packages/my-package/add-artifacts',
          {
            method: 'POST',
            body: { skillIds: ['skill-1'] },
          },
        );
        expect(result.added.skills).toEqual(['skill-1']);
      });
    });

    describe('when some items are skipped', () => {
      it('returns skipped items in response', async () => {
        mockHttpClient.request.mockResolvedValue({
          added: { standards: ['std-2'], commands: [], skills: [] },
          skipped: { standards: ['std-1'], commands: [], skills: [] },
        });

        const result = await gateway.addArtefacts({
          packageSlug: 'my-package',
          spaceId: 'space-123',
          standardIds: ['std-1', 'std-2'],
        });

        expect(result.added.standards).toEqual(['std-2']);
        expect(result.skipped.standards).toEqual(['std-1']);
      });
    });
  });
});
