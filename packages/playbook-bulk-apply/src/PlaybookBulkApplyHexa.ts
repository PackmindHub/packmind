import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import {
  IAccountsPort,
  IAccountsPortName,
  IPlaybookBulkApplyPort,
  IPlaybookBulkApplyPortName,
  IRecipesPort,
  IRecipesPortName,
  ISkillsPort,
  ISkillsPortName,
  ISpacesPort,
  ISpacesPortName,
  IStandardsPort,
  IStandardsPortName,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { PlaybookBulkApplyAdapter } from './PlaybookBulkApplyAdapter';

export class PlaybookBulkApplyHexa extends BaseHexa<
  BaseHexaOpts,
  IPlaybookBulkApplyPort
> {
  protected adapter: PlaybookBulkApplyAdapter;

  constructor(dataSource: DataSource, opts?: Partial<BaseHexaOpts>) {
    super(dataSource, opts);
    this.adapter = new PlaybookBulkApplyAdapter();
  }

  async initialize(registry: HexaRegistry): Promise<void> {
    const accountsPort = registry.getAdapter<IAccountsPort>(IAccountsPortName);
    const skillsPort = registry.getAdapter<ISkillsPort>(ISkillsPortName);
    const standardsPort =
      registry.getAdapter<IStandardsPort>(IStandardsPortName);
    const recipesPort = registry.getAdapter<IRecipesPort>(IRecipesPortName);
    const spacesPort = registry.getAdapter<ISpacesPort>(ISpacesPortName);

    await this.adapter.initialize({
      accountsPort,
      skillsPort,
      standardsPort,
      recipesPort,
      spacesPort,
    });
  }

  public getAdapter(): IPlaybookBulkApplyPort {
    return this.adapter;
  }

  public getPortName(): string {
    return IPlaybookBulkApplyPortName;
  }

  destroy(): void {
    // No cleanup needed
  }
}
