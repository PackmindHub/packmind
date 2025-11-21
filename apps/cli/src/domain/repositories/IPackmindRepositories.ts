import { IPackmindGateway } from './IPackmindGateway';
import { ConfigFileRepository } from '../../infra/repositories/ConfigFileRepository';

export interface IPackmindRepositories {
  packmindGateway: IPackmindGateway;
  configFileRepository: ConfigFileRepository;
}
