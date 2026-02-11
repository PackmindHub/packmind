import { DiffService } from './DiffService';

describe('DiffService', () => {
  let diffService: DiffService;

  beforeEach(() => {
    diffService = new DiffService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('applyLineDiff', () => {
    describe('when the diff applies cleanly', () => {
      it('returns success with the patched value', () => {
        const oldValue = 'line 1\nline 2\nline 3';
        const newValue = 'line 1\nline 2 modified\nline 3';
        const currentValue = 'line 1\nline 2\nline 3';

        const result = diffService.applyLineDiff(
          oldValue,
          newValue,
          currentValue,
        );

        expect(result).toEqual({
          success: true,
          value: 'line 1\nline 2 modified\nline 3',
        });
      });
    });

    describe('when the current value has non-conflicting changes', () => {
      it('returns success with both changes merged', () => {
        const oldValue = 'line 1\nline 2\nline 3';
        const newValue = 'line 1\nline 2 modified\nline 3';
        const currentValue = 'line 1\nline 2\nline 3\nline 4';

        const result = diffService.applyLineDiff(
          oldValue,
          newValue,
          currentValue,
        );

        expect(result).toEqual({
          success: true,
          value: 'line 1\nline 2 modified\nline 3\nline 4',
        });
      });
    });

    describe('when the diff conflicts with current value', () => {
      it('returns failure', () => {
        const oldValue = 'line 1\nline 2\nline 3';
        const newValue = 'line 1\nline 2 modified\nline 3';
        const currentValue = 'line 1\nline 2 changed\nline 3';

        const result = diffService.applyLineDiff(
          oldValue,
          newValue,
          currentValue,
        );

        expect(result).toEqual({ success: false });
      });
    });

    describe('when old and new values are identical', () => {
      it('returns success with the current value unchanged', () => {
        const oldValue = 'line 1\nline 2\nline 3';
        const newValue = 'line 1\nline 2\nline 3';
        const currentValue = 'line 1\nline 2\nline 3\nline 4';

        const result = diffService.applyLineDiff(
          oldValue,
          newValue,
          currentValue,
        );

        expect(result).toEqual({
          success: true,
          value: 'line 1\nline 2\nline 3\nline 4',
        });
      });
    });
  });

  describe('hasConflict', () => {
    describe('when the diff applies cleanly', () => {
      it('returns false', () => {
        const oldValue = 'line 1\nline 2\nline 3';
        const newValue = 'line 1\nline 2 modified\nline 3';
        const currentValue = 'line 1\nline 2\nline 3';

        const result = diffService.hasConflict(
          oldValue,
          newValue,
          currentValue,
        );

        expect(result).toBe(false);
      });
    });

    describe('when the diff conflicts', () => {
      it('returns true', () => {
        const oldValue = 'line 1\nline 2\nline 3';
        const newValue = 'line 1\nline 2 modified\nline 3';
        const currentValue = 'line 1\nline 2 changed\nline 3';

        const result = diffService.hasConflict(
          oldValue,
          newValue,
          currentValue,
        );

        expect(result).toBe(true);
      });
    });
  });
});
