import {
  ApplyPlaybookCommand,
  ApplyPlaybookResponse,
} from '../contracts/IApplyPlaybookUseCase';

export const IPlaybookBulkApplyPortName = 'IPlaybookBulkApplyPort';

export interface IPlaybookBulkApplyPort {
  applyPlaybook(command: ApplyPlaybookCommand): Promise<ApplyPlaybookResponse>;
}
