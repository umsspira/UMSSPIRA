import { PrismaMentorCatalogRepository } from './prisma-mentor-catalog.repository';

interface AreaRow {
  id: string;
  nombre: string;
  padre_id: string | null;
  esta_activo: boolean | null;
}

interface LinkRow {
  id: string;
  id_area: string;
  area: (AreaRow & { padre: AreaRow | null }) | null;
}

interface CustomRow {
  id: string;
  id_mentor: string;
  id_area: string;
  nombre: string;
  area: AreaRow;
}

const MENTOR_ID = 'm1';
const USER_ID = 'u1';

function buildRepository(initialLinks: string[], initialCustom: CustomRow[] = []) {
  const roots: AreaRow[] = [
    { id: 'r1', nombre: 'Tecnología', padre_id: null, esta_activo: true },
    { id: 'r2', nombre: 'QA', padre_id: null, esta_activo: true },
  ];
  const topics: AreaRow[] = [
    { id: 't1', nombre: 'Backend', padre_id: 'r1', esta_activo: true },
    { id: 't2', nombre: 'Frontend', padre_id: 'r1', esta_activo: true },
    { id: 't3', nombre: 'Pruebas manuales', padre_id: 'r2', esta_activo: true },
  ];
  let sequence = 100;
  let links: LinkRow[] = initialLinks.map((id_area) => ({
    id: `l-${id_area}`,
    id_area,
    area: null,
  }));
  const custom = [...initialCustom];

  const areaById = (id: string): AreaRow | undefined =>
    roots.find((root) => root.id === id) ?? topics.find((topic) => topic.id === id);

  const withParent = (area: AreaRow): AreaRow & { padre: AreaRow | null } => ({
    ...area,
    padre: area.padre_id ? (areaById(area.padre_id) ?? null) : null,
  });

  const hydrate = (): LinkRow[] =>
    links.map((link) => ({ ...link, area: link.id_area ? withParent(areaById(link.id_area)!) : null }));

  const tx = {
    $queryRaw: jest.fn(async () => [{ id: 'g1', available: true }]),
    titulado: { findFirst: jest.fn(async () => ({ id: 'g1' })) },
    mentor: {
      findUnique: jest.fn(async () => ({ id: MENTOR_ID, esta_activo: true })),
      findFirst: jest.fn(async () => ({ id: MENTOR_ID, esta_activo: true })),
    },
    area: {
      findMany: jest.fn(async (args: { where?: Record<string, unknown> }) => {
        const where = args.where ?? {};
        const idFilter = where.id as { in?: string[] } | undefined;
        const ids = Array.isArray(idFilter?.in) ? idFilter.in : null;
        // `padre_id: null` => raíces; `padre_id: { in }` => hijos de esas raíces;
        // `padre_id: { not: null }` => tópicos sugeridos (con su padre).
        if (where.padre_id === null) {
          return roots.filter((root) => (ids ? ids.includes(root.id) : true));
        }
        const padre = where.padre_id as { in?: string[]; not?: unknown } | undefined;
        if (padre && Array.isArray(padre.in)) {
          return topics.filter((topic) => padre.in!.includes(topic.padre_id!));
        }
        if (padre && 'not' in padre) {
          return topics
            .filter((topic) => (ids ? ids.includes(topic.id) : true))
            .map(withParent);
        }
        return roots;
      }),
    },
    mentorArea: {
      findMany: jest.fn(async () => hydrate()),
      deleteMany: jest.fn(async (args: { where: { id: { in: string[] } } }) => {
        const ids = new Set(args.where.id.in);
        const before = links.length;
        links = links.filter((link) => !ids.has(link.id));
        return { count: before - links.length };
      }),
      createMany: jest.fn(async (args: { data: { id_area: string }[] }) => {
        for (const row of args.data) {
          links.push({ id: `l-new-${sequence++}`, id_area: row.id_area, area: null });
        }
        return { count: args.data.length };
      }),
    },
    mentorInteresPersonalizado: {
      findMany: jest.fn(async (args: { where?: { id?: { in: string[] } }; select?: unknown; include?: unknown }) => {
        if (args.where?.id) {
          const ids = new Set(args.where.id.in);
          return custom.filter((item) => ids.has(item.id)).map(({ id, id_area }) => ({ id, id_area }));
        }
        return custom;
      }),
      deleteMany: jest.fn(async (args: { where: { id_area: { in: string[] } } }) => {
        const areas = new Set(args.where.id_area.in);
        const before = custom.length;
        for (let index = custom.length - 1; index >= 0; index -= 1) {
          if (areas.has(custom[index].id_area)) {
            custom.splice(index, 1);
          }
        }
        return { count: before - custom.length };
      }),
    },
  };

  const prisma = {
    ...tx,
    $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
  };

  return {
    repository: new PrismaMentorCatalogRepository(prisma as never),
    tx,
    links: () => links,
    custom: () => custom,
    roots,
    topics,
  };
}

