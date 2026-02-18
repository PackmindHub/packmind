import { DataSource } from 'typeorm';
import { IPlaybookChangeManagementRepositories } from '../../domain/repositories/IPlaybookChangeManagementRepositories';
import { ChangeProposalService } from './ChangeProposalService';
import { ConflictDetectionService } from './ConflictDetectionService';
import { DiffService } from './DiffService';

export class PlaybookChangeManagementServices {
  private readonly changeProposalService: ChangeProposalService;
  private readonly diffService: DiffService;
  private readonly conflictDetectionService: ConflictDetectionService;

  constructor(
    private readonly repositories: IPlaybookChangeManagementRepositories,
    private readonly dataSource: DataSource,
  ) {
    this.changeProposalService = new ChangeProposalService(
      this.repositories.getChangeProposalRepository(),
      this.dataSource,
    );
    this.diffService = new DiffService();
    this.conflictDetectionService = new ConflictDetectionService(
      this.diffService,
    );
  }

  getChangeProposalService(): ChangeProposalService {
    return this.changeProposalService;
  }

  getConflictDetectionService(): ConflictDetectionService {
    return this.conflictDetectionService;
  }
}
