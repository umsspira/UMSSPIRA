// Never log raw SQL, URLs, credentials or request values.
export function databaseErrorSummary(error: unknown): string {
  if (!error || typeof error !== 'object') {return '';}
  const value = error as {
    code?: unknown;
    message?: unknown;
    cause?: { code?: unknown; message?: unknown };
    meta?: { code?: unknown; error?: unknown };
  };
  const codes = [value.code, value.cause?.code, value.meta?.code].filter(
    (code): code is string =>
      typeof code === 'string' && /^(?:P\d{4}|[0-9A-Z]{5}|E[A-Z_]{2,30})$/.test(code),
  );
  const text = [value.message, value.cause?.message, value.meta?.error]
    .filter((item) => typeof item === 'string')
    .join(' ');
  const reason = /timeout|timed out|expired/i.test(text)
    ? 'timeout'
    : /too many (?:clients|connections)|remaining connection slots/i.test(text)
      ? 'connection_limit'
      : /connection.*(?:closed|terminated|refused)|ECONN|ENOTFOUND|EAI_AGAIN/i.test(text)
        ? 'connection_failure'
        : codes.includes('42P01')
          ? 'missing_table'
          : codes.includes('42703')
            ? 'missing_column'
            : 'unclassified';
  return ` reason=${reason}${codes.length ? ` codes=${[...new Set(codes)].join(',')}` : ''}`;
}
