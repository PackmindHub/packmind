import {
  ChangeProposalArtefactId,
  ChangeProposalCaptureMode,
  ChangeProposalType,
  SpaceId,
} from '@packmind/types';

import {
  CheckDiffItemResult,
  CheckDiffsResult,
  ICheckDiffsUseCase,
  CheckDiffsCommand,
} from '../../domain/useCases/ICheckDiffsUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { ArtefactDiff } from '../../domain/useCases/IDiffArtefactsUseCase';

type ValidDiff = ArtefactDiff & { artifactId: string; spaceId: string };

const SUPPORTED_ARTIFACT_TYPES = new Set(['command', 'skill', 'standard']);

export class CheckDiffsUseCase implements ICheckDiffsUseCase {
  constructor(private readonly packmindGateway: IPackmindGateway) {}

  async execute(command: CheckDiffsCommand): Promise<CheckDiffsResult> {
    const { groupedDiffs } = command;
    const results: CheckDiffItemResult[] = [];

    const validDiffs: ValidDiff[] = [];
    const invalidDiffs: ArtefactDiff[] = [];

    for (const group of groupedDiffs) {
      for (const diff of group) {
        if (
          !SUPPORTED_ARTIFACT_TYPES.has(diff.artifactType) ||
          !diff.artifactId ||
          !diff.spaceId
        ) {
          invalidDiffs.push(diff);
          continue;
        }
        validDiffs.push(diff as ValidDiff);
      }
    }

    // Group valid diffs by spaceId for batching
    const diffsBySpaceId = new Map<string, ValidDiff[]>();
    for (const diff of validDiffs) {
      const existing = diffsBySpaceId.get(diff.spaceId) ?? [];
      existing.push(diff);
      diffsBySpaceId.set(diff.spaceId, existing);
    }

    // Check each space's diffs
    const checkedMap = new Map<ArtefactDiff, CheckDiffItemResult>();
    for (const [spaceId, diffs] of diffsBySpaceId) {
      const response = await this.packmindGateway.changeProposals.check({
        spaceId: spaceId as SpaceId,
        proposals: diffs.map((diff) => ({
          type: diff.type,
          artefactId:
            diff.artifactId as ChangeProposalArtefactId<ChangeProposalType>,
          payload: diff.payload,
          captureMode: ChangeProposalCaptureMode.commit,
        })),
      });

      for (const result of response.results) {
        const diff = diffs[result.index];
        checkedMap.set(diff, {
          diff,
          exists: result.exists,
          createdAt: result.createdAt,
          message: result.message,
        });
      }
    }

    // Build results preserving original order
    for (const group of groupedDiffs) {
      for (const diff of group) {
        const checked = checkedMap.get(diff);
        if (checked) {
          results.push(checked);
        } else {
          // Invalid diffs are treated as not existing
          results.push({ diff, exists: false, createdAt: null, message: null });
        }
      }
    }

    return { results };
  }
}
