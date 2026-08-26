import { node } from '@opentelemetry/sdk-node';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createUserId,
  IAccountsPort,
  PackmindCommand,
  PackmindResult,
} from '@packmind/types';
import { AbstractMemberUseCase } from './AbstractMemberUseCase';

// The rest of the suite runs against the no-op tracer, which records nothing.
// Span names and parentage are what this file is about, so it needs a real
// provider.
const exporter = new node.InMemorySpanExporter();

beforeAll(() => {
  new node.NodeTracerProvider({
    spanProcessors: [new node.SimpleSpanProcessor(exporter)],
  }).register();
});

type TestResponse = PackmindResult & { success: boolean };

class TracedMemberUseCase extends AbstractMemberUseCase<
  PackmindCommand,
  TestResponse
> {
  protected override async executeForMembers(): Promise<TestResponse> {
    return this.aPrivateStep();
  }

  private async aPrivateStep(): Promise<TestResponse> {
    return { success: true };
  }
}

describe('AbstractMemberUseCase tracing', () => {
  const userId = createUserId('member-user-id');
  const organizationId = createOrganizationId('organization-id');
  const command: PackmindCommand = { userId, organizationId };

  let names: string[];

  const spanNamed = (name: string) => {
    const span = exporter.getFinishedSpans().find((it) => it.name === name);
    if (!span) {
      throw new Error(`No span named "${name}" in [${names.join(', ')}]`);
    }
    return span;
  };

  const isChildOf = (child: string, parent: string) =>
    spanNamed(child).parentSpanContext?.spanId ===
    spanNamed(parent).spanContext().spanId;

  beforeEach(async () => {
    exporter.reset();

    const accountsPort = {
      getUserById: jest.fn().mockResolvedValue({
        id: userId,
        email: 'member@test.com',
        passwordHash: 'hash',
        active: true,
        memberships: [{ userId, organizationId, role: 'member' }],
      }),
      getOrganizationById: jest.fn().mockResolvedValue({
        id: organizationId,
        name: 'Test Organization',
        slug: 'test-org',
      }),
    } as unknown as IAccountsPort;

    await new TracedMemberUseCase(accountsPort, stubLogger()).execute(command);

    names = exporter.getFinishedSpans().map((span) => span.name);
  });

  it('qualifies the use-case span like every other method', () => {
    expect(names).toContain('TracedMemberUseCase.execute');
  });

  it('does not also emit a bare class-named span', () => {
    expect(names).not.toContain('TracedMemberUseCase');
  });

  it('spans the access validation inherited from the base', () => {
    expect(
      isChildOf(
        'TracedMemberUseCase.validateMemberAccess',
        'TracedMemberUseCase.execute',
      ),
    ).toBe(true);
  });

  it('spans the private lookups the validation makes', () => {
    expect(
      isChildOf(
        'TracedMemberUseCase.fetchUser',
        'TracedMemberUseCase.validateMemberAccess',
      ),
    ).toBe(true);
  });

  it('spans the subclass entry point', () => {
    expect(
      isChildOf(
        'TracedMemberUseCase.executeForMembers',
        'TracedMemberUseCase.execute',
      ),
    ).toBe(true);
  });

  it('spans a private method of the subclass', () => {
    expect(
      isChildOf(
        'TracedMemberUseCase.aPrivateStep',
        'TracedMemberUseCase.executeForMembers',
      ),
    ).toBe(true);
  });
});
