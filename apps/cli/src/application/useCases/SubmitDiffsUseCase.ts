import { ChangeProposalCaptureMode, ChangeProposalType } from '@packmind/types';

import {
  ISubmitDiffsUseCase,
  SubmitDiffsCommand,
  SubmitDiffsResult,
} from '../../domain/useCases/ISubmitDiffsUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { ArtefactDiff } from '../../domain/useCases/IDiffArtefactsUseCase';

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

      if (firstDiff.artifactType !== 'command') {
        skipped.push({
          name: firstDiff.artifactName,
          reason: 'Only commands are supported',
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
    for (const [spaceId, diffs] of diffsBySpaceId) {
      const response =
        await this.packmindGateway.changeProposals.batchCreateChangeProposals({
          spaceId,
          proposals: diffs.map((diff) => ({
            type: ChangeProposalType.updateCommandDescription,
            artefactId: diff.artifactId,
            payload: diff.payload as { oldValue: string; newValue: string },
            captureMode: ChangeProposalCaptureMode.commit,
          })),
        });
      submitted += response.created;
    }

    return { submitted, skipped };
  }
}
