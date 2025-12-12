import { IPackagePage, IPackagesPage } from '../../domain/pages';
import { AbstractPackmindAppPage } from './AbstractPackmindAppPage';

export class PackagesPage
  extends AbstractPackmindAppPage
  implements IPackagesPage
{
  async openPackage(packageName: string): Promise<IPackagePage> {
    await this.page.getByRole('link', { name: packageName }).click();
    return this.pageFactory.getPackagePage();
  }

  expectedUrl(): string {
    return '**/packages';
  }
}
