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

/**
 * The shape a mock tree really has: every nested field is a mock, not the bare
 * interface. `jest.Mocked<T>` does not recurse, so without this a spec reaching
 * through the tree - `gateway.changeProposals.batchCreate.mockResolvedValue(...)` -
 * sees the plain interface and has no `mockResolvedValue` to call.
 */
export type MockTree<T> = { [K in keyof T]: jest.Mocked<T[K]> };

/**
 * Each override is a whole sub-mock, not a partial to merge. A `mockInterface`
 * mock is a proxy whose members are materialised lazily, so its own keys are
 * empty until something touches them - merging one into a fresh mock would
 * silently copy nothing. The supplied mock is used as-is instead, which is also
 * what callers want: they keep a reference and stub it after the tree is built.
 */
export type MockPackmindGatewayOverrides = Partial<MockTree<IPackmindGateway>>;

/**
 * `IPackmindGateway` is all data members - one nested gateway per field - so
 * `mockInterface` cannot build it on its own: it demands them, rather than
 * answering a `jest.fn()` where the interface declares an object. Mock a single
 * gateway with `mockInterface<IFooGateway>()` directly; this factory is only for
 * the whole tree.
 */
export function createMockPackmindGateway(
  overrides?: MockPackmindGatewayOverrides,
): MockTree<IPackmindGateway> {
  return {
    changeProposals: mockInterface<IChangeProposalGateway>(),
    linter: createMockLinterGateway(),
    spaces: mockInterface<ISpacesGateway>(),
    skills: mockInterface<ISkillsGateway>(),
    commands: mockInterface<ICommandsGateway>(),
    standards: mockInterface<IStandardsGateway>(),
    packages: mockInterface<IPackagesGateway>(),
    deployment: createMockDeploymentGateway(),
    organization: mockInterface<IOrganizationGateway>(),
    repositoryTracking: mockInterface<IRepositoryTrackingGateway>(),
    ...overrides,
  };
}

/** Kept for the seeded default; stub anything else on the returned mock. */
export function createMockLinterGateway(): jest.Mocked<ILinterGateway> {
  const linter = mockInterface<ILinterGateway>();
  linter.trackLinterExecution.mockResolvedValue({});
  return linter;
}

/** Kept for the seeded default; stub anything else on the returned mock. */
export function createMockDeploymentGateway(): jest.Mocked<IDeploymentGateway> {
  const deployment = mockInterface<IDeploymentGateway>();
  deployment.getLatestVersion.mockResolvedValue({ version: 1 });
  return deployment;
}
