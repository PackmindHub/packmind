import { IPublicUseCase } from '@packmind/types';

import { ArtefactDiff } from './IDiffArtefactsUseCase';

export type SubmitDiffsCommand = {
  groupedDiffs: ArtefactDiff[][];
};

export type SubmitDiffsResult = {
  submitted: number;
  alreadySubmitted: number;
  skipped: { name: string; reason: string }[];
  errors: {
    name: string;
    message: string;
    code?: string;
    artifactType?: string;
  }[];
};

export type ISubmitDiffsUseCase = IPublicUseCase<
  SubmitDiffsCommand,
  SubmitDiffsResult
>;
