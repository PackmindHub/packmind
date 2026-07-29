import { createPatch, applyPatch } from 'diff';
import {
  IChangeProposalMerger,
  MergeFieldResult,
} from './IChangeProposalMerger';

type DiffResult = { success: true; value: string } | { success: false };

export class DiffService implements IChangeProposalMerger {
  mergeField(base: string, ours: string, theirs: string): MergeFieldResult {
    const result = this.applyLineDiff(base, theirs, ours);

    if (result.success) {
      return { clean: true, merged: result.value, conflicts: [] };
    }

    return { clean: false, merged: ours, conflicts: [{ base, ours, theirs }] };
  }

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
    const { success } = this.applyLineDiff(oldValue, newValue, currentValue);
    return !success;
  }
}
