import { PackmindCommand, StandardVersionId } from '@packmind/shared';
import { IUseCase } from '@packmind/shared';

export interface UpdateStandardVersionSummaryCommand extends PackmindCommand {
  standardVersionId: StandardVersionId;
  summary: string;
}

export type IUpdateStandardVersionSummary = IUseCase<
  UpdateStandardVersionSummaryCommand,
  StandardVersionId
>;
