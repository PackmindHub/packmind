import { DiffService } from './DiffService';

describe('DiffService', () => {
  const diffService = new DiffService();

  describe('applyLineDiff', () => {
    it('applies a simple change when current matches old', () => {
      const result = diffService.applyLineDiff(
        'hello world',
        'hello universe',
        'hello world',
      );

      expect(result).toEqual({ success: true, value: 'hello universe' });
    });

    it('merges non-conflicting changes from distant lines', () => {
      const lines = Array.from({ length: 20 }, (_, i) => `line${i + 1}`);
      const oldValue = lines.join('\n') + '\n';

      const proposalLines = [...lines];
      proposalLines[2] = 'modified-line3';
      const newValue = proposalLines.join('\n') + '\n';

      const currentLines = [...lines];
      currentLines[18] = 'changed-line19';
      const currentValue = currentLines.join('\n') + '\n';

      const expectedLines = [...lines];
      expectedLines[2] = 'modified-line3';
      expectedLines[18] = 'changed-line19';
      const expectedValue = expectedLines.join('\n') + '\n';

      const result = diffService.applyLineDiff(
        oldValue,
        newValue,
        currentValue,
      );

      expect(result).toEqual({
        success: true,
        value: expectedValue,
      });
    });

    it('returns success false on conflicting changes', () => {
      const oldValue = 'line1\nline2\nline3';
      const newValue = 'line1\nchanged-by-proposal\nline3';
      const currentValue = 'line1\nchanged-by-someone-else\nline3';

      const result = diffService.applyLineDiff(
        oldValue,
        newValue,
        currentValue,
      );

      expect(result).toEqual({ success: false });
    });
  });

  describe('hasConflict', () => {
    it('returns false for non-conflicting changes', () => {
      const result = diffService.hasConflict(
        'hello world',
        'hello universe',
        'hello world',
      );

      expect(result).toBe(false);
    });

    it('returns true for conflicting changes', () => {
      const oldValue = 'line1\nline2\nline3';
      const newValue = 'line1\nchanged-by-proposal\nline3';
      const currentValue = 'line1\nchanged-by-someone-else\nline3';

      const result = diffService.hasConflict(oldValue, newValue, currentValue);

      expect(result).toBe(true);
    });
  });
});
