import { IChangeProposalRepository } from './IChangeProposalRepository';

export interface IPlaybookChangeManagementRepositories {
  getChangeProposalRepository(): IChangeProposalRepository;
}
