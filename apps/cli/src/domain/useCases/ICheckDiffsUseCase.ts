import { IPublicUseCase } from '@packmind/types';

import { ArtefactDiff } from './IDiffArtefactsUseCase';

export type CheckDiffsCommand = {
  groupedDiffs: ArtefactDiff[][];
};

export type CheckDiffItemResult = {
  diff: ArtefactDiff;
  exists: boolean;
  createdAt: string | null;
};

export type CheckDiffsResult = {
  results: CheckDiffItemResult[];
};

export type ICheckDiffsUseCase = IPublicUseCase<
  CheckDiffsCommand,
  CheckDiffsResult
>;
