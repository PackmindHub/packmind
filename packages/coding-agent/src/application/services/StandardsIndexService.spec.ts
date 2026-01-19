import { StandardsIndexService } from './StandardsIndexService';

describe('StandardsIndexService', () => {
  let service: StandardsIndexService;

  beforeEach(() => {
    service = new StandardsIndexService();
  });

  describe('buildStandardsIndex', () => {
    describe('when generating index with standards', () => {
      let result: string;

      beforeEach(() => {
        const standardVersions = [
          {
            name: 'Test Standard',
            slug: 'test-standard',
            summary: 'A test standard for testing',
          },
        ];
        result = service.buildStandardsIndex(standardVersions);
      });

      it('includes the main header', () => {
        expect(result).toContain('# Packmind Standards Index');
      });

      it('includes the available standards section header', () => {
        expect(result).toContain('## Available Standards');
      });

      it('includes the auto-generated footer note', () => {
        expect(result).toContain(
          '*This standards index was automatically generated from deployed standard versions.*',
        );
      });
    });

    describe('when listing multiple standards', () => {
      let result: string;

      beforeEach(() => {
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
        result = service.buildStandardsIndex(standardVersions);
      });

      it('lists the first standard with its summary', () => {
        expect(result).toContain(
          '- [Standard One](./standards/standard-one.md) : First standard summary',
        );
      });

      it('lists the second standard with its summary', () => {
        expect(result).toContain(
          '- [Standard Two](./standards/standard-two.md) : Second standard summary',
        );
      });
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

    describe('when sorting standards alphabetically', () => {
      let standardLines: string[];

      beforeEach(() => {
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
        standardLines = lines.filter((line) => line.startsWith('- ['));
      });

      it('places Apple Standard first', () => {
        expect(standardLines[0]).toContain('Apple Standard');
      });

      it('places Middle Standard second', () => {
        expect(standardLines[1]).toContain('Middle Standard');
      });

      it('places Zebra Standard last', () => {
        expect(standardLines[2]).toContain('Zebra Standard');
      });
    });

    it('handles empty standards list', () => {
      const result = service.buildStandardsIndex([]);

      expect(result).toContain('No standards available.');
    });
  });
});
