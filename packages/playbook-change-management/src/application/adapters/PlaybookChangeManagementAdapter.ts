import { PackmindLogger } from '@packmind/logger';
import { IBaseAdapter } from '@packmind/node-utils';
import {
  ApplyChangeProposalsCommand,
  ApplyChangeProposalsResponse,
  BatchCreateChangeProposalsCommand,
  BatchCreateChangeProposalsResponse,
  ChangeProposalType,
  CreateChangeProposalCommand,
  CreateChangeProposalResponse,
  IAccountsPort,
  IAccountsPortName,
  IPlaybookChangeManagementPort,
  IRecipesPort,
  IRecipesPortName,
  ISkillsPort,
  ISkillsPortName,
  ISpacesPort,
  ISpacesPortName,
  IStandardsPort,
  IStandardsPortName,
  ListChangeProposalsByArtefactCommand,
  ListChangeProposalsByArtefactResponse,
  ListChangeProposalsBySpaceCommand,
  ListChangeProposalsBySpaceResponse,
  RecipeId,
  SkillId,
  StandardId,
} from '@packmind/types';
import { PlaybookChangeManagementServices } from '../services/PlaybookChangeManagementServices';
import { ApplyChangeProposalsUseCase } from '../useCases/applyChangeProposals/ApplyChangeProposalsUseCase';
import { CreateChangeProposalUseCase } from '../useCases/createChangeProposal/CreateChangeProposalUseCase';
import { ListChangeProposalsByArtefactUseCase } from '../useCases/listChangeProposalsByArtefact/ListChangeProposalsByArtefactUseCase';
import { ListChangeProposalsBySpaceUseCase } from '../useCases/listChangeProposalsBySpace/ListChangeProposalsBySpaceUseCase';
import { BatchCreateChangeProposalsUseCase } from '../useCases/batchCreateChangeProposals/BatchCreateChangeProposalsUseCase';
import { IChangeProposalValidator } from '../validators/IChangeProposalValidator';
import { CommandChangeProposalValidator } from '../validators/CommandChangeProposalValidator';
import { SkillChangeProposalValidator } from '../validators/SkillChangeProposalValidator';
import { StandardChangeProposalValidator } from '../validators/StandardChangeProposalValidator';

const origin = 'PlaybookChangeManagementAdapter';

export class PlaybookChangeManagementAdapter
  implements
    IBaseAdapter<IPlaybookChangeManagementPort>,
    IPlaybookChangeManagementPort
{
  private _applyChangeProposals!: ApplyChangeProposalsUseCase<
    StandardId | RecipeId | SkillId
  >;
  private _batchCreateChangeProposals!: BatchCreateChangeProposalsUseCase;
  private _createChangeProposal!: CreateChangeProposalUseCase;
  private _listChangeProposalsByArtefact!: ListChangeProposalsByArtefactUseCase<
    StandardId | RecipeId | SkillId
  >;
  private _listChangeProposalsBySpace!: ListChangeProposalsBySpaceUseCase;

  constructor(
    private readonly services: PlaybookChangeManagementServices,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async applyChangeProposals<T extends StandardId | RecipeId | SkillId>(
    command: ApplyChangeProposalsCommand<T>,
  ): Promise<ApplyChangeProposalsResponse<T>> {
    return this._applyChangeProposals.execute(command);
  }

  async batchCreateChangeProposals(
    command: BatchCreateChangeProposalsCommand,
  ): Promise<BatchCreateChangeProposalsResponse> {
    return this._batchCreateChangeProposals.execute(command);
  }

  async createChangeProposal<T extends ChangeProposalType>(
    command: CreateChangeProposalCommand<T>,
  ): Promise<CreateChangeProposalResponse<T>> {
    return this._createChangeProposal.execute(
      command as CreateChangeProposalCommand<ChangeProposalType>,
    ) as Promise<CreateChangeProposalResponse<T>>;
  }

  async listChangeProposalsByArtefact<
    T extends StandardId | RecipeId | SkillId,
  >(
    command: ListChangeProposalsByArtefactCommand<T>,
  ): Promise<ListChangeProposalsByArtefactResponse> {
    return this._listChangeProposalsByArtefact.execute(command);
  }

  async listChangeProposalsBySpace(
    command: ListChangeProposalsBySpaceCommand,
  ): Promise<ListChangeProposalsBySpaceResponse> {
    return this._listChangeProposalsBySpace.execute(command);
  }

  public async initialize(ports: {
    [IAccountsPortName]: IAccountsPort;
    [IRecipesPortName]: IRecipesPort;
    [ISpacesPortName]: ISpacesPort;
    [ISkillsPortName]: ISkillsPort;
    [IStandardsPortName]: IStandardsPort;
  }): Promise<void> {
    this.logger.info('Initializing PlaybookChangeManagementAdapter with ports');

    const accountsPort = ports[IAccountsPortName];

    if (!accountsPort) {
      throw new Error(
        'PlaybookChangeManagementAdapter: IAccountsPort not provided',
      );
    }

    const recipesPort = ports[IRecipesPortName];

    if (!recipesPort) {
      throw new Error(
        'PlaybookChangeManagementAdapter: IRecipesPort not provided',
      );
    }

    const spacesPort = ports[ISpacesPortName];

    if (!spacesPort) {
      throw new Error(
        'PlaybookChangeManagementAdapter: ISpacesPort not provided',
      );
    }

    const skillsPort = ports[ISkillsPortName];

    if (!skillsPort) {
      throw new Error(
        'PlaybookChangeManagementAdapter: ISkillsPort not provided',
      );
    }

    const standardsPort = ports[IStandardsPortName];

    if (!standardsPort) {
      throw new Error(
        'PlaybookChangeManagementAdapter: IStandardsPort not provided',
      );
    }

    const changeProposalService = this.services.getChangeProposalService();
    const conflictDetectionService =
      this.services.getConflictDetectionService();

    const validators: IChangeProposalValidator[] = [
      new CommandChangeProposalValidator(recipesPort),
      new SkillChangeProposalValidator(skillsPort),
      new StandardChangeProposalValidator(standardsPort),
    ];

    this._applyChangeProposals = new ApplyChangeProposalsUseCase(
      accountsPort,
      spacesPort,
      standardsPort,
      recipesPort,
      skillsPort,
      changeProposalService,
    );

    this._batchCreateChangeProposals = new BatchCreateChangeProposalsUseCase(
      accountsPort,
      this,
    );

    this._createChangeProposal = new CreateChangeProposalUseCase(
      accountsPort,
      spacesPort,
      changeProposalService,
      validators,
    );

    this._listChangeProposalsByArtefact =
      new ListChangeProposalsByArtefactUseCase(
        accountsPort,
        spacesPort,
        standardsPort,
        recipesPort,
        skillsPort,
        changeProposalService,
        conflictDetectionService,
      );

    this._listChangeProposalsBySpace = new ListChangeProposalsBySpaceUseCase(
      accountsPort,
      spacesPort,
      standardsPort,
      recipesPort,
      skillsPort,
      changeProposalService,
    );

    this.logger.info(
      'PlaybookChangeManagementAdapter initialized successfully',
    );
  }

  public isReady(): boolean {
    return (
      this._applyChangeProposals !== undefined &&
      this._batchCreateChangeProposals !== undefined &&
      this._createChangeProposal !== undefined &&
      this._listChangeProposalsByArtefact !== undefined &&
      this._listChangeProposalsBySpace !== undefined
    );
  }

  public getPort(): IPlaybookChangeManagementPort {
    return this as IPlaybookChangeManagementPort;
  }
}
