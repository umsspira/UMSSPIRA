import { databaseErrorSummary } from './database-error-summary';
describe('safe database diagnostics', () => {
  it('classifies timeouts without exposing credentials or SQL', () => {
    const text = databaseErrorSummary({
      code: 'P2028',
      message: 'Transaction expired; postgresql://user:secret@host/db SELECT private_data',
    });
    expect(text).toContain('reason=timeout');
    expect(text).toContain('P2028');
    expect(text).not.toMatch(/secret|postgresql|private_data/);
  });
  it('preserves PostgreSQL SQLSTATE and connection failures', () => {
    expect(databaseErrorSummary({ code: 'P2010', meta: { code: '42P01' } })).toContain(
      'missing_table',
    );
    expect(
      databaseErrorSummary({
        cause: { code: 'ECONNRESET', message: 'Connection terminated unexpectedly' },
      }),
    ).toContain('connection_failure');
  });
});
