import type { ApiResponse, PaginatedResponse } from '@paybridge/shared-types';

export interface HttpClientConfig {
  baseURL: string;
  timeout?: number;
  getToken?: () => string | null;
  onUnauthorized?: () => void;
  onError?: (error: Error) => void;
}

export class HttpClient {
  private config: HttpClientConfig;

  constructor(config: HttpClientConfig) {
    this.config = {
      timeout: 30000,
      ...config,
    };
  }

  private async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      params?: Record<string, unknown>;
      headers?: Record<string, string>;
    },
  ): Promise<T> {
    const url = new URL(path, this.config.baseURL);

    // Add query params
    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    // Add auth token
    const token = this.config.getToken?.();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout,
    );

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: options?.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          this.config.onUnauthorized?.();
        }

        const error = new Error(data?.error?.message || 'Request failed');
        (error as any).code = data?.error?.code || 'UNKNOWN_ERROR';
        (error as any).status = response.status;
        (error as any).details = data?.error?.details;
        throw error;
      }

      // Extract data from ApiResponse wrapper
      if (data.success && 'data' in data) {
        return data.data as T;
      }

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          const timeoutError = new Error('Request timeout');
          (timeoutError as any).code = 'TIMEOUT';
          this.config.onError?.(timeoutError);
          throw timeoutError;
        }
        this.config.onError?.(error);
      }
      throw error;
    }
  }

  async get<T>(
    path: string,
    params?: Record<string, unknown>,
    headers?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>('GET', path, { params, headers });
  }

  async post<T>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>('POST', path, { body, headers });
  }

  async put<T>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>('PUT', path, { body, headers });
  }

  async patch<T>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>('PATCH', path, { body, headers });
  }

  async delete<T>(
    path: string,
    headers?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>('DELETE', path, { headers });
  }
}

// Singleton instance factory
let httpClient: HttpClient | null = null;

export function createHttpClient(config: HttpClientConfig): HttpClient {
  httpClient = new HttpClient(config);
  return httpClient;
}

export function getHttpClient(): HttpClient {
  if (!httpClient) {
    throw new Error('HttpClient not initialized. Call createHttpClient first.');
  }
  return httpClient;
}
