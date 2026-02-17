import { PackmindLogger } from '@packmind/logger';
import { IBaseAdapter } from '@packmind/node-utils';
import {
  ApplyChangeProposalsCommand,
  ApplyChangeProposalsResponse,
  ApplyCommandChangeProposalCommand,
  ApplyCommandChangeProposalResponse,
  BatchApplyChangeProposalsCommand,
  BatchApplyChangeProposalsResponse,
  BatchCreateChangeProposalsCommand,
  BatchCreateChangeProposalsResponse,
  BatchRejectChangeProposalsCommand,
  BatchRejectChangeProposalsResponse,
  ChangeProposalType,
  CreateChangeProposalCommand,
  CreateChangeProposalResponse,
  CreateCommandChangeProposalCommand,
  CreateCommandChangeProposalResponse,
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
  ListCommandChangeProposalsCommand,
  ListCommandChangeProposalsResponse,
  RecipeId,
  RejectCommandChangeProposalCommand,
  RejectCommandChangeProposalResponse,
  SkillId,
  StandardId,
} from '@packmind/types';
import { PlaybookChangeManagementServices } from '../services/PlaybookChangeManagementServices';
import { ApplyChangeProposalsUseCase } from '../useCases/applyChangeProposals/ApplyChangeProposalsUseCase';
import { ApplyCommandChangeProposalUseCase } from '../useCases/applyCommandChangeProposal/ApplyCommandChangeProposalUseCase';
import { BatchApplyChangeProposalsUseCase } from '../useCases/batchApplyChangeProposals/BatchApplyChangeProposalsUseCase';
import { CreateChangeProposalUseCase } from '../useCases/createChangeProposal/CreateChangeProposalUseCase';
import { CreateCommandChangeProposalUseCase } from '../useCases/createCommandChangeProposal/CreateCommandChangeProposalUseCase';
import { ListChangeProposalsByArtefactUseCase } from '../useCases/listChangeProposalsByArtefact/ListChangeProposalsByArtefactUseCase';
import { ListChangeProposalsBySpaceUseCase } from '../useCases/listChangeProposalsBySpace/ListChangeProposalsBySpaceUseCase';
import { ListCommandChangeProposalsUseCase } from '../useCases/listCommandChangeProposals/ListCommandChangeProposalsUseCase';
import { BatchCreateChangeProposalsUseCase } from '../useCases/batchCreateChangeProposals/BatchCreateChangeProposalsUseCase';
import { RejectCommandChangeProposalUseCase } from '../useCases/rejectCommandChangeProposal/RejectCommandChangeProposalUseCase';
import { IChangeProposalValidator } from '../validators/IChangeProposalValidator';
import { CommandChangeProposalValidator } from '../validators/CommandChangeProposalValidator';
import { SkillChangeProposalValidator } from '../validators/SkillChangeProposalValidator';
import { BatchRejectChangeProposalsUseCase } from '../useCases/batchRejectChangeProposals/BatchRejectChangeProposalsUseCase';

const origin = 'PlaybookChangeManagementAdapter';

