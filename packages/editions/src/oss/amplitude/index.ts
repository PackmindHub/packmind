export type AmplitudeConfig = {
  amplitudeKey: string | undefined;
  amplitudeRegion: string | undefined;
};

export function enableAmplitudeProxy(app?: unknown) {
  if (app === null) {
    return;
  }
}

export { AmplitudeModule } from './nest-api/amplitude/amplitude.module';
