import { PackmindLogger } from '@packmind/logger';
import { WithTimestamps } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import { v4 as uuidv4 } from 'uuid';
import { standardVersionFactory } from '../../../test/standardVersionFactory';
import { createStandardId } from '@packmind/types';
import { StandardVersion } from '@packmind/types';
import { StandardBookService } from './StandardBookService';

describe('StandardBookService', () => {
  let standardBookService: StandardBookService;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    stubbedLogger = stubLogger();
    standardBookService = new StandardBookService(stubbedLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('buildStandardBook', () => {
    const createStandardVersionWithTimestamp = (
      standardData: Partial<StandardVersion>,
      createdAt: string,
    ): WithTimestamps<StandardVersion> => {
      const baseStandard = standardVersionFactory(standardData);
      return {
        ...baseStandard,
        createdAt: new Date(createdAt),
        updatedAt: new Date(createdAt),
      };
    };

    it('generates correct markdown for empty list', () => {
      const result = standardBookService.buildStandardBook([]);

      expect(result).toBe(
        '# Packmind Standard Book\n\nThis standard book contains all available coding standards that can be used by AI agents (like Cursor, Claude Code, GitHub Copilot) to find and apply proven practices in coding tasks.\n\n## Available Standards\n\nNo standards available.\n\n---\n\n*This standard book was automatically generated from deployed standard versions.*',
      );
    });

    it('generates correct markdown for single standard version with description', () => {
      const standardVersions: WithTimestamps<StandardVersion>[] = [
        createStandardVersionWithTimestamp(
          {
            name: 'TypeScript Guidelines',
            slug: 'typescript-guidelines',
            description: 'Test standard version description',
            summary: null,
          },
          '2023-01-01',
        ),
      ];

      const result = standardBookService.buildStandardBook(standardVersions);

      expect(result).toBe(
        [
          '# Packmind Standard Book',
          '',
          'This standard book contains all available coding standards that can be used by AI agents (like Cursor, Claude Code, GitHub Copilot) to find and apply proven practices in coding tasks.',
          '',
          '## Available Standards',
          '',
          '- [TypeScript Guidelines](./standards/typescript-guidelines.md) : Test standard version description',
          '',
          '---',
          '',
          '*This standard book was automatically generated from deployed standard versions.*',
        ].join('\n'),
      );
    });

    describe('when AI-generated summary is available', () => {
      it('uses summary instead of description', () => {
        const standardVersions: WithTimestamps<StandardVersion>[] = [
          createStandardVersionWithTimestamp(
            {
              name: 'TypeScript Guidelines',
              slug: 'typescript-guidelines',
              description: 'Detailed description of TypeScript guidelines',
              summary:
                'Enforce consistent TypeScript configuration across projects to maintain code quality when developing features.',
            },
            '2023-01-01',
          ),
        ];

        const result = standardBookService.buildStandardBook(standardVersions);

        expect(result).toContain(
          '- [TypeScript Guidelines](./standards/typescript-guidelines.md) : Enforce consistent TypeScript configuration across projects to maintain code quality when developing features.',
        );
      });
    });

    describe('when summary is null or empty', () => {
      let result: string;

      beforeEach(() => {
        const standardVersions: WithTimestamps<StandardVersion>[] = [
          createStandardVersionWithTimestamp(
            {
              name: 'React Guidelines',
              slug: 'react-guidelines',
              description: 'React component best practices',
              summary: null,
            },
            '2023-01-01',
          ),
          createStandardVersionWithTimestamp(
            {
              name: 'Node Guidelines',
              slug: 'node-guidelines',
              description: 'Node.js development standards',
              summary: '',
            },
            '2023-01-02',
          ),
        ];

        result = standardBookService.buildStandardBook(standardVersions);
      });

      describe('when summary is null', () => {
        it('falls back to description', () => {
          expect(result).toContain(
            '- [React Guidelines](./standards/react-guidelines.md) : React component best practices',
          );
        });
      });

      describe('when summary is empty string', () => {
        it('falls back to description', () => {
          expect(result).toContain(
            '- [Node Guidelines](./standards/node-guidelines.md) : Node.js development standards',
          );
        });
      });
    });

    describe('when both summary and description are unavailable', () => {
      it('falls back to standard name', () => {
        const standardVersions: WithTimestamps<StandardVersion>[] = [
          createStandardVersionWithTimestamp(
            {
              name: 'Empty Standard',
              slug: 'empty-standard',
              description: '',
              summary: null,
            },
            '2023-01-01',
          ),
        ];

        const result = standardBookService.buildStandardBook(standardVersions);

        expect(result).toContain(
          '- [Empty Standard](./standards/empty-standard.md) : Empty Standard',
        );
      });
    });

    describe('when description is null or empty', () => {
      let result: string;

      beforeEach(() => {
        const standardVersions: WithTimestamps<StandardVersion>[] = [
          createStandardVersionWithTimestamp(
            {
              name: 'Summary Only Standard',
              slug: 'summary-only-standard',
              description: '',
              summary:
                'Apply modern JavaScript patterns to ensure code maintainability and performance.',
            },
            '2023-01-01',
          ),
          createStandardVersionWithTimestamp(
            {
              name: 'Another Summary Only',
              slug: 'another-summary-only',
              description: null as unknown as string, // Simulating null description
              summary:
                'Implement secure authentication flows when building user management systems.',
            },
            '2023-01-02',
          ),
        ];

        result = standardBookService.buildStandardBook(standardVersions);
      });

      describe('when description is empty string', () => {
        it('uses summary', () => {
          expect(result).toContain(
            '- [Summary Only Standard](./standards/summary-only-standard.md) : Apply modern JavaScript patterns to ensure code maintainability and performance.',
          );
        });
      });

      describe('when description is null', () => {
        it('uses summary', () => {
          expect(result).toContain(
            '- [Another Summary Only](./standards/another-summary-only.md) : Implement secure authentication flows when building user management systems.',
          );
        });
      });
    });

    it('handles summary with only whitespace as empty', () => {
      const standardVersions: WithTimestamps<StandardVersion>[] = [
        createStandardVersionWithTimestamp(
          {
            name: 'Whitespace Summary Standard',
            slug: 'whitespace-summary-standard',
            description:
              'Should use this description instead of whitespace summary',
            summary: '   \n\t   ', // Only whitespace
          },
          '2023-01-01',
        ),
      ];

      const result = standardBookService.buildStandardBook(standardVersions);

      expect(result).toContain(
        '- [Whitespace Summary Standard](./standards/whitespace-summary-standard.md) : Should use this description instead of whitespace summary',
      );
    });

    describe('when mixing summary and description availability', () => {
      let result: string;

      beforeEach(() => {
        const standardVersions: WithTimestamps<StandardVersion>[] = [
          createStandardVersionWithTimestamp(
            {
              name: 'With Summary',
              slug: 'with-summary',
              description:
                'This is a very detailed and long description that explains the standard in great detail with lots of technical specifications and implementation notes.',
              summary: 'Concise AI-generated summary that should be preferred.',
            },
            '2023-01-20',
          ),
          createStandardVersionWithTimestamp(
            {
              name: 'Without Summary',
              slug: 'without-summary',
              description:
                'This description should be used since no summary exists.',
              summary: null,
            },
            '2023-01-15',
          ),
          createStandardVersionWithTimestamp(
            {
              name: 'Empty Everything',
              slug: 'empty-everything',
              description: '',
              summary: '',
            },
            '2023-01-10',
          ),
        ];

        result = standardBookService.buildStandardBook(standardVersions);
      });

      describe('when summary is available', () => {
        it('uses summary even if description is longer and more detailed', () => {
          expect(result).toContain(
            '- [With Summary](./standards/with-summary.md) : Concise AI-generated summary that should be preferred.',
          );
        });
      });

      describe('when summary is null', () => {
        it('uses description', () => {
          expect(result).toContain(
            '- [Without Summary](./standards/without-summary.md) : This description should be used since no summary exists.',
          );
        });
      });

      describe('when both summary and description are empty', () => {
        it('falls back to name', () => {
          expect(result).toContain(
            '- [Empty Everything](./standards/empty-everything.md) : Empty Everything',
          );
        });
      });
    });

    it('generates correct markdown for multiple standard versions', () => {
      const standardVersions: WithTimestamps<StandardVersion>[] = [
        createStandardVersionWithTimestamp(
          {
            name: 'Code Formatting Rules',
            slug: 'code-formatting-rules',
            summary: null, // No summary, should use description
          },
          '2023-01-15',
        ),
        createStandardVersionWithTimestamp(
          {
            name: 'Testing Guidelines',
            slug: 'testing-guidelines',
            summary: null, // No summary, should use description
          },
          '2023-01-10',
        ),
      ];

      const result = standardBookService.buildStandardBook(standardVersions);

      const expected = [
        '# Packmind Standard Book',
        '',
        'This standard book contains all available coding standards that can be used by AI agents (like Cursor, Claude Code, GitHub Copilot) to find and apply proven practices in coding tasks.',
        '',
        '## Available Standards',
        '',
        '- [Code Formatting Rules](./standards/code-formatting-rules.md) : Test standard version description',
        '- [Testing Guidelines](./standards/testing-guidelines.md) : Test standard version description',
        '',
        '---',
        '',
        '*This standard book was automatically generated from deployed standard versions.*',
      ].join('\n');

      expect(result).toBe(expected);
    });

    describe('when sorting standard versions alphabetically by name', () => {
      let alphaIndex: number;
      let betaIndex: number;
      let zebraIndex: number;

      beforeEach(() => {
        const standardVersions: WithTimestamps<StandardVersion>[] = [
          createStandardVersionWithTimestamp(
            {
              name: 'Zebra Standard',
              slug: 'zebra-standard',
              summary: null,
            },
            '2023-01-30',
          ),
          createStandardVersionWithTimestamp(
            {
              name: 'Alpha Standard',
              slug: 'alpha-standard',
              summary: null,
            },
            '2023-01-10',
          ),
          createStandardVersionWithTimestamp(
            {
              name: 'Beta Standard',
              slug: 'beta-standard',
              summary: null,
            },
            '2023-01-20',
          ),
        ];

        const result = standardBookService.buildStandardBook(standardVersions);

        alphaIndex = result.indexOf('Alpha Standard');
        betaIndex = result.indexOf('Beta Standard');
        zebraIndex = result.indexOf('Zebra Standard');
      });

      it('places Alpha before Beta', () => {
        expect(alphaIndex).toBeLessThan(betaIndex);
      });

      it('places Beta before Zebra', () => {
        expect(betaIndex).toBeLessThan(zebraIndex);
      });
    });

    describe('when verifying consistent sorting regardless of input order', () => {
      let standardVersions: WithTimestamps<StandardVersion>[];
      let result1: string;
      let result2: string;
      let result3: string;

      beforeEach(() => {
        standardVersions = [
          createStandardVersionWithTimestamp(
            {
              name: 'C Standard',
              slug: 'c-standard',
              summary: null,
            },
            '2023-01-15T10:00:00.000Z',
          ),
          createStandardVersionWithTimestamp(
            {
              name: 'A Standard',
              slug: 'a-standard',
              summary: null,
            },
            '2023-01-10T10:00:00.000Z',
          ),
          createStandardVersionWithTimestamp(
            {
              name: 'B Standard',
              slug: 'b-standard',
              summary: null,
            },
            '2023-01-20T10:00:00.000Z',
          ),
        ];

        result1 = standardBookService.buildStandardBook(standardVersions);
        result2 = standardBookService.buildStandardBook(
          [...standardVersions].reverse(),
        );
        result3 = standardBookService.buildStandardBook(
          [...standardVersions].sort(() => Math.random() - 0.5),
        );
      });

      it('produces identical output for original and reversed input order', () => {
        expect(result1).toBe(result2);
      });

      it('produces identical output for original and randomized input order', () => {
        expect(result1).toBe(result3);
      });

      it('places A Standard before B Standard', () => {
        const aStandardIndex = result1.indexOf('A Standard');
        const bStandardIndex = result1.indexOf('B Standard');

        expect(aStandardIndex).toBeLessThan(bStandardIndex);
      });

      it('places B Standard before C Standard', () => {
        const bStandardIndex = result1.indexOf('B Standard');
        const cStandardIndex = result1.indexOf('C Standard');

        expect(bStandardIndex).toBeLessThan(cStandardIndex);
      });
    });

    describe('edge cases', () => {
      it('handles standards with special characters in names and slugs', () => {
        const standardVersions: WithTimestamps<StandardVersion>[] = [
          createStandardVersionWithTimestamp(
            {
              name: 'Standard with "quotes" and &symbols',
              slug: 'standard-with-quotes-and-symbols',
            },
            '2023-01-01',
          ),
        ];

        const result = standardBookService.buildStandardBook(standardVersions);

        expect(result).toContain(
          '- [Standard with "quotes" and &symbols](./standards/standard-with-quotes-and-symbols.md)',
        );
      });

      it('handles long standard names gracefully', () => {
        const longName =
          'This is a very long standard name that goes on and on and contains lots of text to test how the standard book handles lengthy names without breaking the formatting or causing any issues with the generated markdown content.';

        const standardVersions: WithTimestamps<StandardVersion>[] = [
          createStandardVersionWithTimestamp(
            {
              name: longName,
              slug: 'very-long-standard-name',
            },
            '2023-01-01',
          ),
        ];

        const result = standardBookService.buildStandardBook(standardVersions);

        expect(result).toContain(
          `- [${longName}](./standards/very-long-standard-name.md)`,
        );
      });

      describe('when handling standards with duplicate names but different IDs', () => {
        let result: string;

        beforeEach(() => {
          const standardVersions: WithTimestamps<StandardVersion>[] = [
            createStandardVersionWithTimestamp(
              {
                standardId: createStandardId(uuidv4()),
                name: 'Duplicate Name',
                slug: 'duplicate-name-1',
              },
              '2023-01-10',
            ),
            createStandardVersionWithTimestamp(
              {
                standardId: createStandardId(uuidv4()),
                name: 'Duplicate Name',
                slug: 'duplicate-name-2',
              },
              '2023-01-20',
            ),
          ];

          result = standardBookService.buildStandardBook(standardVersions);
        });

        it('includes first duplicate with its unique slug', () => {
          expect(result).toContain(
            '- [Duplicate Name](./standards/duplicate-name-1.md)',
          );
        });

        it('includes second duplicate with its unique slug', () => {
          expect(result).toContain(
            '- [Duplicate Name](./standards/duplicate-name-2.md)',
          );
        });
      });
    });
  });
});
