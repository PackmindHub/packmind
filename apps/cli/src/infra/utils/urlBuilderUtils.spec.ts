import { resolveUrlBuilder } from './urlBuilderUtils';

jest.mock('./credentials', () => ({
  loadApiKey: jest.fn(),
  decodeApiKey: jest.fn(),
}));

import { loadApiKey, decodeApiKey } from './credentials';

const mockLoadApiKey = loadApiKey as jest.MockedFunction<typeof loadApiKey>;
const mockDecodeApiKey = decodeApiKey as jest.MockedFunction<
  typeof decodeApiKey
>;

describe('resolveUrlBuilder', () => {
  afterEach(() => jest.resetAllMocks());

  describe('when no API key', () => {
    it('returns null-builder', () => {
      mockLoadApiKey.mockReturnValue(null);
      const builder = resolveUrlBuilder((id) => `skills/${id}/files`);
      expect(builder('my-space', 'my-skill')).toBeNull();
    });
  });

  describe('when decoded key has no host', () => {
    it('returns null-builder', () => {
      mockLoadApiKey.mockReturnValue('key');
      mockDecodeApiKey.mockReturnValue({
        host: '',
        jwt: {
          organization: { id: '1', name: 'Org', slug: 'org', role: 'admin' },
        },
      });
      const builder = resolveUrlBuilder((id) => `skills/${id}/files`);
      expect(builder('my-space', 'my-skill')).toBeNull();
    });
  });

  describe('when decoded key has no org slug', () => {
    it('returns null-builder', () => {
      mockLoadApiKey.mockReturnValue('key');
      mockDecodeApiKey.mockReturnValue({
        host: 'https://app.packmind.com',
        jwt: {},
      });
      const builder = resolveUrlBuilder((id) => `skills/${id}/files`);
      expect(builder('my-space', 'my-skill')).toBeNull();
    });
  });

  it('builds correct URL for skills', () => {
    mockLoadApiKey.mockReturnValue('key');
    mockDecodeApiKey.mockReturnValue({
      host: 'https://app.packmind.com',
      jwt: {
        organization: { id: '1', name: 'Org', slug: 'my-org', role: 'admin' },
      },
    });

    const builder = resolveUrlBuilder((id) => `skills/${id}/files`);
    expect(builder('my-space', 'my-skill')).toBe(
      'https://app.packmind.com/org/my-org/space/my-space/skills/my-skill/files',
    );
  });

  it('builds correct URL for commands', () => {
    mockLoadApiKey.mockReturnValue('key');
    mockDecodeApiKey.mockReturnValue({
      host: 'https://app.packmind.com',
      jwt: {
        organization: { id: '1', name: 'Org', slug: 'my-org', role: 'admin' },
      },
    });

    const builder = resolveUrlBuilder((id) => `commands/${id}`);
    expect(builder('my-space', 'cmd-123')).toBe(
      'https://app.packmind.com/org/my-org/space/my-space/commands/cmd-123',
    );
  });
});
