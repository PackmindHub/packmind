import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { PackmindHttpClient } from '../http/PackmindHttpClient';
import { LinterGateway } from './LinterGateway';
import { ILinterGateway } from '../../domain/repositories/ILinterGateway';
import { McpGateway } from './McpGateway';
import { IMcpGateway } from '../../domain/repositories/IMcpGateway';
import { SpacesGateway } from './SpacesGateway';
import { ISpacesGateway } from '../../domain/repositories/ISpacesGateway';
import { SkillsGateway } from './SkillsGateway';
import { ISkillsGateway } from '../../domain/repositories/ISkillsGateway';
import { CommandsGateway } from './CommandsGateway';
import { ICommandsGateway } from '../../domain/repositories/ICommandsGateway';
import { StandardsGateway } from './StandardsGateway';
import { IStandardsGateway } from '../../domain/repositories/IStandardsGateway';
import { PackagesGateway } from './PackagesGateway';
import { IPackagesGateway } from '../../domain/repositories/IPackagesGateway';
import { DeploymentGateway } from './DeploymentGateway';
import { IDeploymentGateway } from '../../domain/repositories/IDeploymentGateway';

export class PackmindGateway implements IPackmindGateway {
  private readonly httpClient: PackmindHttpClient;
  readonly linter: ILinterGateway;
  readonly mcp: IMcpGateway;
  readonly spaces: ISpacesGateway;
  readonly skills: ISkillsGateway;
  readonly commands: ICommandsGateway;
  readonly standards: IStandardsGateway;
  readonly packages: IPackagesGateway;
  readonly deployment: IDeploymentGateway;

  constructor(private readonly apiKey: string) {
    this.httpClient = new PackmindHttpClient(apiKey);

    this.linter = new LinterGateway(this.httpClient);
    this.mcp = new McpGateway(apiKey);
    this.spaces = new SpacesGateway(this.httpClient);
    this.skills = new SkillsGateway(apiKey, this.httpClient);
    this.commands = new CommandsGateway(this.httpClient, this.spaces);
    this.standards = new StandardsGateway(this.httpClient, this.spaces);
    this.packages = new PackagesGateway(apiKey, this.httpClient);
    this.deployment = new DeploymentGateway(apiKey);
  }
}
