import { IPackmindPage, IPageFactory } from '../../domain/pages';
import { Page } from '@playwright/test';

export abstract class AbstractPackmindPage implements IPackmindPage {
  constructor(
    protected readonly page: Page,
    protected readonly pageFactory: IPageFactory,
  ) {}

  async reload(): Promise<void> {
    await this.page.reload();
  }

  abstract expectedUrl(): string | RegExp;

  async waitForLoaded(): Promise<void> {
    await this.page.waitForURL(this.expectedUrl());
  }
}
