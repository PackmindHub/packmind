import { INestApplication } from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { Configuration } from '@packmind/node-utils';
import { createProxyMiddleware } from 'http-proxy-middleware';

const origin = 'enableAmplitudeProxy';
const logger = new PackmindLogger(origin, LogLevel.INFO);

export async function enableAmplitudeProxy(app: INestApplication<unknown>) {
  // Fetch Amplitude region from configuration
  const amplitudeRegion = await Configuration.getConfig(
    'AMPLITUDE_REGION',
    process.env,
  );

  if (!amplitudeRegion) {
    return;
  }

  // Map region to Amplitude API endpoint
  const getAmplitudeApiUrl = (region: string | undefined): string => {
    switch (region?.toLowerCase()) {
      case 'eu':
        return 'https://api.eu.amplitude.com';
      case 'us':
      default:
        return 'https://api2.amplitude.com';
    }
  };

  const target = getAmplitudeApiUrl(amplitudeRegion);

  logger.info('Setting up Amplitude proxy', {
    region: amplitudeRegion || 'us (default)',
    target,
  });

  app.use(
    '/api/v0/amplitude/collect',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      secure: true,
      // Force the upstream path to be exactly "/2/httpapi"
      pathRewrite: () => '/2/httpapi',
    }),
  );
}
