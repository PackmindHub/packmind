import {
  ChangeProposalArtefactId,
  ChangeProposalCaptureMode,
  ChangeProposalType,
  SpaceId,
} from '@packmind/types';

import {
  ISubmitDiffsUseCase,
  SubmitDiffsCommand,
  SubmitDiffsResult,
} from '../../domain/useCases/ISubmitDiffsUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { ArtefactDiff } from '../../domain/useCases/IDiffArtefactsUseCase';

const SUPPORTED_ARTIFACT_TYPES = new Set(['command', 'skill']);

type ValidDiff = ArtefactDiff & { artifactId: string; spaceId: string };

export class SubmitDiffsUseCase implements ISubmitDiffsUseCase {
  constructor(private readonly packmindGateway: IPackmindGateway) {}

  async execute(command: SubmitDiffsCommand): Promise<SubmitDiffsResult> {
    const { groupedDiffs } = command;
    const skipped: { name: string; reason: string }[] = [];
    const validDiffs: ValidDiff[] = [];

    for (const group of groupedDiffs) {
      const firstDiff = group[0];
      if (!firstDiff) {
        continue;
      }

      if (!SUPPORTED_ARTIFACT_TYPES.has(firstDiff.artifactType)) {
        skipped.push({
          name: firstDiff.artifactName,
          reason: 'Only commands and skills are supported',
        });
        continue;
      }

      for (const diff of group) {
        if (!diff.artifactId || !diff.spaceId) {
          skipped.push({
            name: diff.artifactName,
            reason: 'Missing artifact metadata',
          });
          continue;
        }

        validDiffs.push(diff as ValidDiff);
      }
    }

    const diffsBySpaceId = new Map<string, ValidDiff[]>();
    for (const diff of validDiffs) {
      const existing = diffsBySpaceId.get(diff.spaceId) ?? [];
      existing.push(diff);
      diffsBySpaceId.set(diff.spaceId, existing);
    }

    let submitted = 0;
    let alreadySubmitted = 0;
    const errors: {
      name: string;
      message: string;
      code?: string;
      artifactType?: string;
    }[] = [];
    for (const [spaceId, diffs] of diffsBySpaceId) {
      const response = await this.packmindGateway.changeProposals.batchCreate({
        spaceId: spaceId as SpaceId,
        proposals: diffs.map((diff) => ({
          type: diff.type,
          artefactId:
            diff.artifactId as ChangeProposalArtefactId<ChangeProposalType>,
          payload: diff.payload,
          captureMode: ChangeProposalCaptureMode.commit,
        })),
      });
      submitted += response.created;
      alreadySubmitted += response.skipped;
      for (const error of response.errors) {
        errors.push({
          name: diffs[error.index].artifactName,
          message: error.message,
          code: error.code,
          artifactType: diffs[error.index].artifactType,
        });
      }
    }

    return { submitted, alreadySubmitted, skipped, errors };
  }
}
