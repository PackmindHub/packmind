export type AmplitudeConfig = {
  amplitudeKey: string | undefined;
  amplitudeRegion: string | undefined;
};

export async function enableAmplitudeProxy(app?: unknown) {
  if (app === null) {
    return;
  }
}

export { AmplitudeModule } from './nest-api/amplitude/amplitude.module';
export { AnalyticsAdapter } from './application/AnalyticsAdapter';
export type { AmplitudeNodeEvent } from './domain/entities/AmplitudeNodeEvent';
