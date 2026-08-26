/**
 * The gate matrix for `otelStarted`, which `instrument.ts` forwards as Sentry's
 * `skipOpenTelemetrySetup`. Nothing about getting this wrong is loud: two tracer
 * providers leave the API serving traffic with no traces and no error, which is
 * exactly the failure this flag exists to prevent.
 *
 * `jest.isolateModulesAsync` because otel.ts decides everything at module load
 * from `process.env`, so each case needs a fresh evaluation.
 */
describe('otelStarted', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env['OTEL_EXPORTER_OTLP_ENDPOINT'];
    delete process.env['OTEL_RESOURCE_ATTRIBUTES'];
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
