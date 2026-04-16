export interface AmplitudeConfig {
  amplitudeKey: string | undefined;
  amplitudeRegion: string | undefined;
}

export interface IAmplitudeGateway {
  getConfig(): Promise<AmplitudeConfig>;
  getProxyUrl(): string;
}
