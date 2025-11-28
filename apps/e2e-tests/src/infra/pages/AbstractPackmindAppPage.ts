import {
  IPackmindAppPage,
  IRecipesPage,
  IStandardsPage,
} from '../../domain/pages';
import { AbstractPackmindPage } from './AbstractPackmindPage';

export abstract class AbstractPackmindAppPage
  extends AbstractPackmindPage
  implements IPackmindAppPage
{
  openRecipes(): Promise<IRecipesPage> {
    return Promise.resolve(undefined);
  }

  openStandards(): Promise<IStandardsPage> {
    return Promise.resolve(undefined);
  }
}
