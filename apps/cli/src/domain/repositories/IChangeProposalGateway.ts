import { Gateway, IBatchCreateChangeProposalsUseCase } from '@packmind/types';

export interface IChangeProposalGateway {
  batchCreate: Gateway<IBatchCreateChangeProposalsUseCase>;
}
