import { IPackmindGateway } from './IPackmindGateway';
import { IConfigFileRepository } from './IConfigFileRepository';
import { ILockFileRepository } from './ILockFileRepository';
import { IOutput } from './IOutput';

export interface IPackmindRepositories {
  packmindGateway: IPackmindGateway;
  configFileRepository: IConfigFileRepository;
  lockFileRepository: ILockFileRepository;
  output: IOutput;
}
