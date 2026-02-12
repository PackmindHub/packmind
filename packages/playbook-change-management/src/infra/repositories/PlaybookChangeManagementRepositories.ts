import { IPlaybookChangeManagementRepositories } from '../../domain/repositories/IPlaybookChangeManagementRepositories';
import { IChangeProposalRepository } from '../../domain/repositories/IChangeProposalRepository';
import { ChangeProposalRepository } from './ChangeProposalRepository';

export class PlaybookChangeManagementRepositories implements IPlaybookChangeManagementRepositories {
  private readonly changeProposalRepository: IChangeProposalRepository;

  constructor() {
    this.changeProposalRepository = new ChangeProposalRepository();
  }

  getChangeProposalRepository(): IChangeProposalRepository {
    return this.changeProposalRepository;
  }
}
