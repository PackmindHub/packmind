export type MergeConflictRegion = {
  base: string;
  ours: string;
  theirs: string;
};

export type MergeFieldResult = {
  clean: boolean;
  merged: string;
  conflicts: MergeConflictRegion[];
};

export interface IChangeProposalMerger {
  mergeField(base: string, ours: string, theirs: string): MergeFieldResult;
}
