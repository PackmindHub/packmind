import { IChangeProposalsGateway } from './IChangeProposalsGateway';
import { ChangeProposalsGatewayApi } from './ChangeProposalsGatewayApi';

export const changeProposalsGateway: IChangeProposalsGateway =
  new ChangeProposalsGatewayApi();
