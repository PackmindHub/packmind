import { StandardsGateway } from './StandardsGateway';
import { createMockHttpClient } from '../../mocks/createMockHttpClient';
import { PackmindHttpClient } from '../http/PackmindHttpClient';
import { ISpacesGateway } from '../../domain/repositories/ISpacesGateway';

describe('StandardsGateway', () => {
  let gateway: StandardsGateway;
  let mockHttpClient: jest.Mocked<PackmindHttpClient>;
  let mockSpacesGateway: jest.Mocked<ISpacesGateway>;
  const mockOrganizationId = 'org-123';

  beforeEach(() => {
    mockHttpClient = createMockHttpClient({
      getAuthContext: jest.fn().mockReturnValue({
        host: 'https://api.packmind.com',
        jwt: 'mock-jwt',
        organizationId: mockOrganizationId,
      }),
    });

    mockSpacesGateway = {
      getGlobal: jest.fn(),
    };

    gateway = new StandardsGateway(mockHttpClient, mockSpacesGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('makes POST request to standards endpoint', async () => {
      mockHttpClient.request.mockResolvedValue({
        id: 'std-123',
        name: 'Test Standard',
      });

      await gateway.create('space-uuid', {
        name: 'Test Standard',
        description: 'Desc',
        scope: 'test',
        rules: [{ content: 'Rule 1' }],
      });

      expect(mockHttpClient.request).toHaveBeenCalledWith(
        `/api/v0/organizations/${mockOrganizationId}/spaces/space-uuid/standards`,
        {
          method: 'POST',
          body: {
            name: 'Test Standard',
            description: 'Desc',
            scope: 'test',
            rules: [{ content: 'Rule 1' }],
          },
        },
      );
    });

    it('returns standard id and name', async () => {
      mockHttpClient.request.mockResolvedValue({
        id: 'std-123',
        name: 'Test Standard',
      });

      const result = await gateway.create('space-uuid', {
        name: 'Test Standard',
        description: 'Desc',
        scope: 'test',
        rules: [{ content: 'Rule 1' }],
      });

      expect(result).toEqual({ id: 'std-123', name: 'Test Standard' });
    });
  });

  describe('getRules', () => {
    it('makes GET request to rules endpoint', async () => {
      mockHttpClient.request.mockResolvedValue([
        { id: 'rule-1', content: 'Rule 1' },
      ]);

      await gateway.getRules('space-uuid', 'std-123');

      expect(mockHttpClient.request).toHaveBeenCalledWith(
        `/api/v0/organizations/${mockOrganizationId}/spaces/space-uuid/standards/std-123/rules`,
      );
    });

    it('returns rules array', async () => {
      mockHttpClient.request.mockResolvedValue([
        { id: 'rule-1', content: 'Rule 1' },
        { id: 'rule-2', content: 'Rule 2' },
      ]);

      const result = await gateway.getRules('space-uuid', 'std-123');

      expect(result).toEqual([
        { id: 'rule-1', content: 'Rule 1' },
        { id: 'rule-2', content: 'Rule 2' },
      ]);
    });
  });

  describe('addExampleToRule', () => {
    it('makes POST request to examples endpoint', async () => {
      mockHttpClient.request.mockResolvedValue({ id: 'example-1' });

      await gateway.addExampleToRule('space-uuid', 'std-123', 'rule-1', {
        language: 'TYPESCRIPT',
        positive: 'const x = 1;',
        negative: 'var x = 1;',
      });

      expect(mockHttpClient.request).toHaveBeenCalledWith(
        `/api/v0/organizations/${mockOrganizationId}/spaces/space-uuid/standards/std-123/rules/rule-1/examples`,
        {
          method: 'POST',
          body: {
            lang: 'TYPESCRIPT',
            positive: 'const x = 1;',
            negative: 'var x = 1;',
          },
        },
      );
    });
  });
});
