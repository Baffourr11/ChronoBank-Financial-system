import { NextResponse } from 'next/server';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export function apiSuccess<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(error: string, status = 400): NextResponse<ApiResponse<null>> {
  return NextResponse.json(
    { success: false, error, data: null },
    { status }
  );
}

export function apiMessage(message: string, status = 200): NextResponse<ApiResponse<null>> {
  return NextResponse.json(
    { success: true, message, data: null },
    { status }
  );
}

export async function parseApiJson<T = { error?: string; data?: T }>(
  response: Response,
): Promise<T | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchApi<T>(
  url: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
  try {
    const response = await fetch(url, {
      credentials: 'include',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        data: null,
        error: errorData.error || `Request failed with status ${response.status}`,
      };
    }

    const data = await response.json();
    return { data: data.data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
