import { config } from 'dotenv';
import { resolve } from 'node:path';
import { Client } from 'pg';
import {
  assertTeamPermissionTarget,
  parsePermissionMode,
  PermissionOperationError,
  runNlpPermissionOperation,
} from './nlp-permissions';

export async function grantNlpPermissions(args: string[] = process.argv.slice(2)): Promise<void> {
  const mode = parsePermissionMode(args);
  config({ path: resolve(__dirname, '../../.env'), quiet: true });

  const connectionString = process.env.DIRECT_URL;
  assertTeamPermissionTarget(connectionString, mode);

  // Impedir que dos variables apunten a proyectos diferentes.
  if (process.env.DATABASE_URL) {
    assertTeamPermissionTarget(process.env.DATABASE_URL, mode);

    const directUrl = new URL(connectionString);
    const databaseUrl = new URL(process.env.DATABASE_URL);

    const projectRef = (url: URL): string => {
      if (url.hostname.startsWith('db.') &&
          url.hostname.endsWith('.supabase.co')) {
        return url.hostname.slice(3, -'.supabase.co'.length);
      }

      return decodeURIComponent(url.username).replace(/^postgres\./, '');
    };

    if (projectRef(directUrl) !== projectRef(databaseUrl)) {
      throw new PermissionOperationError('destino: proyectos diferentes');
    }
  }

  const refQa = process.env.NLP_PERMISSIONS_QA_PROJECT_REF;
  const isQa = Boolean(
    refQa &&
    (connectionString.includes(`db.${refQa}.supabase.co`) ||
      connectionString.includes(`postgres.${refQa}@`)),
  );

  const target = isQa ? 'qa' : 'um***-dev';

  const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    const result = await runNlpPermissionOperation(client, mode);
    console.info(JSON.stringify({ target, host: '***', ...result }, null, 2));
    if (result.blocked) {
      process.exitCode = 1;
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  void grantNlpPermissions().catch((error: unknown) => {
    console.error(
      error instanceof PermissionOperationError
        ? error.message
        : 'No se pudo completar la operación dirigida; revisa conexión y configuración local.',
    );
    process.exitCode = 1;
  });
}
