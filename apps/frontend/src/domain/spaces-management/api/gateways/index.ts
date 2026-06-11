import { ISpacesManagementGateway } from './ISpacesManagementGateway';
import { SpacesManagementGatewayApi } from './SpacesManagementGatewayApi';

export const spacesManagementGateway: ISpacesManagementGateway =
  new SpacesManagementGatewayApi();

export * from './ISpacesManagementGateway';
export * from './SpacesManagementGatewayApi';
