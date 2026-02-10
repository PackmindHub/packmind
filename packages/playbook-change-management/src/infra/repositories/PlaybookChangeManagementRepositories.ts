import { IPlaybookChangeManagementRepositories } from '../../domain/repositories/IPlaybookChangeManagementRepositories';
import { IChangeProposalRepository } from '../../domain/repositories/IChangeProposalRepository';
import { ChangeProposalCacheRepository } from './ChangeProposalCacheRepository';

export class PlaybookChangeManagementRepositories implements IPlaybookChangeManagementRepositories {
  private readonly changeProposalRepository: IChangeProposalRepository;

  constructor() {
    this.changeProposalRepository = new ChangeProposalCacheRepository();
  }

  getChangeProposalRepository(): IChangeProposalRepository {
    return this.changeProposalRepository;
  }
}
