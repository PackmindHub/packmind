import { BaseHexa, BaseHexaOpts } from '@packmind/node-utils';
import { DataSource } from 'typeorm';

/**
 * Plugin hexas for API that are registered in addition to core hexas.
 * Override this file to add edition-specific hexas.
 */
export const apiHexaPlugins: Array<
  new (dataSource: DataSource, opts?: Partial<BaseHexaOpts>) => BaseHexa
> = [];
