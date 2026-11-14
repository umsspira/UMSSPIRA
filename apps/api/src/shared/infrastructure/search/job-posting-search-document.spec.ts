import {
  toJobPostingSearchDocument,
  parseJobPostingSearchDocument,
  type JobPostingSearchSource,
} from './job-posting-search-document';

const now = new Date('2026-11-14T12:00:00.000Z');

describe('Validacion del documento serializado HU4/HU7', () => {
  it('acepta la salida del mapper y no expone propiedades adicionales', () => {
    const document = toJobPostingSearchDocument(vacancy(), now);
    expect(
      parseJobPostingSearchDocument({ ...document, extra: 'interno' }),
    ).toEqual(document);
  });

  it('conserva los nulos permitidos', () => {
    const source = {
      ...vacancy(),
      titulo: null,
      id_empresa: null,
      empresa: null,
      estado: null,
      created_at: null,
      fecha_cierre: null,
    };
    const document = toJobPostingSearchDocument(source, now);
    expect(parseJobPostingSearchDocument(document)).toEqual(document);
  });

  it.each([
    { schema_version: 2 },
    { id: 'no-uuid' },
    { titulo: 3 },
    { id_empresa: 'no-uuid' },
    { razon_social: {} },
    { estado: 1 },
    { disponible: 'true' },
    { created_at: 'fecha-invalida' },
    { fecha_cierre: '2026-02-30T12:00:00.000Z' },
    { fecha_cierre: undefined },
    { created_at: undefined },
  ])('rechaza campos invalidos o ausentes', (patch) => {
    expect(() =>
      parseJobPostingSearchDocument({
        ...toJobPostingSearchDocument(vacancy(), now),
        ...patch,
      }),
    ).toThrow(TypeError);
  });

  it.each([null, [], 'documento', {}])(
    'rechaza estructuras sin contrato',
    (value) => {
      expect(() => parseJobPostingSearchDocument(value)).toThrow(TypeError);
    },
  );
});

function vacancy(): JobPostingSearchSource {
  return {
    id: '10000000-0000-4000-8000-000000000001',
    titulo: 'Desarrollador backend',
    id_empresa: '20000000-0000-4000-8000-000000000001',
    empresa: { razon_social: 'Empresa de prueba' },
    estado: 'PUBLICADO',
    created_at: new Date('2026-11-01T08:00:00-04:00'),
    fecha_cierre: new Date('2026-11-15T12:00:00.000Z'),
  };
}

