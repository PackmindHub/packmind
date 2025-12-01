import { CrispHexa } from '@packmind/crisp';
import { ImportPracticeLegacyHexa } from '@packmind/import-practices-legacy';
import { BaseHexa, BaseHexaOpts } from '@packmind/node-utils';
import { DataSource } from 'typeorm';

/**
 * Plugin hexas for API that are registered in addition to core hexas.
 * This is the proprietary edition version that includes CrispHexa and ImportPracticeLegacyHexa.
 */
export const apiHexaPlugins: Array<
  new (dataSource: DataSource, opts?: Partial<BaseHexaOpts>) => BaseHexa
> = [CrispHexa, ImportPracticeLegacyHexa];

/**
 * Plugin hexas for MCP server that are registered in addition to core hexas.
 * This is the proprietary edition version (currently empty).
 */
export const mcpHexaPlugins: Array<
  new (dataSource: DataSource, opts?: Partial<BaseHexaOpts>) => BaseHexa
> = [];
