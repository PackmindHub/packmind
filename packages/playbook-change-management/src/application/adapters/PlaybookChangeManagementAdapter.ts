import { PackmindLogger } from '@packmind/logger';
import { IBaseAdapter } from '@packmind/node-utils';
import {
  ApplyCommandChangeProposalCommand,
  ApplyCommandChangeProposalResponse,
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
  ISpacesPort,
  ISpacesPortName,
  ListCommandChangeProposalsCommand,
  ListCommandChangeProposalsResponse,
  RejectCommandChangeProposalCommand,
  RejectCommandChangeProposalResponse,
} from '@packmind/types';
import { PlaybookChangeManagementServices } from '../services/PlaybookChangeManagementServices';
import { ApplyCommandChangeProposalUseCase } from '../useCases/applyCommandChangeProposal/ApplyCommandChangeProposalUseCase';
import { CreateChangeProposalUseCase } from '../useCases/createChangeProposal/CreateChangeProposalUseCase';
import { CreateCommandChangeProposalUseCase } from '../useCases/createCommandChangeProposal/CreateCommandChangeProposalUseCase';
import { ListCommandChangeProposalsUseCase } from '../useCases/listCommandChangeProposals/ListCommandChangeProposalsUseCase';
import { RejectCommandChangeProposalUseCase } from '../useCases/rejectCommandChangeProposal/RejectCommandChangeProposalUseCase';

const origin = 'PlaybookChangeManagementAdapter';

export class PlaybookChangeManagementAdapter
  implements
    IBaseAdapter<IPlaybookChangeManagementPort>,
    IPlaybookChangeManagementPort
{
  private _applyCommandChangeProposal!: ApplyCommandChangeProposalUseCase;
  private _createChangeProposal!: CreateChangeProposalUseCase;
  private _createCommandChangeProposal!: CreateCommandChangeProposalUseCase;
  private _listCommandChangeProposals!: ListCommandChangeProposalsUseCase;
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

    const changeProposalService = this.services.getChangeProposalService();

    this._applyCommandChangeProposal = new ApplyCommandChangeProposalUseCase(
      accountsPort,
      spacesPort,
      recipesPort,
      changeProposalService,
    );

    this._createChangeProposal = new CreateChangeProposalUseCase(
      accountsPort,
      recipesPort,
      spacesPort,
      changeProposalService,
    );

    this._createCommandChangeProposal = new CreateCommandChangeProposalUseCase(
      accountsPort,
      spacesPort,
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
      this._applyCommandChangeProposal !== undefined &&
      this._createChangeProposal !== undefined &&
      this._createCommandChangeProposal !== undefined &&
      this._listCommandChangeProposals !== undefined &&
      this._rejectCommandChangeProposal !== undefined
    );
  }

  public getPort(): IPlaybookChangeManagementPort {
    return this as IPlaybookChangeManagementPort;
  }
}
