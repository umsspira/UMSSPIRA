// Never log raw SQL, URLs, credentials or request values.
export function databaseErrorSummary(error: unknown): string {
  const records = nestedErrorRecords(error);
  if (records.length === 0) {return '';}

  const codes = records
    .flatMap((record) => [record.code, record.sqlState, record.sqlstate, record.originalCode])
    .filter(
      (code): code is string =>
        typeof code === 'string' && /^(?:P\d{4}|[0-9A-Z]{5}|E[A-Z_]{2,30})$/.test(code),
    );
  const text = records
    .flatMap((record) => [record.message, record.error])
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
            : codes.includes('23505')
              ? 'unique_violation'
              : codes.includes('23503')
                ? 'foreign_key_violation'
                : codes.includes('23514')
                  ? 'check_violation'
                  : codes.includes('42804')
                    ? 'datatype_mismatch'
                  : 'unclassified';
  return ` reason=${reason}${codes.length ? ` codes=${[...new Set(codes)].join(',')}` : ''}`;
}

function nestedErrorRecords(error: unknown): Array<Record<string, unknown>> {
  const records: Array<Record<string, unknown>> = [];
  const visited = new Set<object>();
  const queue: Array<{ value: unknown; depth: number }> = [{ value: error, depth: 0 }];
  const nestedKeys = ['cause', 'meta', 'driverAdapterError', 'originalError', 'original'];

  while (queue.length > 0) {
    const entry = queue.shift();
    if (!entry || !entry.value || typeof entry.value !== 'object' || visited.has(entry.value)) {
      continue;
    }

    visited.add(entry.value);
    const record = entry.value as Record<string, unknown>;
    records.push(record);
    if (entry.depth >= 4) {
      continue;
    }
    for (const key of nestedKeys) {
      queue.push({ value: record[key], depth: entry.depth + 1 });
    }
  }

  return records;
}
