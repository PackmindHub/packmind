import { IPackmindGateway } from '../domain/repositories/IPackmindGateway';
import { ILinterGateway } from '../domain/repositories/ILinterGateway';

export type MockPackmindGatewayOverrides = {
  linter?: jest.Mocked<ILinterGateway>;
  getPullData?: jest.Mocked<IPackmindGateway>['getPullData'];
  listPackages?: jest.Mocked<IPackmindGateway>['listPackages'];
  getPackageSummary?: jest.Mocked<IPackmindGateway>['getPackageSummary'];
  getMcpToken?: jest.Mocked<IPackmindGateway>['getMcpToken'];
  getMcpUrl?: jest.Mocked<IPackmindGateway>['getMcpUrl'];
  notifyDistribution?: jest.Mocked<IPackmindGateway>['notifyDistribution'];
  uploadSkill?: jest.Mocked<IPackmindGateway>['uploadSkill'];
  getDefaultSkills?: jest.Mocked<IPackmindGateway>['getDefaultSkills'];
  getGlobalSpace?: jest.Mocked<IPackmindGateway>['getGlobalSpace'];
  createStandardInSpace?: jest.Mocked<IPackmindGateway>['createStandardInSpace'];
  getRulesForStandard?: jest.Mocked<IPackmindGateway>['getRulesForStandard'];
  addExampleToRule?: jest.Mocked<IPackmindGateway>['addExampleToRule'];
  createCommand?: jest.Mocked<IPackmindGateway>['createCommand'];
  createPackage?: jest.Mocked<IPackmindGateway>['createPackage'];
  pushOnboardingBaseline?: jest.Mocked<IPackmindGateway>['pushOnboardingBaseline'];
  listStandards?: jest.Mocked<IPackmindGateway>['listStandards'];
  listCommands?: jest.Mocked<IPackmindGateway>['listCommands'];
  listSkills?: jest.Mocked<IPackmindGateway>['listSkills'];
};

export function createMockPackmindGateway(
  overrides?: MockPackmindGatewayOverrides,
): jest.Mocked<IPackmindGateway> {
  return {
    linter: createMockLinterGateway(),
    getPullData: jest.fn(),
    listPackages: jest.fn(),
    getPackageSummary: jest.fn(),
    getMcpToken: jest.fn(),
    getMcpUrl: jest.fn(),
    notifyDistribution: jest.fn(),
    uploadSkill: jest.fn(),
    getDefaultSkills: jest.fn(),
    getGlobalSpace: jest.fn(),
    createStandardInSpace: jest.fn(),
    getRulesForStandard: jest.fn(),
    addExampleToRule: jest.fn(),
    createCommand: jest.fn(),
    createPackage: jest.fn(),
    pushOnboardingBaseline: jest.fn(),
    listStandards: jest.fn(),
    listCommands: jest.fn(),
    listSkills: jest.fn(),
    ...overrides,
  };
}

export function createMockLinterGateway(
  overrides?: Partial<jest.Mocked<ILinterGateway>>,
): jest.Mocked<ILinterGateway> {
  return {
    getDraftDetectionProgramsForRule: jest.fn(),
    getActiveDetectionProgramsForRule: jest.fn(),
    getDetectionProgramsForPackages: jest.fn(),
    ...overrides,
  };
}
