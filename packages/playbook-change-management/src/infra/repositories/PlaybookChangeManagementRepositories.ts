import { DataSource } from 'typeorm';
import { IPlaybookChangeManagementRepositories } from '../../domain/repositories/IPlaybookChangeManagementRepositories';
import { IChangeProposalRepository } from '../../domain/repositories/IChangeProposalRepository';
import { ChangeProposalRepository } from './ChangeProposalRepository';
import { ChangeProposalSchema } from '../schemas/ChangeProposalSchema';

export class PlaybookChangeManagementRepositories implements IPlaybookChangeManagementRepositories {
  private readonly changeProposalRepository: IChangeProposalRepository;

  constructor(dataSource: DataSource) {
    this.changeProposalRepository = new ChangeProposalRepository(
      dataSource.getRepository(ChangeProposalSchema),
    );
  }

  getChangeProposalRepository(): IChangeProposalRepository {
    return this.changeProposalRepository;
  }
}
