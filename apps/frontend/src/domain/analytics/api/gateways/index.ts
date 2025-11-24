import { IAnalyticsGateway } from './IAnalyticsGateway';

import { AnalyticsGatewayApi } from './AnalyticsGatewayApi';

export const analyticsGateway: IAnalyticsGateway = new AnalyticsGatewayApi();
