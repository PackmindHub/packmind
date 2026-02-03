import { IPackmindGateway } from '../domain/repositories/IPackmindGateway';
import { ILinterGateway } from '../domain/repositories/ILinterGateway';
import { IMcpGateway } from '../domain/repositories/IMcpGateway';
import { ISpacesGateway } from '../domain/repositories/ISpacesGateway';
import { ISkillsGateway } from '../domain/repositories/ISkillsGateway';
import { ICommandsGateway } from '../domain/repositories/ICommandsGateway';

export type MockPackmindGatewayOverrides = {
  linter?: jest.Mocked<ILinterGateway>;
  mcp?: jest.Mocked<IMcpGateway>;
  spaces?: jest.Mocked<ISpacesGateway>;
  skills?: jest.Mocked<ISkillsGateway>;
  commands?: jest.Mocked<ICommandsGateway>;
  getPullData?: jest.Mocked<IPackmindGateway>['getPullData'];
  listPackages?: jest.Mocked<IPackmindGateway>['listPackages'];
  getPackageSummary?: jest.Mocked<IPackmindGateway>['getPackageSummary'];
  notifyDistribution?: jest.Mocked<IPackmindGateway>['notifyDistribution'];
  createStandardInSpace?: jest.Mocked<IPackmindGateway>['createStandardInSpace'];
  getRulesForStandard?: jest.Mocked<IPackmindGateway>['getRulesForStandard'];
  addExampleToRule?: jest.Mocked<IPackmindGateway>['addExampleToRule'];
  createPackage?: jest.Mocked<IPackmindGateway>['createPackage'];
  pushOnboardingBaseline?: jest.Mocked<IPackmindGateway>['pushOnboardingBaseline'];
  listStandards?: jest.Mocked<IPackmindGateway>['listStandards'];
};

export function createMockPackmindGateway(
  overrides?: MockPackmindGatewayOverrides,
): jest.Mocked<IPackmindGateway> {
  return {
    linter: createMockLinterGateway(),
    mcp: createMockMcpGateway(),
    spaces: createMockSpacesGateway(),
    skills: createMockSkillsGateway(),
    commands: createMockCommandsGateway(),
    getPullData: jest.fn(),
    listPackages: jest.fn(),
    getPackageSummary: jest.fn(),
    notifyDistribution: jest.fn(),
    createStandardInSpace: jest.fn(),
    getRulesForStandard: jest.fn(),
    addExampleToRule: jest.fn(),
    createPackage: jest.fn(),
    pushOnboardingBaseline: jest.fn(),
    listStandards: jest.fn(),
    ...overrides,
  };
}

export function createMockMcpGateway(
  overrides?: Partial<jest.Mocked<IMcpGateway>>,
): jest.Mocked<IMcpGateway> {
  return {
    getToken: jest.fn(),
    getUrl: jest.fn(),
    ...overrides,
  };
}

export function createMockSpacesGateway(
  overrides?: Partial<jest.Mocked<ISpacesGateway>>,
): jest.Mocked<ISpacesGateway> {
  return {
    getGlobal: jest.fn(),
    ...overrides,
  };
}

export function createMockSkillsGateway(
  overrides?: Partial<jest.Mocked<ISkillsGateway>>,
): jest.Mocked<ISkillsGateway> {
  return {
    upload: jest.fn(),
    getDefaults: jest.fn(),
    list: jest.fn(),
    ...overrides,
  };
}

export function createMockCommandsGateway(
  overrides?: Partial<jest.Mocked<ICommandsGateway>>,
): jest.Mocked<ICommandsGateway> {
  return {
    create: jest.fn(),
    list: jest.fn(),
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
