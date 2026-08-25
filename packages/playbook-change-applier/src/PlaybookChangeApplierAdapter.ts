import { instrumentUseCases } from '@packmind/node-utils';
import {
  ApplyPlaybookCommand,
  ApplyPlaybookResponse,
  IAccountsPort,
  IPlaybookChangeApplierPort,
  ICommandsPort,
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
    recipesPort: ICommandsPort;
    spacesPort: ISpacesPort;
  }): Promise<void> {
    this.applyPlaybookUseCase = new ApplyPlaybookUseCase(
      ports.accountsPort,
      ports.skillsPort,
      ports.standardsPort,
      ports.recipesPort,
      ports.spacesPort,
    );

    // Use cases have no base class to hook the way repositories and services
    // do, and this is where every one of the domain's use cases is built - see
    // docker/otel/README.md.
    instrumentUseCases(this);
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
