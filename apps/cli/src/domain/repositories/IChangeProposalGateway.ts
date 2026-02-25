import {
  Gateway,
  IBatchCreateChangeProposalsUseCase,
  ICheckChangeProposalsUseCase,
} from '@packmind/types';

export interface IChangeProposalGateway {
  batchCreate: Gateway<IBatchCreateChangeProposalsUseCase>;
  check: Gateway<ICheckChangeProposalsUseCase>;
}
