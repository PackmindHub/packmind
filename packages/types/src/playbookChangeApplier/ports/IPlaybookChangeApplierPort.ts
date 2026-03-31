import {
  ApplyPlaybookCommand,
  ApplyPlaybookResponse,
} from '../contracts/IApplyPlaybookUseCase';

export const IPlaybookChangeApplierPortName = 'IPlaybookChangeApplierPort';

export interface IPlaybookChangeApplierPort {
  applyPlaybook(command: ApplyPlaybookCommand): Promise<ApplyPlaybookResponse>;
}
