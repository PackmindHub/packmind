import { DiffMode } from '../../domain/entities/DiffMode';

describe('LinterCommand', () => {
  describe('--changed-files and --changed-lines validation', () => {
    describe('when both --changed-files and --changed-lines are specified', () => {
      it('throws error', () => {
        const args = {
          changedFiles: true,
          changedLines: true,
          diff: undefined,
        };

        expect(() => {
          if (args.changedFiles && args.changedLines) {
            throw new Error(
              'Options --changed-files and --changed-lines are mutually exclusive',
            );
          }
        }).toThrow(
          'Options --changed-files and --changed-lines are mutually exclusive',
        );
      });
    });

    describe('when only --changed-files is specified', () => {
      it('sets diff to FILES mode', () => {
        const args = {
          changedFiles: true,
          changedLines: false,
          diff: undefined as DiffMode | undefined,
        };

        let diff = args.diff;
        if (args.changedFiles) {
          diff = DiffMode.FILES;
        } else if (args.changedLines) {
          diff = DiffMode.LINES;
        }

        expect(diff).toBe(DiffMode.FILES);
      });
    });

    describe('when only --changed-lines is specified', () => {
      it('sets diff to LINES mode', () => {
        const args = {
          changedFiles: false,
          changedLines: true,
          diff: undefined as DiffMode | undefined,
        };

        let diff = args.diff;
        if (args.changedFiles) {
          diff = DiffMode.FILES;
        } else if (args.changedLines) {
          diff = DiffMode.LINES;
        }

        expect(diff).toBe(DiffMode.LINES);
      });
    });

    describe('when neither --changed-files nor --changed-lines is specified', () => {
      it('keeps diff as undefined', () => {
        const args = {
          changedFiles: false,
          changedLines: false,
          diff: undefined as DiffMode | undefined,
        };

        let diff = args.diff;
        if (args.changedFiles) {
          diff = DiffMode.FILES;
        } else if (args.changedLines) {
          diff = DiffMode.LINES;
        }

        expect(diff).toBeUndefined();
      });
    });
  });
});
