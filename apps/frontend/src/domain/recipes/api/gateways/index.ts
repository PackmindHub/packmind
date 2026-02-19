import { IRecipesGateway } from './IRecipesGateway';
import { RecipesGatewayApi } from './RecipesGatewayApi';

export const recipesGateway: IRecipesGateway = new RecipesGatewayApi();
