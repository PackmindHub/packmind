import {
  Gateway,
  IApplyPlaybookUseCase,
  IBatchCreateChangeProposalsUseCase,
  ICheckChangeProposalsUseCase,
} from '@packmind/types';

export interface IChangeProposalGateway {
  batchCreate: Gateway<IBatchCreateChangeProposalsUseCase>;
  batchApply: Gateway<IApplyPlaybookUseCase>;
  check: Gateway<ICheckChangeProposalsUseCase>;
}
