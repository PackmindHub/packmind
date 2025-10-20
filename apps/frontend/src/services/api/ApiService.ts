import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  isPackmindError,
  isServerErrorResponse,
  PackmindError,
} from './errors/PackmindError';
import { PackmindConflictError } from './errors/PackmindConflictError';

const API_VERSION = 'v0';

export class ApiService {
  private readonly _axiosInstance: AxiosInstance;
  private readonly _version: string = API_VERSION;
  private readonly _baseApiUrl: string;

  constructor(baseURL: string) {
    const baseUrlWithApi = baseURL.endsWith('/api')
      ? baseURL
      : `${baseURL}/api`;

    this._baseApiUrl = this.getVersionedBaseUrl(baseUrlWithApi);
    this._axiosInstance = axios.create({
      baseURL: this._baseApiUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Enable cookies for session auth
    });
  }

  private getVersionedBaseUrl(url: string): string {
    return `${url}/${this._version}`;
  }

  get baseApiUrl() {
    return this._baseApiUrl;
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this._axiosInstance.get<T>(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    try {
      const response = await this._axiosInstance.post<T>(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    try {
      const response = await this._axiosInstance.put<T>(url, data, config);
      return response.data;
    } catch (error) {
      console.log('error in put: ', error);
      throw this.handleError(error);
    }
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this._axiosInstance.delete<T>(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    try {
      const response = await this._axiosInstance.patch<T>(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): Error {
    if (error && typeof error === 'object' && 'response' in error) {
      if (isServerErrorResponse(error.response)) {
        switch (error.response.status) {
          case 409:
            return new PackmindConflictError(error.response);
          default:
            return new PackmindError(error.response);
        }
      }

      const response = error.response as { statusText?: string };
      if (response?.statusText) {
        return new Error(`API Error: ${response.statusText}`);
      }
    }

    if (error && typeof error === 'object' && 'request' in error) {
      // Request was made but no response received
      return new Error('Network Error: No response from server');
    } else {
      // Something else happened
      const message = error instanceof Error ? error.message : 'Unknown error';
      return new Error(`Request Error: ${message}`);
    }
  }

  // Get the axios instance for advanced usage
  getAxiosInstance(): AxiosInstance {
    return this._axiosInstance;
  }
}
