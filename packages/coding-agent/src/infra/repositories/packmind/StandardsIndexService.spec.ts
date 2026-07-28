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
            description: 'A test standard for testing',
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
            description: 'First standard description',
          },
          {
            name: 'Standard Two',
            slug: 'standard-two',
            description: 'Second standard description',
          },
        ];
        result = service.buildStandardsIndex(standardVersions);
      });

      it('lists the first standard with its description', () => {
        expect(result).toContain(
          '- [Standard One](./standards/standard-one.md) : First standard description',
        );
      });

      it('lists the second standard with its description', () => {
        expect(result).toContain(
          '- [Standard Two](./standards/standard-two.md) : Second standard description',
        );
      });
    });

    describe('when description is null', () => {
      it('uses standard name as description', () => {
        const standardVersions = [
          {
            name: 'Standard Without Description',
            slug: 'no-description',
            description: null,
          },
        ];

        const result = service.buildStandardsIndex(standardVersions);

        expect(result).toContain(
          '- [Standard Without Description](./standards/no-description.md) : Standard Without Description',
        );
      });
    });

    describe('when description is empty string', () => {
      it('uses standard name as description', () => {
        const standardVersions = [
          {
            name: 'Standard With Empty Description',
            slug: 'empty-description',
            description: '  ',
          },
        ];

        const result = service.buildStandardsIndex(standardVersions);

        expect(result).toContain(
          '- [Standard With Empty Description](./standards/empty-description.md) : Standard With Empty Description',
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
            description: 'Last alphabetically',
          },
          {
            name: 'Apple Standard',
            slug: 'apple',
            description: 'First alphabetically',
          },
          {
            name: 'Middle Standard',
            slug: 'middle',
            description: 'Middle alphabetically',
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
