import { CrispHexa } from '@packmind/crisp';
import { BaseHexa, BaseHexaOpts } from '@packmind/node-utils';
import { DataSource } from 'typeorm';

/**
 * Plugin hexas that are registered in addition to core hexas.
 * This is the proprietary edition version that includes CrispHexa.
 */
export const hexaPlugins: Array<
  new (dataSource: DataSource, opts?: Partial<BaseHexaOpts>) => BaseHexa
> = [CrispHexa];
