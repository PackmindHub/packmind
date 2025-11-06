import { PackmindLogger } from '@packmind/logger';
import { HexaRegistry } from '@packmind/node-utils';
import { DataSource } from 'typeorm';

export class JobsHexaFactory {
  constructor(
    logger: PackmindLogger,
    _dataSource: DataSource, // eslint-disable-line @typescript-eslint/no-unused-vars
    _registry: HexaRegistry, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    logger.info(
      'JobsHexaFactory initialized with generic job registry support',
    );
  }
}
