import { IPackmindGateway } from './IPackmindGateway';
import { IConfigFileRepository } from './IConfigFileRepository';
import { ILockFileRepository } from './ILockFileRepository';

export interface IPackmindRepositories {
  packmindGateway: IPackmindGateway;
  configFileRepository: IConfigFileRepository;
  lockFileRepository: ILockFileRepository;
}
