import { DataSource } from 'typeorm';
import { IPlaybookChangeManagementRepositories } from '../../domain/repositories/IPlaybookChangeManagementRepositories';
import { IChangeProposalRepository } from '../../domain/repositories/IChangeProposalRepository';
import { ChangeProposalCacheRepository } from './ChangeProposalCacheRepository';
import { ChangeProposalRepository } from './ChangeProposalRepository';

export class PlaybookChangeManagementRepositories implements IPlaybookChangeManagementRepositories {
  private readonly changeProposalRepository: IChangeProposalRepository;

  constructor(dataSource?: DataSource) {
    this.changeProposalRepository = dataSource
      ? new ChangeProposalRepository()
      : new ChangeProposalCacheRepository();
  }

  getChangeProposalRepository(): IChangeProposalRepository {
    return this.changeProposalRepository;
  }
}
