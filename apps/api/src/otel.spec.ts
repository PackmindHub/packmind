/**
 * Everything otel.ts decides at module load from `process.env`: the gate matrix
 * for `otelStarted`, and which instrumentations the bundle is asked to enable.
 *
 * `otelStarted` is what `instrument.ts` forwards as Sentry's
 * `skipOpenTelemetrySetup`, and nothing about getting it wrong is loud: two
 * tracer providers leave the API serving traffic with no traces and no error,
 * which is exactly the failure the flag exists to prevent.
 *
 * `jest.isolateModulesAsync` throughout, because the module evaluates those
 * decisions once, so each case needs a fresh evaluation.
 */
type InstrumentationConfigs = Record<string, { enabled?: boolean }>;

/**
 * Config objects handed to `getNodeAutoInstrumentations`, newest last.
 *
 * The real bundle still builds the instrumentations from them, so the gate
 * matrix keeps exercising an actual SDK start rather than a stub.
 */
const capturedConfigs: InstrumentationConfigs[] = [];

jest.mock('@opentelemetry/auto-instrumentations-node', () => {
  const actual = jest.requireActual<
    typeof import('@opentelemetry/auto-instrumentations-node')
  >('@opentelemetry/auto-instrumentations-node');

  return {
    ...actual,
    getNodeAutoInstrumentations: (configs: InstrumentationConfigs) => {
      capturedConfigs.push(configs);
      return actual.getNodeAutoInstrumentations(configs);
    },
  };
});

const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
  delete process.env['OTEL_EXPORTER_OTLP_ENDPOINT'];
  delete process.env['OTEL_RESOURCE_ATTRIBUTES'];
  delete process.env['PACKMIND_OTEL_INSTRUMENT_PG'];
  capturedConfigs.length = 0;
});

afterEach(() => {
  process.env = originalEnv;
  jest.clearAllMocks();
});

const loadOtel = async (): Promise<boolean> => {
  let started = false;
  await jest.isolateModulesAsync(async () => {
    const otel = await import('./otel');
    started = otel.otelStarted;
    await otel.shutdownOtel();
  });
  return started;
};

describe('otelStarted', () => {
  describe('when no endpoint is configured', () => {
    it('does not start the SDK', async () => {
      await expect(loadOtel()).resolves.toBe(false);
    });
  });

  describe('when an endpoint is configured with an environment', () => {
    it('starts the SDK', async () => {
      process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] = 'http://localhost:4318';
      process.env['OTEL_RESOURCE_ATTRIBUTES'] =
        'deployment.environment.name=test';

      await expect(loadOtel()).resolves.toBe(true);
    });
  });

  describe('when an endpoint is configured without an environment', () => {
    it('refuses to start rather than mislabel the deployment', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] = 'http://localhost:4318';

      await expect(loadOtel()).resolves.toBe(false);
    });
  });

  describe('when the environment is declared among other resource attributes', () => {
    it('starts the SDK', async () => {
      process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] = 'http://localhost:4318';
      process.env['OTEL_RESOURCE_ATTRIBUTES'] =
        'service.version=dev,deployment.environment.name=staging';

      await expect(loadOtel()).resolves.toBe(true);
    });
  });
});

/**
 * Statement-level Postgres spans are opt-in, and the default matters as much as
 * the switch: one repository call expands into eight-plus `pg.query` /
 * `pg-pool.connect` children, so a flag that leaked on would bury the
 * first-party spans in every trace.
 */
describe('Postgres instrumentation', () => {
  const loadPgEnabled = async (): Promise<boolean | undefined> => {
    process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] = 'http://localhost:4318';
    process.env['OTEL_RESOURCE_ATTRIBUTES'] =
      'deployment.environment.name=test';

    await loadOtel();

    return capturedConfigs.at(-1)?.['@opentelemetry/instrumentation-pg']
      ?.enabled;
  };

  describe('when PACKMIND_OTEL_INSTRUMENT_PG is unset', () => {
    it('leaves the pg instrumentation disabled', async () => {
      await expect(loadPgEnabled()).resolves.toBe(false);
    });
  });

  describe('when PACKMIND_OTEL_INSTRUMENT_PG is true', () => {
    it('enables the pg instrumentation', async () => {
      process.env['PACKMIND_OTEL_INSTRUMENT_PG'] = 'true';

      await expect(loadPgEnabled()).resolves.toBe(true);
    });
  });

  describe('when PACKMIND_OTEL_INSTRUMENT_PG is padded and mixed case', () => {
    it('enables the pg instrumentation', async () => {
      process.env['PACKMIND_OTEL_INSTRUMENT_PG'] = '  TRUE ';

      await expect(loadPgEnabled()).resolves.toBe(true);
    });
  });

  describe('when PACKMIND_OTEL_INSTRUMENT_PG holds anything else', () => {
    it('leaves the pg instrumentation disabled', async () => {
      process.env['PACKMIND_OTEL_INSTRUMENT_PG'] = '1';

      await expect(loadPgEnabled()).resolves.toBe(false);
    });
  });
});
