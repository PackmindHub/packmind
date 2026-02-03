import { IPackmindGateway } from '../domain/repositories/IPackmindGateway';
import { ILinterGateway } from '../domain/repositories/ILinterGateway';
import { IMcpGateway } from '../domain/repositories/IMcpGateway';
import { ISpacesGateway } from '../domain/repositories/ISpacesGateway';
import { ISkillsGateway } from '../domain/repositories/ISkillsGateway';
import { ICommandsGateway } from '../domain/repositories/ICommandsGateway';
import { IStandardsGateway } from '../domain/repositories/IStandardsGateway';
import { IPackagesGateway } from '../domain/repositories/IPackagesGateway';

export type MockPackmindGatewayOverrides = {
  linter?: jest.Mocked<ILinterGateway>;
  mcp?: jest.Mocked<IMcpGateway>;
  spaces?: jest.Mocked<ISpacesGateway>;
  skills?: jest.Mocked<ISkillsGateway>;
  commands?: jest.Mocked<ICommandsGateway>;
  standards?: jest.Mocked<IStandardsGateway>;
  packages?: jest.Mocked<IPackagesGateway>;
  getPullData?: jest.Mocked<IPackmindGateway>['getPullData'];
  notifyDistribution?: jest.Mocked<IPackmindGateway>['notifyDistribution'];
  pushOnboardingBaseline?: jest.Mocked<IPackmindGateway>['pushOnboardingBaseline'];
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
    standards: createMockStandardsGateway(),
    packages: createMockPackagesGateway(),
    getPullData: jest.fn(),
    notifyDistribution: jest.fn(),
    pushOnboardingBaseline: jest.fn(),
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

export function createMockStandardsGateway(
  overrides?: Partial<jest.Mocked<IStandardsGateway>>,
): jest.Mocked<IStandardsGateway> {
  return {
    create: jest.fn(),
    getRules: jest.fn(),
    addExampleToRule: jest.fn(),
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

export function createMockPackagesGateway(
  overrides?: Partial<jest.Mocked<IPackagesGateway>>,
): jest.Mocked<IPackagesGateway> {
  return {
    list: jest.fn(),
    getSummary: jest.fn(),
    create: jest.fn(),
    ...overrides,
  };
}
