import { BaseHexa, BaseHexaOpts } from '@packmind/node-utils';
import { DataSource } from 'typeorm';

/**
 * Plugin hexas that are registered in addition to core hexas.
 * Override this file to add edition-specific hexas.
 */
export const hexaPlugins: Array<
  new (dataSource: DataSource, opts?: Partial<BaseHexaOpts>) => BaseHexa
> = [];
