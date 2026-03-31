import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import {
  IAccountsPort,
  IAccountsPortName,
  IPlaybookChangeApplierPort,
  IPlaybookChangeApplierPortName,
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
import { PlaybookChangeApplierAdapter } from './PlaybookChangeApplierAdapter';

export class PlaybookChangeApplierHexa extends BaseHexa<
  BaseHexaOpts,
  IPlaybookChangeApplierPort
> {
  protected adapter: PlaybookChangeApplierAdapter;

  constructor(dataSource: DataSource, opts?: Partial<BaseHexaOpts>) {
    super(dataSource, opts);
    this.adapter = new PlaybookChangeApplierAdapter();
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

  public getAdapter(): IPlaybookChangeApplierPort {
    return this.adapter;
  }

  public getPortName(): string {
    return IPlaybookChangeApplierPortName;
  }

  destroy(): void {
    // No cleanup needed
  }
}
