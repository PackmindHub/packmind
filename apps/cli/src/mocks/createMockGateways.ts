import { IPackmindGateway } from '../domain/repositories/IPackmindGateway';
import { ILinterGateway } from '../domain/repositories/ILinterGateway';

export function createMockPackmindGateway(
  gateway?: Partial<IPackmindGateway>,
): jest.Mocked<IPackmindGateway> {
  return {
    linter: createMockLinterGateway(gateway?.linter),
    getPullData: jest.fn(),
    listPackages: jest.fn(),
    getPackageSummary: jest.fn(),
    getMcpToken: jest.fn(),
    getMcpUrl: jest.fn(),
    notifyDistribution: jest.fn(),
    uploadSkill: jest.fn(),
    getDefaultSkills: jest.fn(),

    ...gateway,
  };
}

export function createMockLinterGateway(
  gateway?: Partial<ILinterGateway>,
): jest.Mocked<ILinterGateway> {
  return {
    listDetectionPrograms: jest.fn(),
    getDraftDetectionProgramsForRule: jest.fn(),
    getActiveDetectionProgramsForRule: jest.fn(),
    getDetectionProgramsForPackages: jest.fn(),
    ...gateway,
  };
}
