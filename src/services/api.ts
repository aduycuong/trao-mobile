export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  body?: unknown;
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  /** Firebase idToken, sent as a Bearer token (the web API accepts it as well as its cookie). */
  token?: string;
};

function getBaseUrl() {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');

  if (!baseUrl) throw new Error('API chưa được cấu hình. Hãy thêm EXPO_PUBLIC_API_URL.');

  return baseUrl;
}

export async function apiRequest<T>(
  path: string,
  { body, method = body === undefined ? 'GET' : 'POST', token }: RequestOptions = {}
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${getBaseUrl()}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('API chưa')) throw error;
    throw new Error('Không thể kết nối. Hãy kiểm tra mạng và thử lại.');
  }

  const data = (await response.json().catch(() => null)) as
    (T & { error?: string; message?: string }) | null;

  if (!response.ok) {
    throw new ApiError(
      data?.message ?? data?.error ?? 'Có lỗi xảy ra. Vui lòng thử lại.',
      response.status
    );
  }

  return data as T;
}
