import { createPatch, applyPatch } from 'diff';

type DiffResult = { success: true; value: string } | { success: false };

export class DiffService {
  applyLineDiff(
    oldValue: string,
    newValue: string,
    currentValue: string,
  ): DiffResult {
    const patch = createPatch('field', oldValue, newValue);
    const result = applyPatch(currentValue, patch);

    if (result === false) {
      return { success: false };
    }

    return { success: true, value: result };
  }

  hasConflict(
    oldValue: string,
    newValue: string,
    currentValue: string,
  ): boolean {
    const result = this.applyLineDiff(oldValue, newValue, currentValue);
    return !result.success;
  }
}
