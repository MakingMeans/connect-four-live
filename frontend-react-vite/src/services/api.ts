import type { AuthTokensResponse } from '../types/auth';
import { tokenStorage } from './tokenStorage';

const API_BASE_URL = 'http://localhost:8000';
export const AUTH_EXPIRED_EVENT = 'connect4:auth-expired';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: BodyInit | FormData | object;
  headers?: HeadersInit;
  auth?: boolean;
  retryOnAuthError?: boolean;
}

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

let refreshRequest: Promise<string | null> | null = null;

function notifyAuthExpired() {
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

function buildApiError(response: Response, data: unknown): ApiError {
  const message =
    typeof data === 'object' && data !== null && 'detail' in data && typeof data.detail === 'string'
      ? data.detail
      : `Request failed with status ${response.status}`;

  return new ApiError(message, response.status, data);
}

async function parseResponse<T>(response: Response): Promise<T | null> {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  const text = await response.text();
  return (text as T) || null;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) {
    tokenStorage.clearTokens();
    notifyAuthExpired();
    return null;
  }

  if (!refreshRequest) {
    refreshRequest = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        const data = await parseResponse<AuthTokensResponse>(response);
        if (!response.ok || !data) {
          throw buildApiError(response, data);
        }

        tokenStorage.setTokens({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
        });

        return data.access_token;
      } catch {
        tokenStorage.clearTokens();
        notifyAuthExpired();
        return null;
      } finally {
        refreshRequest = null;
      }
    })();
  }

  return refreshRequest;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    headers,
    auth = true,
    retryOnAuthError = true,
  } = options;

  const requestHeaders = new Headers(headers);
  let requestBody: BodyInit | undefined;

  if (body instanceof FormData) {
    requestBody = body;
  } else if (body !== undefined) {
    requestHeaders.set('Content-Type', 'application/json');
    requestBody = JSON.stringify(body);
  }

  if (auth) {
    const accessToken = tokenStorage.getAccessToken();
    if (accessToken) {
      requestHeaders.set('Authorization', `Bearer ${accessToken}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: requestHeaders,
    body: requestBody,
  });

  if (response.status === 401 && auth && retryOnAuthError) {
    const nextToken = await refreshAccessToken();
    if (nextToken) {
      return request<T>(path, { ...options, retryOnAuthError: false });
    }
  }

  const data = await parseResponse<T>(response);
  if (!response.ok) {
    throw buildApiError(response, data);
  }

  return data as T;
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong.') {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export const apiClient = {
  get<T>(path: string, options?: Omit<RequestOptions, 'method'>) {
    return request<T>(path, { ...options, method: 'GET' });
  },

  post<T>(path: string, body?: RequestOptions['body'], options?: Omit<RequestOptions, 'method' | 'body'>) {
    return request<T>(path, { ...options, method: 'POST', body });
  },

  put<T>(path: string, body?: RequestOptions['body'], options?: Omit<RequestOptions, 'method' | 'body'>) {
    return request<T>(path, { ...options, method: 'PUT', body });
  },
};
