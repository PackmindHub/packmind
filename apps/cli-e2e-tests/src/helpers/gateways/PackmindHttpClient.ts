interface IRequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
}

export class PackmindHttpClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  async request<T>(path: string, options: IRequestOptions = {}): Promise<T> {
    const { method = 'GET', body } = options;
    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      let errorMsg = `API request failed: ${response.status} ${response.statusText}`;
      try {
        const errorBody = await response.json();
        if (errorBody?.message) {
          errorMsg = errorBody.message;
        }
      } catch {
        // ignore
      }
      throw new Error(errorMsg);
    }

    return response.json();
  }

  getOrganizationId(): string {
    // Decode the API key to get organization ID
    const decoded = JSON.parse(
      Buffer.from(this.apiKey, 'base64').toString('utf-8'),
    );
    const jwtPayload = this.decodeJwt(decoded.jwt);
    return jwtPayload?.organization?.id;
  }

  private decodeJwt(jwt: string): { organization?: { id?: string } } | null {
    try {
      const parts = jwt.split('.');
      if (parts.length !== 3) {
        return null;
      }
      const payloadBase64 = parts[1];
      const payloadString = Buffer.from(payloadBase64, 'base64').toString(
        'utf-8',
      );
      return JSON.parse(payloadString);
    } catch {
      return null;
    }
  }
}
