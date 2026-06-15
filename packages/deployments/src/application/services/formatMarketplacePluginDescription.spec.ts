import {
  formatMarketplacePluginDescription,
  MARKETPLACE_PLUGIN_DESCRIPTION_MAX_LENGTH,
} from './formatMarketplacePluginDescription';

describe('formatMarketplacePluginDescription', () => {
  describe('when the package description is non-empty', () => {
    it('prefixes with Packmind attribution and the space slug', () => {
      expect(
        formatMarketplacePluginDescription({
          spaceSlug: 'engineering',
          packageDescription: 'Security curated package',
        }),
      ).toBe('Packmind - space @engineering: Security curated package');
    });
  });

  describe('when the package description is undefined', () => {
    it('omits the colon and trailing payload', () => {
      expect(
        formatMarketplacePluginDescription({
          spaceSlug: 'engineering',
        }),
      ).toBe('Packmind - space @engineering');
    });
  });

  describe('when the package description is whitespace-only', () => {
    it('omits the colon and trailing payload', () => {
      expect(
        formatMarketplacePluginDescription({
          spaceSlug: 'engineering',
          packageDescription: '   ',
        }),
      ).toBe('Packmind - space @engineering');
    });
  });

  describe('when the package description carries leading or trailing whitespace', () => {
    it('trims the description before composing the output', () => {
      expect(
        formatMarketplacePluginDescription({
          spaceSlug: 'engineering',
          packageDescription: '  Security curated package  ',
        }),
      ).toBe('Packmind - space @engineering: Security curated package');
    });
  });

  describe('when the formatted output is at the cap', () => {
    it('keeps the output verbatim', () => {
      const prefix = 'Packmind - space @engineering: ';
      const tailLength =
        MARKETPLACE_PLUGIN_DESCRIPTION_MAX_LENGTH - prefix.length;
      const tail = 'A'.repeat(tailLength);

      const result = formatMarketplacePluginDescription({
        spaceSlug: 'engineering',
        packageDescription: tail,
      });

      expect(result).toBe(`${prefix}${tail}`);
    });
  });

  describe('when the formatted output exceeds the cap', () => {
    let result: string;

    beforeEach(() => {
      result = formatMarketplacePluginDescription({
        spaceSlug: 'engineering',
        packageDescription: 'A'.repeat(500),
      });
    });

    it('caps the total length at the configured maximum', () => {
      expect(result.length).toBe(MARKETPLACE_PLUGIN_DESCRIPTION_MAX_LENGTH);
    });

    it('ends with a single ellipsis character', () => {
      expect(result.endsWith('…')).toBe(true);
    });

    it('preserves the Packmind attribution prefix', () => {
      expect(result.startsWith('Packmind - space @engineering: ')).toBe(true);
    });
  });

  describe('when the cut point lands on whitespace', () => {
    it('trims trailing whitespace before appending the ellipsis', () => {
      const padding = ' '.repeat(MARKETPLACE_PLUGIN_DESCRIPTION_MAX_LENGTH);
      const description = `Short text${padding}more`;

      const result = formatMarketplacePluginDescription({
        spaceSlug: 'engineering',
        packageDescription: description,
      });

      expect(result.endsWith(' …')).toBe(false);
    });
  });
});