describe('PrismaMentorCatalogRepository.saveInterests (HU 6.21)', () => {
  it.each([false, null])('mine omite un tópico con esta_activo=%s aunque su raíz esté activa', async active => {
    const { repository, topics } = buildRepository(['r1', 't1', 't2']);
    topics[0].esta_activo = active;
    expect((await repository.interests(USER_ID)).map(item => item.id)).toEqual(['t2']);
  });

  it('mine omite tópicos de raíces inactivas y conserva los activos de otra raíz', async () => {
    const { repository, roots } = buildRepository(['r1', 'r2', 't1', 't3']);
    roots[0].esta_activo = false;
    expect((await repository.interests(USER_ID)).map(item => item.id)).toEqual(['t3']);
  });

  it('guarda sugeridos sin consultar ni borrar personalizados cuando no existe su tabla', async () => {
    const { repository, tx, links } = buildRepository(['r1', 'r2', 't2']);
    tx.$queryRaw.mockResolvedValue([{ id: 'g1', available: false }]);
    tx.mentorInteresPersonalizado.findMany.mockRejectedValue(new Error('no consultar tabla ausente'));
    const state = await repository.saveInterests(USER_ID, ['r1'], ['t1']);
    expect(links().map((link) => link.id_area).sort()).toEqual(['r1', 't1']);
    expect(state.interests.map((item) => item.id)).toEqual(['t1']);
    expect(tx.mentorInteresPersonalizado.findMany).not.toHaveBeenCalled();
    expect(tx.mentorInteresPersonalizado.deleteMany).not.toHaveBeenCalled();
  });

  it('permite quitar áreas sin consultar la tabla ausente de personalizados', async () => {
    const { repository, tx } = buildRepository(['r1', 'r2', 't3']);
    tx.$queryRaw.mockResolvedValue([{ id: 'g1', available: false }]);
    const state = await repository.setAreas(USER_ID, ['r1']);
    expect(state.selectedIds).toEqual(['r1']);
    expect(state.interests).toEqual([]);
    expect(tx.mentorInteresPersonalizado.findMany).not.toHaveBeenCalled();
    expect(tx.mentorInteresPersonalizado.deleteMany).not.toHaveBeenCalled();
  });

  it('rechaza ids desconocidos aunque no exista la tabla opcional', async () => {
    const { repository, tx } = buildRepository(['r1']);
    tx.$queryRaw.mockResolvedValue([{ id: 'g1', available: false }]);
    await expect(repository.saveInterests(USER_ID, ['r1'], ['fantasma']))
      .rejects.toMatchObject({ code: 'INTEREST_INVALID' });
    expect(tx.mentorArea.deleteMany).not.toHaveBeenCalled();
    expect(tx.mentorArea.createMany).not.toHaveBeenCalled();
  });

  it('permite consultar catálogo, selección y áreas cuando falta la tabla de HU 6.22', async () => {
    const { repository, tx } = buildRepository(['r1', 't1']);
    tx.mentorInteresPersonalizado.findMany.mockRejectedValue({
      code: 'P2021', meta: { table: 'public.mentor_interes_personalizado' },
    });
    const catalog = await repository.interestCatalog(USER_ID);
    expect(catalog).toHaveLength(2);
    expect(catalog.every((group) => group.customInterestsAvailable === false)).toBe(true);
    expect(catalog.flatMap((group) => group.interests).map((item) => item.id))
      .toEqual(expect.arrayContaining(['t1', 't2', 't3']));
    expect((await repository.interests(USER_ID)).map((item) => item.id)).toEqual(['t1']);
    expect((await repository.areas(USER_ID)).selectedIds).toEqual(['r1']);
    expect(tx.mentorArea.createMany).not.toHaveBeenCalled();
    expect(tx.mentorArea.deleteMany).not.toHaveBeenCalled();
  });

  it('no oculta errores de conexión al consultar el catálogo', async () => {
    const { repository, tx } = buildRepository(['r1']);
    const error = new Error('conexión no disponible');
    tx.mentorInteresPersonalizado.findMany.mockRejectedValue(error);
    await expect(repository.interestCatalog(USER_ID)).rejects.toBe(error);
  });

  it('agrega y quita enlaces en una sola transacción e ignora lo ya persistido', async () => {
    const { repository, tx, links } = buildRepository(['r1', 't2']);
    const state = await repository.saveInterests(USER_ID, ['r1'], ['t1']);

    expect(tx.mentorArea.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['l-t2'] }, id_mentor: MENTOR_ID },
    });
    expect(tx.mentorArea.createMany).toHaveBeenCalledWith({
      data: [{ id_mentor: MENTOR_ID, id_area: 't1', fecha_creacion: expect.any(Date) }],
    });
    expect(links().map((link) => link.id_area).sort()).toEqual(['r1', 't1']);
    expect(state.selectedIds).toEqual(['r1']);
    expect(state.interests.map((interest) => interest.id)).toEqual(['t1']);
  });

  it('es idempotente al repetir el mismo guardado', async () => {
    const { repository, tx } = buildRepository(['r1']);
    await repository.saveInterests(USER_ID, ['r1'], ['t1']);
    tx.mentorArea.createMany.mockClear();
    tx.mentorArea.deleteMany.mockClear();

    await repository.saveInterests(USER_ID, ['r1'], ['t1']);
    expect(tx.mentorArea.createMany).not.toHaveBeenCalled();
    expect(tx.mentorArea.deleteMany).not.toHaveBeenCalled();
  });

  it('rechaza tópicos de un área que no está seleccionada', async () => {
    const { repository, tx } = buildRepository(['r1']);
    await expect(repository.saveInterests(USER_ID, ['r1'], ['t3'])).rejects.toMatchObject({
      code: 'INTEREST_AREA_NOT_SELECTED',
    });
    expect(tx.mentorArea.createMany).not.toHaveBeenCalled();
  });

  it('rechaza áreas raíz inexistentes o inactivas', async () => {
    const { repository } = buildRepository([]);
    await expect(repository.saveInterests(USER_ID, ['r2', 'inexistente'], [])).rejects.toMatchObject({
      code: 'AREA_INVALID',
    });
  });

  it('rechaza tópicos inexistentes', async () => {
    const { repository } = buildRepository(['r1']);
    await expect(repository.saveInterests(USER_ID, ['r1'], ['fantasma'])).rejects.toMatchObject({
      code: 'INTEREST_INVALID',
    });
  });

  it('elimina los intereses personalizados del área que se quita y conserva los demás', async () => {
    const custom: CustomRow[] = [
      { id: 'c1', id_mentor: MENTOR_ID, id_area: 'r1', nombre: 'Propio 1', area: { id: 'r1', nombre: 'Tecnología', padre_id: null, esta_activo: true } },
      { id: 'c2', id_mentor: MENTOR_ID, id_area: 'r2', nombre: 'Propio 2', area: { id: 'r2', nombre: 'QA', padre_id: null, esta_activo: true } },
    ];
    const { repository, tx, custom: current } = buildRepository(['r1', 'r2'], custom);
    await repository.saveInterests(USER_ID, ['r1'], ['c1']);

    expect(tx.mentorInteresPersonalizado.deleteMany).toHaveBeenCalledWith({
      where: { id_mentor: MENTOR_ID, id_area: { in: ['r2'] } },
    });
    expect(current().map((item) => item.id)).toEqual(['c1']);
  });

  it('acepta intereses personalizados del área seleccionada sin crear enlaces de tópico', async () => {
    const custom: CustomRow[] = [
      { id: 'c1', id_mentor: MENTOR_ID, id_area: 'r1', nombre: 'Propio 1', area: { id: 'r1', nombre: 'Tecnología', padre_id: null, esta_activo: true } },
    ];
    const { repository, tx } = buildRepository(['r1'], custom);
    const state = await repository.saveInterests(USER_ID, ['r1'], ['c1']);

    expect(tx.mentorArea.createMany).not.toHaveBeenCalled();
    expect(state.interests.map((interest) => interest.id)).toEqual(['c1']);
  });
});
