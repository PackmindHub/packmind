import { PackmindCommand } from '@packmind/types';
import { StandardVersionId } from '@packmind/types';
import { IUseCase } from '@packmind/types';

export interface UpdateStandardVersionSummaryCommand extends PackmindCommand {
  standardVersionId: StandardVersionId;
  summary: string;
}

export type IUpdateStandardVersionSummary = IUseCase<
  UpdateStandardVersionSummaryCommand,
  StandardVersionId
>;
