import { ICommandsGateway } from './ICommandsGateway';
import { CommandsGatewayApi } from './CommandsGatewayApi';

export const commandsGateway: ICommandsGateway = new CommandsGatewayApi();
