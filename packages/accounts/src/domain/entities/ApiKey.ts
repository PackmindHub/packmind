export interface ApiKeyPayload {
  host: string;

  jwt: string;
}

export interface DecodedApiKey {
  payload: ApiKeyPayload;

  isValid: boolean;

  error?: string;
}
