import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import { DataSource } from 'typeorm';
import { PackmindCommand } from '@packmind/types';

type ImportPracticeLegacyCommand = PackmindCommand & {};
type ImportPracticeLegacyResponse = {
  name: string;
};
interface IImportPracticeLegacyPort {
  importPracticeLegacy(
    command: ImportPracticeLegacyCommand,
  ): Promise<ImportPracticeLegacyResponse>;
}

export class ImportPracticeLegacyHexa extends BaseHexa<
  BaseHexaOpts,
  IImportPracticeLegacyPort
> {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async initialize(registry: HexaRegistry): Promise<void> {
    // No adapters needed for OSS edition
  }

  public async initializeJobQueues(): Promise<void> {
    // Nothing to do here
  }

  public getAdapter(): IImportPracticeLegacyPort {
    throw new Error('Import practice legacy not supported in OSS version');
  }

  getPortName(): string {
    return 'ImportPracticeLegacyHexa';
  }

  destroy(): void {
    /* empty */
  }
}
