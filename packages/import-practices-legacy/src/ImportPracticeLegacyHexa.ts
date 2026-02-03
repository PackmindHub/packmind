import { DataSource } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { BaseHexa, HexaRegistry, BaseHexaOpts } from '@packmind/node-utils';
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
import { ImportPracticeLegacyAdapter } from './application/adapter/ImportPracticeLegacyAdapter';
import {
  IImportPracticeLegacyPort,
  IImportPracticeLegacyPortName,
} from './types';

const origin = 'ImportPracticeLegacyHexa';

/**
 * ImportPracticeLegacyHexa - Facade for the Import Practices Legacy domain following the Port/Adapter pattern.
 *
 * This class serves as the main entry point for legacy practice import functionality.
 * It exposes the ImportPracticeLegacy adapter for cross-domain access following DDD standards.
 *
 * The Hexa pattern:
 * - Constructor: Instantiates the adapter
 * - initialize(): Retrieves and sets ports from registry
 * - getAdapter(): Exposes the domain adapter for cross-domain access
 */
export class ImportPracticeLegacyHexa extends BaseHexa<
  BaseHexaOpts,
  IImportPracticeLegacyPort
> {
  private readonly adapter: ImportPracticeLegacyAdapter;
  public isInitialized = false;

  constructor(
    dataSource: DataSource,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(dataSource, opts);
    this.logger.info('Constructing ImportPracticeLegacyHexa');

    try {
      // Instantiate adapter (dependencies will be injected in initialize())
      this.adapter = new ImportPracticeLegacyAdapter();

      this.logger.info('ImportPracticeLegacyHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct ImportPracticeLegacyHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Initialize the hexa with access to the registry for adapter retrieval.
   */
  public async initialize(registry: HexaRegistry): Promise<void> {
    if (this.isInitialized) {
      this.logger.info('ImportPracticeLegacyHexa already initialized');
      return;
    }

    this.logger.info(
      'Initializing ImportPracticeLegacyHexa (adapter retrieval phase)',
    );

    try {
      // Get all required ports
      const accountsPort =
        registry.getAdapter<IAccountsPort>(IAccountsPortName);
      const spacesPort = registry.getAdapter<ISpacesPort>(ISpacesPortName);
      const standardsAdapter =
        registry.getAdapter<StandardsAdapter>(IStandardsPortName);
      const linterPort = registry.getAdapter<ILinterPort>(ILinterPortName);

      this.logger.info('All required ports retrieved from registry');

      // Initialize adapter with ports
      await this.adapter.initialize({
        [IAccountsPortName]: accountsPort,
        [ISpacesPortName]: spacesPort,
        [IStandardsPortName]: standardsAdapter,
        [ILinterPortName]: linterPort,
      });

      this.isInitialized = true;
      this.logger.info('ImportPracticeLegacyHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize ImportPracticeLegacyHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Clean up resources when the hexa is being destroyed.
   */
  public destroy(): void {
    this.logger.info('Destroying ImportPracticeLegacyHexa');
    // Add any cleanup logic here if needed
    this.logger.info('ImportPracticeLegacyHexa destroyed');
  }

  /**
   * Get the ImportPracticeLegacy adapter for cross-domain access.
   * Following DDD monorepo architecture standard.
   */
  public getAdapter(): IImportPracticeLegacyPort {
    return this.adapter.getPort();
  }

  /**
   * Get the port name for this hexa.
   */
  public getPortName(): string {
    return IImportPracticeLegacyPortName;
  }
}
