import { ISkillsGateway } from './ISkillsGateway';
import { SkillsGatewayApi } from './SkillsGatewayApi';

export const skillsGateway: ISkillsGateway = new SkillsGatewayApi();
