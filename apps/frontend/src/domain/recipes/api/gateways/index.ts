import { IChangeProposalsGateway } from './IChangeProposalsGateway';
import { ChangeProposalsGatewayApi } from './ChangeProposalsGatewayApi';
import { IRecipesGateway } from './IRecipesGateway';
import { RecipesGatewayApi } from './RecipesGatewayApi';

export const recipesGateway: IRecipesGateway = new RecipesGatewayApi();
export const changeProposalsGateway: IChangeProposalsGateway =
  new ChangeProposalsGatewayApi();
