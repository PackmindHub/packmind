import { IRulesGateway } from './IRulesGateway';
import { RulesGatewayApi } from './RulesGatewayApi';

export const rulesGateway: IRulesGateway = new RulesGatewayApi();

export * from './IRulesGateway';
export * from './RulesGatewayApi';