describe('Contrato provisional de documentos HU4/HU7 (sin servicios externos)', () => {
  it('proyecta solo los campos acordados y serializa las fechas en UTC', () => {
    expect(toJobPostingSearchDocument(vacancy(), now)).toEqual({
      schema_version: 1,
      id: '10000000-0000-4000-8000-000000000001',
      titulo: 'Desarrollador backend',
      id_empresa: '20000000-0000-4000-8000-000000000001',
      razon_social: 'Empresa de prueba',
      estado: 'PUBLICADO',
      disponible: true,
      created_at: '2026-11-01T12:00:00.000Z',
      fecha_cierre: '2026-11-15T12:00:00.000Z',
    });
  });

  it('conserva todos los nulos permitidos sin inventar datos', () => {
    const document = toJobPostingSearchDocument(
      {
        id: vacancy().id,
        titulo: null,
        id_empresa: null,
        empresa: null,
        estado: null,
        created_at: null,
        fecha_cierre: null,
      },
      now,
    );

    expect(document).toEqual({
      schema_version: 1,
      id: vacancy().id,
      titulo: null,
      id_empresa: null,
      razon_social: null,
      estado: null,
      disponible: false,
      created_at: null,
      fecha_cierre: null,
    });
  });

  it('conserva una razon social nula aunque exista la empresa', () => {
    const source = { ...vacancy(), empresa: { razon_social: null } };
    expect(toJobPostingSearchDocument(source, now).razon_social).toBeNull();
  });

  it('acepta UUID con letras mayusculas sin modificar los identificadores', () => {
    const id = 'ABCDEF01-2345-4678-9ABC-DEF012345678';
    const document = toJobPostingSearchDocument(
      { ...vacancy(), id, id_empresa: id },
      now,
    );
    expect(document.id).toBe(id);
    expect(document.id_empresa).toBe(id);
  });

  it.each([
    ['id', 'vacante-001'],
    ['id', '10000000000040008000000000000001'],
    ['id_empresa', 'empresa-001'],
    ['id_empresa', 'z0000000-0000-4000-8000-000000000001'],
  ] as const)('rechaza %s con UUID invalido: %s', (field, value) => {
    expect(() =>
      toJobPostingSearchDocument({ ...vacancy(), [field]: value }, now),
    ).toThrow(`${field} debe ser un UUID valido.`);
  });

  it.each([
    'PUBLICADO',
    'PUBLICADA',
    'ACTIVA',
    'ACTIVO',
    'ACTIVE',
    'PUBLISHED',
  ])('considera vigente el estado oficial %s con cierre futuro', (estado) => {
    expect(
      toJobPostingSearchDocument({ ...vacancy(), estado }, now).disponible,
    ).toBe(true);
  });

  it.each([null, 'CERRADA', 'BORRADOR', 'Publicada', ' ACTIVA ', 'DISPONIBLE'])(
    'no considera disponible el estado %s aunque su cierre sea futuro',
    (estado) => {
      const document = toJobPostingSearchDocument(
        { ...vacancy(), estado },
        now,
      );
      expect(document.disponible).toBe(false);
      expect(document.estado).toBe(estado);
    },
  );

  it('considera vigente una vacante publicada sin fecha de cierre', () => {
    const document = toJobPostingSearchDocument(
      { ...vacancy(), fecha_cierre: null },
      now,
    );
    expect(document.disponible).toBe(true);
    expect(document.fecha_cierre).toBeNull();
  });

  it.each([
    [-1, false],
    [0, false],
    [1, true],
  ] as const)(
    'evalua el cierre a %i ms del instante recibido',
    (offset, disponible) => {
      const source = {
        ...vacancy(),
        fecha_cierre: new Date(now.getTime() + offset),
      };
      expect(toJobPostingSearchDocument(source, now).disponible).toBe(
        disponible,
      );
    },
  );

  it.each(['created_at', 'fecha_cierre'] as const)(
    'rechaza una fecha invalida en %s incluso en una vacante cerrada',
    (field) => {
      const source = {
        ...vacancy(),
        estado: 'CERRADA',
        [field]: new Date(NaN),
      };
      expect(() => toJobPostingSearchDocument(source, now)).toThrow(
        `${field} debe ser una fecha valida.`,
      );
    },
  );

  it('rechaza un instante actual invalido', () => {
    expect(() => toJobPostingSearchDocument(vacancy(), new Date(NaN))).toThrow(
      'now debe ser una fecha valida.',
    );
  });

  it('rechaza fechas ausentes o cadenas en vez de tratarlas como nulas', () => {
    const missingClosingDate = { ...vacancy(), fecha_cierre: undefined };
    const stringCreatedAt = {
      ...vacancy(),
      created_at: '2026-11-01T12:00:00.000Z',
    };
    expect(() =>
      toJobPostingSearchDocument(
        missingClosingDate as unknown as JobPostingSearchSource,
        now,
      ),
    ).toThrow('fecha_cierre debe ser una fecha valida.');
    expect(() =>
      toJobPostingSearchDocument(
        stringCreatedAt as unknown as JobPostingSearchSource,
        now,
      ),
    ).toThrow('created_at debe ser una fecha valida.');
  });

  it('no modifica la fuente ni las fechas y usa exclusivamente el instante recibido', () => {
    const source = vacancy();
    Object.freeze(source.empresa);
    Object.freeze(source);
    const before = JSON.stringify(source);
    const nowBefore = now.getTime();

    const current = toJobPostingSearchDocument(source, now);
    const atClosing = toJobPostingSearchDocument(source, source.fecha_cierre!);

    expect(current.disponible).toBe(true);
    expect(atClosing.disponible).toBe(false);
    expect(JSON.stringify(source)).toBe(before);
    expect(now.getTime()).toBe(nowBefore);
  });
});
