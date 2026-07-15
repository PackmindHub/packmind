import { Branded, brandedIdFactory } from '../brandedTypes';

export type CommandId = Branded<'RecipeId'>;
export const createCommandId = brandedIdFactory<CommandId>();