export class PlaybookChangeManagementAdapter
  implements
    IBaseAdapter<IPlaybookChangeManagementPort>,
    IPlaybookChangeManagementPort
{
  private _applyChangeProposals!: ApplyChangeProposalsUseCase<
    StandardId | RecipeId | SkillId
  >;
  private _applyCommandChangeProposal!: ApplyCommandChangeProposalUseCase;
  private _batchApplyChangeProposals!: BatchApplyChangeProposalsUseCase;
  private _batchCreateChangeProposals!: BatchCreateChangeProposalsUseCase;
  private _createChangeProposal!: CreateChangeProposalUseCase;
  private _createCommandChangeProposal!: CreateCommandChangeProposalUseCase;
  private _listChangeProposalsByArtefact!: ListChangeProposalsByArtefactUseCase<
    StandardId | RecipeId | SkillId
  >;
  private _listChangeProposalsBySpace!: ListChangeProposalsBySpaceUseCase;
  private _listCommandChangeProposals!: ListCommandChangeProposalsUseCase;
  private _batchRejectChangeProposals!: BatchRejectChangeProposalsUseCase;
  private _rejectCommandChangeProposal!: RejectCommandChangeProposalUseCase;

  constructor(
    private readonly services: PlaybookChangeManagementServices,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async applyCommandChangeProposal(
    command: ApplyCommandChangeProposalCommand,
  ): Promise<ApplyCommandChangeProposalResponse> {
    return this._applyCommandChangeProposal.execute(command);
  }

  async applyChangeProposals<T extends StandardId | RecipeId | SkillId>(
    command: ApplyChangeProposalsCommand<T>,
  ): Promise<ApplyChangeProposalsResponse> {
    return this._applyChangeProposals.execute(command);
  }

  async batchApplyChangeProposals(
    command: BatchApplyChangeProposalsCommand,
  ): Promise<BatchApplyChangeProposalsResponse> {
    return this._batchApplyChangeProposals.execute(command);
  }

  async batchCreateChangeProposals(
    command: BatchCreateChangeProposalsCommand,
  ): Promise<BatchCreateChangeProposalsResponse> {
    return this._batchCreateChangeProposals.execute(command);
  }

  async batchRejectChangeProposals(
    command: BatchRejectChangeProposalsCommand,
  ): Promise<BatchRejectChangeProposalsResponse> {
    return this._batchRejectChangeProposals.execute(command);
  }

  async createChangeProposal<T extends ChangeProposalType>(
    command: CreateChangeProposalCommand<T>,
  ): Promise<CreateChangeProposalResponse<T>> {
    return this._createChangeProposal.execute(
      command as CreateChangeProposalCommand<ChangeProposalType>,
    ) as Promise<CreateChangeProposalResponse<T>>;
  }

  async createCommandChangeProposal(
    command: CreateCommandChangeProposalCommand,
  ): Promise<CreateCommandChangeProposalResponse> {
    return this._createCommandChangeProposal.execute(command);
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

  async listCommandChangeProposals(
    command: ListCommandChangeProposalsCommand,
  ): Promise<ListCommandChangeProposalsResponse> {
    return this._listCommandChangeProposals.execute(command);
  }

  async rejectCommandChangeProposal(
    command: RejectCommandChangeProposalCommand,
  ): Promise<RejectCommandChangeProposalResponse> {
    return this._rejectCommandChangeProposal.execute(command);
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

    const validators: IChangeProposalValidator[] = [
      new CommandChangeProposalValidator(recipesPort),
      new SkillChangeProposalValidator(skillsPort),
    ];

    this._applyCommandChangeProposal = new ApplyCommandChangeProposalUseCase(
      accountsPort,
      spacesPort,
      recipesPort,
      changeProposalService,
    );

    this._applyChangeProposals = new ApplyChangeProposalsUseCase(
      accountsPort,
      spacesPort,
      standardsPort,
      recipesPort,
      skillsPort,
      changeProposalService,
      this,
    );

    this._batchApplyChangeProposals = new BatchApplyChangeProposalsUseCase(
      accountsPort,
      this,
    );

    this._batchCreateChangeProposals = new BatchCreateChangeProposalsUseCase(
      accountsPort,
      this,
    );

    this._batchRejectChangeProposals = new BatchRejectChangeProposalsUseCase(
      accountsPort,
      this,
    );

    this._createChangeProposal = new CreateChangeProposalUseCase(
      accountsPort,
      spacesPort,
      changeProposalService,
      validators,
    );

    this._createCommandChangeProposal = new CreateCommandChangeProposalUseCase(
      accountsPort,
      spacesPort,
      changeProposalService,
    );

    this._listChangeProposalsByArtefact =
      new ListChangeProposalsByArtefactUseCase(
        accountsPort,
        spacesPort,
        standardsPort,
        recipesPort,
        skillsPort,
        changeProposalService,
      );

    this._listChangeProposalsBySpace = new ListChangeProposalsBySpaceUseCase(
      accountsPort,
      spacesPort,
      standardsPort,
      recipesPort,
      skillsPort,
      changeProposalService,
    );

    this._listCommandChangeProposals = new ListCommandChangeProposalsUseCase(
      accountsPort,
      spacesPort,
      recipesPort,
      changeProposalService,
    );

    this._rejectCommandChangeProposal = new RejectCommandChangeProposalUseCase(
      accountsPort,
      spacesPort,
      changeProposalService,
    );

    this.logger.info(
      'PlaybookChangeManagementAdapter initialized successfully',
    );
  }

  public isReady(): boolean {
    return (
      this._applyChangeProposals !== undefined &&
      this._applyCommandChangeProposal !== undefined &&
      this._batchApplyChangeProposals !== undefined &&
      this._batchCreateChangeProposals !== undefined &&
      this._batchRejectChangeProposals !== undefined &&
      this._createChangeProposal !== undefined &&
      this._createCommandChangeProposal !== undefined &&
      this._listChangeProposalsByArtefact !== undefined &&
      this._listChangeProposalsBySpace !== undefined &&
      this._listCommandChangeProposals !== undefined &&
      this._rejectCommandChangeProposal !== undefined
    );
  }

  public getPort(): IPlaybookChangeManagementPort {
    return this as IPlaybookChangeManagementPort;
  }
}
