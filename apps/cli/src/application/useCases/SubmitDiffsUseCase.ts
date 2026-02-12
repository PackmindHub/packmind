import { ChangeProposalCaptureMode, ChangeProposalType } from '@packmind/types';

import {
  ISubmitDiffsUseCase,
  SubmitDiffsCommand,
  SubmitDiffsResult,
} from '../../domain/useCases/ISubmitDiffsUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';

export class SubmitDiffsUseCase implements ISubmitDiffsUseCase {
  constructor(private readonly packmindGateway: IPackmindGateway) {}

  async execute(command: SubmitDiffsCommand): Promise<SubmitDiffsResult> {
    const { groupedDiffs } = command;
    let submitted = 0;
    const skipped: { name: string; reason: string }[] = [];
    const submittedKeys = new Set<string>();

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

        const dedupKey = JSON.stringify({
          artifactId: diff.artifactId,
          type: diff.type,
          payload: diff.payload,
        });

        if (submittedKeys.has(dedupKey)) {
          continue;
        }

        submittedKeys.add(dedupKey);

        await this.packmindGateway.changeProposals.createChangeProposal({
          spaceId: diff.spaceId,
          type: ChangeProposalType.updateCommandDescription,
          artefactId: diff.artifactId,
          payload: diff.payload as { oldValue: string; newValue: string },
          captureMode: ChangeProposalCaptureMode.commit,
        });

        submitted++;
      }
    }

    return { submitted, skipped };
  }
}
