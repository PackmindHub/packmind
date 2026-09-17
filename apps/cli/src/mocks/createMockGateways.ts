import { mockInterface } from '@packmind/test-utils';
import { IPackmindGateway } from '../domain/repositories/IPackmindGateway';
import { IChangeProposalGateway } from '../domain/repositories/IChangeProposalGateway';
import { ILinterGateway } from '../domain/repositories/ILinterGateway';
import { ISpacesGateway } from '../domain/repositories/ISpacesGateway';
import { ISkillsGateway } from '../domain/repositories/ISkillsGateway';
import { ICommandsGateway } from '../domain/repositories/ICommandsGateway';
import { IStandardsGateway } from '../domain/repositories/IStandardsGateway';
import { IPackagesGateway } from '../domain/repositories/IPackagesGateway';
import { IDeploymentGateway } from '../domain/repositories/IDeploymentGateway';
import { IOrganizationGateway } from '../domain/repositories/IOrganizationGateway';
import { IRepositoryTrackingGateway } from '../domain/repositories/IRepositoryTrackingGateway';

export type MockPackmindGatewayOverrides = {
  changeProposals?: jest.Mocked<IChangeProposalGateway>;
  linter?: jest.Mocked<ILinterGateway>;
  spaces?: jest.Mocked<ISpacesGateway>;
  skills?: jest.Mocked<ISkillsGateway>;
  commands?: jest.Mocked<ICommandsGateway>;
  standards?: jest.Mocked<IStandardsGateway>;
  packages?: jest.Mocked<IPackagesGateway>;
  deployment?: jest.Mocked<IDeploymentGateway>;
  organization?: jest.Mocked<IOrganizationGateway>;
  repositoryTracking?: jest.Mocked<IRepositoryTrackingGateway>;
};

/**
 * `IPackmindGateway` is all data members - one nested gateway per field - so
 * `mockInterface` cannot build it on its own: it demands them, rather than
 * answering a `jest.fn()` where the interface declares an object. This factory
 * supplies that tree; the leaf factories below are the ones `mockInterface`
 * fills in.
 */
export function createMockPackmindGateway(
  overrides?: MockPackmindGatewayOverrides,
): jest.Mocked<IPackmindGateway> {
  return {
    changeProposals: createMockChangeProposalGateway(),
    linter: createMockLinterGateway(),
    spaces: createMockSpacesGateway(),
    skills: createMockSkillsGateway(),
    commands: createMockCommandsGateway(),
    standards: createMockStandardsGateway(),
    packages: createMockPackagesGateway(),
    deployment: createMockDeploymentGateway(),
    organization: createMockOrganizationGateway(),
    repositoryTracking: createMockRepositoryTrackingGateway(),
    ...overrides,
  };
}

export function createMockRepositoryTrackingGateway(
  overrides?: Partial<jest.Mocked<IRepositoryTrackingGateway>>,
): jest.Mocked<IRepositoryTrackingGateway> {
  return Object.assign(mockInterface<IRepositoryTrackingGateway>(), overrides);
}

export function createMockChangeProposalGateway(
  overrides?: Partial<jest.Mocked<IChangeProposalGateway>>,
): jest.Mocked<IChangeProposalGateway> {
  return Object.assign(mockInterface<IChangeProposalGateway>(), overrides);
}

export function createMockSpacesGateway(
  overrides?: Partial<jest.Mocked<ISpacesGateway>>,
): jest.Mocked<ISpacesGateway> {
  return Object.assign(mockInterface<ISpacesGateway>(), overrides);
}

export function createMockSkillsGateway(
  overrides?: Partial<jest.Mocked<ISkillsGateway>>,
): jest.Mocked<ISkillsGateway> {
  return Object.assign(mockInterface<ISkillsGateway>(), overrides);
}

export function createMockCommandsGateway(
  overrides?: Partial<jest.Mocked<ICommandsGateway>>,
): jest.Mocked<ICommandsGateway> {
  return Object.assign(mockInterface<ICommandsGateway>(), overrides);
}

export function createMockStandardsGateway(
  overrides?: Partial<jest.Mocked<IStandardsGateway>>,
): jest.Mocked<IStandardsGateway> {
  return Object.assign(mockInterface<IStandardsGateway>(), overrides);
}

export function createMockPackagesGateway(
  overrides?: Partial<jest.Mocked<IPackagesGateway>>,
): jest.Mocked<IPackagesGateway> {
  return Object.assign(mockInterface<IPackagesGateway>(), overrides);
}

export function createMockOrganizationGateway(
  overrides?: Partial<jest.Mocked<IOrganizationGateway>>,
): jest.Mocked<IOrganizationGateway> {
  return Object.assign(mockInterface<IOrganizationGateway>(), overrides);
}

export function createMockLinterGateway(
  overrides?: Partial<jest.Mocked<ILinterGateway>>,
): jest.Mocked<ILinterGateway> {
  const linter = mockInterface<ILinterGateway>();
  linter.trackLinterExecution.mockResolvedValue({});
  return Object.assign(linter, overrides);
}

export function createMockDeploymentGateway(
  overrides?: Partial<jest.Mocked<IDeploymentGateway>>,
): jest.Mocked<IDeploymentGateway> {
  const deployment = mockInterface<IDeploymentGateway>();
  deployment.getLatestVersion.mockResolvedValue({ version: 1 });
  return Object.assign(deployment, overrides);
}
