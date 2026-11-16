import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { environmentSchema } from './environment';

// El servicio de Render se crea desde la raíz del monorepo: se lee el manifiesto
// versionado para comprobar que el despliegue declara lo que el esquema exige.
const renderManifest = readFileSync(resolve(__dirname, '../../../../render.yaml'), 'utf8');

const declaredInRender = new Set(
  [...renderManifest.matchAll(/^\s*-\s*key:\s*([A-Z0-9_]+)\s*$/gm)].map((match) => match[1]),
);

describe('render.yaml', () => {
  it('declara todas las variables obligatorias del esquema de entorno', () => {
    const result = environmentSchema.safeParse({});
    const required = result.success
      ? []
      : [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];

    // Si el esquema deja de tener obligatorias, esta prueba pierde sentido.
    expect(required).toEqual(
      expect.arrayContaining(['DATABASE_URL', 'AUTH_JWT_SECRET', 'VAPID_PUBLIC_KEY']),
    );
    expect(required.filter((key) => !declaredInRender.has(key))).toEqual([]);
  });
});
