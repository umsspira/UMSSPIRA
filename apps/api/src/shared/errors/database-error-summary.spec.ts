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

  it('classifies adapter-wrapped PostgreSQL errors without exposing driver details', () => {
    const text = databaseErrorSummary({
      code: 'P2010',
      meta: {
        driverAdapterError: {
          cause: {
            originalCode: '23505',
            message: 'duplicate key for private_event_data',
          },
        },
      },
    });

    expect(text).toContain('reason=unique_violation');
    expect(text).toContain('codes=P2010,23505');
    expect(text).not.toContain('private_event_data');
    expect(text).not.toContain('duplicate key');
  });

  it('classifies PostgreSQL datatype mismatches', () => {
    expect(databaseErrorSummary({ code: 'P2010', meta: { code: '42804' } }))
      .toContain('reason=datatype_mismatch');
  });
});
