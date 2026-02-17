import { Injectable } from '@nestjs/common';
import {
  IPlaybookChangeManagementPort,
  ListChangeProposalsByArtefactCommand,
  ListChangeProposalsByArtefactResponse,
  RecipeId,
} from '@packmind/types';
import { InjectPlaybookChangeManagementAdapter } from '../../../../shared/HexaInjection';

@Injectable()
export class RecipesChangeProposalsService {
  constructor(
    @InjectPlaybookChangeManagementAdapter()
    private readonly playbookChangeManagementAdapter: IPlaybookChangeManagementPort,
  ) {}

  async listChangeProposalsByRecipe(
    command: ListChangeProposalsByArtefactCommand<RecipeId>,
  ): Promise<ListChangeProposalsByArtefactResponse> {
    return this.playbookChangeManagementAdapter.listChangeProposalsByArtefact(
      command,
    );
  }
}
