import {
  ApplyPlaybookCommand,
  ApplyPlaybookResponse,
  IAccountsPort,
  IPlaybookChangeApplierPort,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
} from '@packmind/types';
import { ApplyPlaybookUseCase } from './ApplyPlaybookUseCase';

export class PlaybookChangeApplierAdapter implements IPlaybookChangeApplierPort {
  private applyPlaybookUseCase: ApplyPlaybookUseCase | null = null;

  async initialize(ports: {
    accountsPort: IAccountsPort;
    skillsPort: ISkillsPort;
    standardsPort: IStandardsPort;
    recipesPort: IRecipesPort;
    spacesPort: ISpacesPort;
  }): Promise<void> {
    this.applyPlaybookUseCase = new ApplyPlaybookUseCase(
      ports.accountsPort,
      ports.skillsPort,
      ports.standardsPort,
      ports.recipesPort,
      ports.spacesPort,
    );
  }

  async applyPlaybook(
    command: ApplyPlaybookCommand,
  ): Promise<ApplyPlaybookResponse> {
    if (!this.applyPlaybookUseCase) {
      throw new Error('Adapter not initialized');
    }
    return this.applyPlaybookUseCase.execute(command);
  }
}
