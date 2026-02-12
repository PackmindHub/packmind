import { IPublicUseCase } from '@packmind/types';

import { ArtefactDiff } from './IDiffArtefactsUseCase';

export type SubmitDiffsCommand = {
  groupedDiffs: ArtefactDiff[][];
};

export type SubmitDiffsResult = {
  submitted: number;
  skipped: { name: string; reason: string }[];
};

export type ISubmitDiffsUseCase = IPublicUseCase<
  SubmitDiffsCommand,
  SubmitDiffsResult
>;
