import { StandardsIndexService } from './StandardsIndexService';

describe('StandardsIndexService', () => {
  let service: StandardsIndexService;

  beforeEach(() => {
    service = new StandardsIndexService();
  });

  describe('buildStandardsIndex', () => {
    it('generates standards index with header and footer', () => {
      const standardVersions = [
        {
          name: 'Test Standard',
          slug: 'test-standard',
          summary: 'A test standard for testing',
        },
      ];

      const result = service.buildStandardsIndex(standardVersions);

      expect(result).toContain('# Packmind Standards Index');
      expect(result).toContain('## Available Standards');
      expect(result).toContain(
        '*This standards index was automatically generated from deployed standard versions.*',
      );
    });

    it('lists standards with summaries', () => {
      const standardVersions = [
        {
          name: 'Standard One',
          slug: 'standard-one',
          summary: 'First standard summary',
        },
        {
          name: 'Standard Two',
          slug: 'standard-two',
          summary: 'Second standard summary',
        },
      ];

      const result = service.buildStandardsIndex(standardVersions);

      expect(result).toContain(
        '- [Standard One](./standards/standard-one.md) : First standard summary',
      );
      expect(result).toContain(
        '- [Standard Two](./standards/standard-two.md) : Second standard summary',
      );
    });

    describe('when summary is null', () => {
      it('uses standard name as summary', () => {
        const standardVersions = [
          {
            name: 'Standard Without Summary',
            slug: 'no-summary',
            summary: null,
          },
        ];

        const result = service.buildStandardsIndex(standardVersions);

        expect(result).toContain(
          '- [Standard Without Summary](./standards/no-summary.md) : Standard Without Summary',
        );
      });
    });

    describe('when summary is empty string', () => {
      it('uses standard name as summary', () => {
        const standardVersions = [
          {
            name: 'Standard With Empty Summary',
            slug: 'empty-summary',
            summary: '  ',
          },
        ];

        const result = service.buildStandardsIndex(standardVersions);

        expect(result).toContain(
          '- [Standard With Empty Summary](./standards/empty-summary.md) : Standard With Empty Summary',
        );
      });
    });

    it('sorts standards alphabetically by name', () => {
      const standardVersions = [
        {
          name: 'Zebra Standard',
          slug: 'zebra',
          summary: 'Last alphabetically',
        },
        {
          name: 'Apple Standard',
          slug: 'apple',
          summary: 'First alphabetically',
        },
        {
          name: 'Middle Standard',
          slug: 'middle',
          summary: 'Middle alphabetically',
        },
      ];

      const result = service.buildStandardsIndex(standardVersions);

      const lines = result.split('\n');
      const standardLines = lines.filter((line) => line.startsWith('- ['));

      expect(standardLines[0]).toContain('Apple Standard');
      expect(standardLines[1]).toContain('Middle Standard');
      expect(standardLines[2]).toContain('Zebra Standard');
    });

    it('handles empty standards list', () => {
      const result = service.buildStandardsIndex([]);

      expect(result).toContain('No standards available.');
    });
  });
});
