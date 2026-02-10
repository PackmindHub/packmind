import { IPlaybookChangeManagementRepositories } from '../../domain/repositories/IPlaybookChangeManagementRepositories';
import { ChangeProposalService } from './ChangeProposalService';

export class PlaybookChangeManagementServices {
  private readonly changeProposalService: ChangeProposalService;

  constructor(
    private readonly repositories: IPlaybookChangeManagementRepositories,
  ) {
    this.changeProposalService = new ChangeProposalService(
      this.repositories.getChangeProposalRepository(),
    );
  }

  getChangeProposalService(): ChangeProposalService {
    return this.changeProposalService;
  }
}
