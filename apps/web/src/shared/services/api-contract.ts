export interface ApiErrorBody {
  message?: string | string[];
  code?: string;
  errors?: { field: string; message: string }[];
  error?:
    | string
    | {
        code?: string;
        message?: string;
        fields?: Record<string, string[]>;
      };
}

export function readApiError(value: unknown, fallback: string) {
  const body =
    value && typeof value === "object" ? (value as ApiErrorBody) : null;
  const detail = typeof body?.error === "object" ? body.error : undefined;
  const message = detail?.message ?? body?.message;
  return {
    message: Array.isArray(message)
      ? (message[0] ?? fallback)
      : (message ?? fallback),
    code: detail?.code ?? body?.code,
    errors: detail?.fields
      ? Object.entries(detail.fields).flatMap(([field, messages]) =>
          messages.map((message) => ({ field, message })),
        )
      : (body?.errors ?? []),
  };
}

export function apiUrl(path: string): string {
  // Usamos rutas relativas para que Next.js haga el proxy y no haya problemas de CORS/Cookies
  const cleanPath = path.startsWith("/api/v1") ? path.substring(7) : path;
  const normalizedPath = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
  return `/api/v1${normalizedPath}`;
}