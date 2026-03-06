import { IPackmindGateway } from './IPackmindGateway';
import { IConfigFileRepository } from './IConfigFileRepository';

export interface IPackmindRepositories {
  packmindGateway: IPackmindGateway;
  configFileRepository: IConfigFileRepository;
}
