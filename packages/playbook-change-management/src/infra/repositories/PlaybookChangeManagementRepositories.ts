import { DataSource } from 'typeorm';
import { IPlaybookChangeManagementRepositories } from '../../domain/repositories/IPlaybookChangeManagementRepositories';
import { IChangeProposalRepository } from '../../domain/repositories/IChangeProposalRepository';
import { ChangeProposalCacheRepository } from './ChangeProposalCacheRepository';
import { ChangeProposalDatabaseRepository } from './ChangeProposalDatabaseRepository';

export class PlaybookChangeManagementRepositories implements IPlaybookChangeManagementRepositories {
  private readonly changeProposalRepository: IChangeProposalRepository;

  constructor(dataSource?: DataSource) {
    this.changeProposalRepository = dataSource
      ? new ChangeProposalDatabaseRepository(dataSource)
      : new ChangeProposalCacheRepository();
  }

  getChangeProposalRepository(): IChangeProposalRepository {
    return this.changeProposalRepository;
  }
}
