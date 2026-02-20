import { DetectionSeverity } from '@packmind/types';
import { DiffViolationFilterService } from './DiffViolationFilterService';
import { LintViolation } from '../../domain/entities/LintViolation';
import { ModifiedLine } from '../../domain/entities/DiffMode';

describe('DiffViolationFilterService', () => {
  let service: DiffViolationFilterService;

  beforeEach(() => {
    service = new DiffViolationFilterService();
  });

  describe('filterByFiles', () => {
    describe('when violations match modified files', () => {
      let result: LintViolation[];

      beforeEach(() => {
        const violations: LintViolation[] = [
          {
            file: '/path/to/file1.ts',
            violations: [
              {
                line: 10,
                character: 5,
                rule: 'rule1',
                standard: 'standard1',
                severity: DetectionSeverity.ERROR,
              },
            ],
          },
          {
            file: '/path/to/file2.ts',
            violations: [
              {
                line: 20,
                character: 10,
                rule: 'rule2',
                standard: 'standard2',
                severity: DetectionSeverity.ERROR,
              },
            ],
          },
        ];
        const modifiedFiles = ['/path/to/file1.ts'];

        result = service.filterByFiles(violations, modifiedFiles);
      });

      it('returns one violation', () => {
        expect(result).toHaveLength(1);
      });

      it('returns the matching file', () => {
        expect(result[0].file).toBe('/path/to/file1.ts');
      });
    });

    describe('when no violations match modified files', () => {
      it('returns empty array', () => {
        const violations: LintViolation[] = [
          {
            file: '/path/to/file1.ts',
            violations: [
              {
                line: 10,
                character: 5,
                rule: 'rule1',
                standard: 'standard1',
                severity: DetectionSeverity.ERROR,
              },
            ],
          },
        ];
        const modifiedFiles = ['/path/to/other.ts'];

        const result = service.filterByFiles(violations, modifiedFiles);

        expect(result).toHaveLength(0);
      });
    });

    describe('when modified files list is empty', () => {
      it('returns empty array', () => {
        const violations: LintViolation[] = [
          {
            file: '/path/to/file1.ts',
            violations: [
              {
                line: 10,
                character: 5,
                rule: 'rule1',
                standard: 'standard1',
                severity: DetectionSeverity.ERROR,
              },
            ],
          },
        ];
        const modifiedFiles: string[] = [];

        const result = service.filterByFiles(violations, modifiedFiles);

        expect(result).toHaveLength(0);
      });
    });

    describe('when all violations match modified files', () => {
      it('returns all violations', () => {
        const violations: LintViolation[] = [
          {
            file: '/path/to/file1.ts',
            violations: [
              {
                line: 10,
                character: 5,
                rule: 'rule1',
                standard: 'standard1',
                severity: DetectionSeverity.ERROR,
              },
            ],
          },
          {
            file: '/path/to/file2.ts',
            violations: [
              {
                line: 20,
                character: 10,
                rule: 'rule2',
                standard: 'standard2',
                severity: DetectionSeverity.ERROR,
              },
            ],
          },
        ];
        const modifiedFiles = ['/path/to/file1.ts', '/path/to/file2.ts'];

        const result = service.filterByFiles(violations, modifiedFiles);

        expect(result).toHaveLength(2);
      });
    });
  });

  describe('filterByLines', () => {
    describe('when violation is on a modified line', () => {
      let result: LintViolation[];

      beforeEach(() => {
        const violations: LintViolation[] = [
          {
            file: '/path/to/file.ts',
            violations: [
              {
                line: 15,
                character: 5,
                rule: 'rule1',
                standard: 'standard1',
                severity: DetectionSeverity.ERROR,
              },
            ],
          },
        ];
        const modifiedLines: ModifiedLine[] = [
          { file: '/path/to/file.ts', startLine: 10, lineCount: 10 },
        ];

        result = service.filterByLines(violations, modifiedLines);
      });

      it('returns one file with violations', () => {
        expect(result).toHaveLength(1);
      });

      it('returns one violation', () => {
        expect(result[0].violations).toHaveLength(1);
      });

      it('returns the violation on line 15', () => {
        expect(result[0].violations[0].line).toBe(15);
      });
    });

    describe('when violation is not on a modified line', () => {
      it('filters out the violation', () => {
        const violations: LintViolation[] = [
          {
            file: '/path/to/file.ts',
            violations: [
              {
                line: 5,
                character: 5,
                rule: 'rule1',
                standard: 'standard1',
                severity: DetectionSeverity.ERROR,
              },
            ],
          },
        ];
        const modifiedLines: ModifiedLine[] = [
          { file: '/path/to/file.ts', startLine: 10, lineCount: 10 },
        ];

        const result = service.filterByLines(violations, modifiedLines);

        expect(result).toHaveLength(0);
      });
    });

    describe('when file has no modified lines', () => {
      it('filters out all violations in that file', () => {
        const violations: LintViolation[] = [
          {
            file: '/path/to/file.ts',
            violations: [
              {
                line: 15,
                character: 5,
                rule: 'rule1',
                standard: 'standard1',
                severity: DetectionSeverity.ERROR,
              },
            ],
          },
        ];
        const modifiedLines: ModifiedLine[] = [
          { file: '/path/to/other.ts', startLine: 10, lineCount: 10 },
        ];

        const result = service.filterByLines(violations, modifiedLines);

        expect(result).toHaveLength(0);
      });
    });

    describe('when violation is at the start of modified range', () => {
      it('includes the violation', () => {
        const violations: LintViolation[] = [
          {
            file: '/path/to/file.ts',
            violations: [
              {
                line: 10,
                character: 5,
                rule: 'rule1',
                standard: 'standard1',
                severity: DetectionSeverity.ERROR,
              },
            ],
          },
        ];
        const modifiedLines: ModifiedLine[] = [
          { file: '/path/to/file.ts', startLine: 10, lineCount: 5 },
        ];

        const result = service.filterByLines(violations, modifiedLines);

        expect(result).toHaveLength(1);
      });
    });

    describe('when violation is at the end of modified range', () => {
      it('includes the violation', () => {
        const violations: LintViolation[] = [
          {
            file: '/path/to/file.ts',
            violations: [
              {
                line: 14,
                character: 5,
                rule: 'rule1',
                standard: 'standard1',
                severity: DetectionSeverity.ERROR,
              },
            ],
          },
        ];
        const modifiedLines: ModifiedLine[] = [
          { file: '/path/to/file.ts', startLine: 10, lineCount: 5 },
        ];

        const result = service.filterByLines(violations, modifiedLines);

        expect(result).toHaveLength(1);
      });
    });

    describe('when violation is just outside modified range', () => {
      it('filters out the violation', () => {
        const violations: LintViolation[] = [
          {
            file: '/path/to/file.ts',
            violations: [
              {
                line: 9,
                character: 5,
                rule: 'rule1',
                standard: 'standard1',
                severity: DetectionSeverity.ERROR,
              },
              {
                line: 15,
                character: 5,
                rule: 'rule2',
                standard: 'standard2',
                severity: DetectionSeverity.ERROR,
              },
            ],
          },
        ];
        const modifiedLines: ModifiedLine[] = [
          { file: '/path/to/file.ts', startLine: 10, lineCount: 5 },
        ];

        const result = service.filterByLines(violations, modifiedLines);

        expect(result).toHaveLength(0);
      });
    });

    describe('when file has multiple modified ranges', () => {
      let result: LintViolation[];

      beforeEach(() => {
        const violations: LintViolation[] = [
          {
            file: '/path/to/file.ts',
            violations: [
              {
                line: 5,
                character: 5,
                rule: 'rule1',
                standard: 'standard1',
                severity: DetectionSeverity.ERROR,
              },
              {
                line: 25,
                character: 5,
                rule: 'rule2',
                standard: 'standard2',
                severity: DetectionSeverity.ERROR,
              },
              {
                line: 50,
                character: 5,
                rule: 'rule3',
                standard: 'standard3',
                severity: DetectionSeverity.ERROR,
              },
            ],
          },
        ];
        const modifiedLines: ModifiedLine[] = [
          { file: '/path/to/file.ts', startLine: 1, lineCount: 10 },
          { file: '/path/to/file.ts', startLine: 20, lineCount: 10 },
        ];

        result = service.filterByLines(violations, modifiedLines);
      });

      it('returns one file with violations', () => {
        expect(result).toHaveLength(1);
      });

      it('returns two violations', () => {
        expect(result[0].violations).toHaveLength(2);
      });

      it('includes violation on line 5 from first range', () => {
        expect(result[0].violations[0].line).toBe(5);
      });

      it('includes violation on line 25 from second range', () => {
        expect(result[0].violations[1].line).toBe(25);
      });
    });

    describe('when some violations match and some do not', () => {
      let result: LintViolation[];

      beforeEach(() => {
        const violations: LintViolation[] = [
          {
            file: '/path/to/file.ts',
            violations: [
              {
                line: 15,
                character: 5,
                rule: 'rule1',
                standard: 'standard1',
                severity: DetectionSeverity.ERROR,
              },
              {
                line: 100,
                character: 5,
                rule: 'rule2',
                standard: 'standard2',
                severity: DetectionSeverity.ERROR,
              },
            ],
          },
        ];
        const modifiedLines: ModifiedLine[] = [
          { file: '/path/to/file.ts', startLine: 10, lineCount: 10 },
        ];

        result = service.filterByLines(violations, modifiedLines);
      });

      it('returns one file with violations', () => {
        expect(result).toHaveLength(1);
      });

      it('returns one matching violation', () => {
        expect(result[0].violations).toHaveLength(1);
      });

      it('returns the violation on line 15', () => {
        expect(result[0].violations[0].line).toBe(15);
      });
    });

    describe('when modified lines is empty', () => {
      it('returns empty array', () => {
        const violations: LintViolation[] = [
          {
            file: '/path/to/file.ts',
            violations: [
              {
                line: 15,
                character: 5,
                rule: 'rule1',
                standard: 'standard1',
                severity: DetectionSeverity.ERROR,
              },
            ],
          },
        ];
        const modifiedLines: ModifiedLine[] = [];

        const result = service.filterByLines(violations, modifiedLines);

        expect(result).toHaveLength(0);
      });
    });

    describe('when single line modification (lineCount = 1)', () => {
      it('includes violation on that exact line', () => {
        const violations: LintViolation[] = [
          {
            file: '/path/to/file.ts',
            violations: [
              {
                line: 10,
                character: 5,
                rule: 'rule1',
                standard: 'standard1',
                severity: DetectionSeverity.ERROR,
              },
            ],
          },
        ];
        const modifiedLines: ModifiedLine[] = [
          { file: '/path/to/file.ts', startLine: 10, lineCount: 1 },
        ];

        const result = service.filterByLines(violations, modifiedLines);

        expect(result).toHaveLength(1);
      });
    });
  });
});
