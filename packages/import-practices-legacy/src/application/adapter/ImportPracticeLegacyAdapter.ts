import { PackmindLogger } from '@packmind/logger';
import { IBaseAdapter } from '@packmind/node-utils';
import {
  IAccountsPort,
  IAccountsPortName,
  ILinterPort,
  ILinterPortName,
  ISpacesPort,
  ISpacesPortName,
  IStandardsPortName,
} from '@packmind/types';
import { StandardsAdapter } from '@packmind/standards';
import { ImportPracticeLegacyUseCase } from '../useCases/importPracticeLegacy/importPracticeLegacy.usecase';
import {
  IImportPracticeLegacyPort,
  ImportPracticeLegacyCommand,
  ImportPracticeLegacyResponse,
} from '../../types';

const origin = 'ImportPracticeLegacyAdapter';

/**
 * ImportPracticeLegacyAdapter - Implements the IImportPracticeLegacyPort interface for cross-domain access.
 * Following the Port/Adapter pattern from DDD monorepo architecture standard.
 */
export class ImportPracticeLegacyAdapter
  implements IBaseAdapter<IImportPracticeLegacyPort>, IImportPracticeLegacyPort
{
  private accountsPort: IAccountsPort | null = null;
  private spacesPort: ISpacesPort | null = null;
  private standardsAdapter: StandardsAdapter | null = null;
  private linterPort: ILinterPort | null = null;
  private importPracticeLegacyUseCase: ImportPracticeLegacyUseCase | null =
    null;

  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('ImportPracticeLegacyAdapter constructed');
  }

  /**
   * Initialize the adapter with ports from registry.
   */
  public async initialize(ports: {
    [IAccountsPortName]: IAccountsPort;
    [ISpacesPortName]: ISpacesPort;
    [IStandardsPortName]: StandardsAdapter;
    [ILinterPortName]: ILinterPort;
  }): Promise<void> {
    this.logger.info('Initializing ImportPracticeLegacyAdapter with ports');

    this.accountsPort = ports[IAccountsPortName];
    this.spacesPort = ports[ISpacesPortName];
    this.standardsAdapter = ports[IStandardsPortName];
    this.linterPort = ports[ILinterPortName];

    if (
      !this.accountsPort ||
      !this.spacesPort ||
      !this.standardsAdapter ||
      !this.linterPort
    ) {
      throw new Error(
        'ImportPracticeLegacyAdapter: Required ports not provided',
      );
    }

    // Create the use case with all dependencies
    this.importPracticeLegacyUseCase = new ImportPracticeLegacyUseCase(
      this.accountsPort,
      this.spacesPort,
      this.standardsAdapter,
      this.linterPort,
      this.logger,
    );

    this.logger.info('ImportPracticeLegacyAdapter initialized successfully');
  }

  /**
   * Check if the adapter is ready to use.
   */
  public isReady(): boolean {
    return (
      this.accountsPort !== null &&
      this.spacesPort !== null &&
      this.standardsAdapter !== null &&
      this.linterPort !== null &&
      this.importPracticeLegacyUseCase !== null
    );
  }

  /**
   * Get the port interface this adapter implements.
   */
  public getPort(): IImportPracticeLegacyPort {
    return this as IImportPracticeLegacyPort;
  }

  /**
   * Import legacy practices into Packmind standards.
   */
  async importPracticeLegacy(
    command: ImportPracticeLegacyCommand,
  ): Promise<ImportPracticeLegacyResponse> {
    if (!this.importPracticeLegacyUseCase) {
      throw new Error(
        'ImportPracticeLegacyAdapter not initialized. Call initialize() first.',
      );
    }

    return this.importPracticeLegacyUseCase.execute(command);
  }
}
