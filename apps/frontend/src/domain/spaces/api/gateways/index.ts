import { ISpacesGateway } from './ISpacesGateway';
import { SpacesGatewayApi } from './SpacesGatewayApi';

export const spacesGateway: ISpacesGateway = new SpacesGatewayApi();

export * from './ISpacesGateway';
export * from './SpacesGatewayApi';
