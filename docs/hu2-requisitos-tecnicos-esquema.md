# HU2: esquema y migración de requisitos técnicos

## Estado

El modelo ya está agregado a `apps/api/prisma/schema.prisma` y su migración versionada es `apps/api/prisma/migrations/20261110183000_hu2_requisitos_tecnicos/migration.sql`. La migración se aplicó a la base Supabase configurada como `umsspira_epic5`. La API utiliza consultas parametrizadas sobre `public.vacante_requisito_tecnico`.

La tabla actual `requerimiento_habilidad` referencia un requerimiento laboral y un área del catálogo. No almacena los campos específicos de HU2 (nombre libre de la competencia, nivel esperado, clasificación obligatorio/deseable y descripción por vacante), por lo que la propuesta usa una tabla dependiente de `vacante`.

## Modelo Prisma aplicado

El modelo incluye la relación inversa `requisitos_tecnicos VacanteRequisitoTecnico[]` en `Vacante`:

```prisma
model VacanteRequisitoTecnico {
  id                      String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  id_vacante              String   @db.Uuid
  competencia_tecnica     String   @db.VarChar(120)
  competencia_normalizada String   @db.VarChar(120)
  nivel_esperado          String   @db.VarChar(20)
  tipo                    String   @db.VarChar(20)
  descripcion             String?  @db.VarChar(500)
  creado_en               DateTime @default(now()) @db.Timestamptz(6)
  actualizado_en          DateTime @default(now()) @db.Timestamptz(6)

  vacante Vacante @relation(fields: [id_vacante], references: [id], onDelete: Cascade, onUpdate: NoAction, map: "vacante_requisito_tecnico_id_vacante_fkey")

  @@unique([id_vacante, competencia_normalizada], map: "uq_vacante_requisito_tecnico_competencia")
  @@map("vacante_requisito_tecnico")
}
```

La normalización (minúsculas, espacios compactados y eliminación de diacríticos) se calcula en la aplicación. La unicidad compuesta protege además frente a duplicados concurrentes dentro de la misma vacante.

## SQL de migración aplicado

SQL aplicado por la migración versionada:

```sql
CREATE TABLE public.vacante_requisito_tecnico (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_vacante uuid NOT NULL,
  competencia_tecnica varchar(120) NOT NULL,
  competencia_normalizada varchar(120) NOT NULL,
  nivel_esperado varchar(20) NOT NULL,
  tipo varchar(20) NOT NULL,
  descripcion varchar(500),
  creado_en timestamptz(6) NOT NULL DEFAULT now(),
  actualizado_en timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT vacante_requisito_tecnico_pkey PRIMARY KEY (id),
  CONSTRAINT vacante_requisito_tecnico_id_vacante_fkey
    FOREIGN KEY (id_vacante) REFERENCES public.vacante(id)
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT uq_vacante_requisito_tecnico_competencia
    UNIQUE (id_vacante, competencia_normalizada),
  CONSTRAINT ck_vacante_requisito_tecnico_nivel
    CHECK (nivel_esperado IN ('BASICO', 'INTERMEDIO', 'AVANZADO')),
  CONSTRAINT ck_vacante_requisito_tecnico_tipo
    CHECK (tipo IN ('OBLIGATORIO', 'DESEABLE')),
  CONSTRAINT ck_vacante_requisito_tecnico_competencia_no_vacia
    CHECK (length(btrim(competencia_tecnica)) > 0),
  CONSTRAINT ck_vacante_requisito_tecnico_normalizada_no_vacia
    CHECK (length(btrim(competencia_normalizada)) > 0)
);
```

El índice creado por la restricción única compuesta comienza por `id_vacante`, por lo que también permite recuperar los requisitos de una vacante sin un índice duplicado.

## Contrato de API implementado

- `GET /api/v1/job-postings/:vacancyId/technical-requirements`: devuelve `{ data: { vacanteId, vacanteTitulo, requisitos } }`.
- `PUT /api/v1/job-postings/:vacancyId/technical-requirements`: reemplaza la colección completa y devuelve la misma forma. Enviar `requisitos: []` elimina los requisitos actuales de esa vacante.
- Cada requisito acepta `competenciaTecnica` (1–120 caracteres), `nivelEsperado`, `tipo` y `descripcion` (hasta 500 caracteres; puede ser `""`). El máximo es 50 requisitos por vacante.
- Ambas rutas requieren sesión, permiso `vacantes:create` y que la vacante pertenezca a una empresa dentro del alcance del actor. Las solicitudes autenticadas mediante cookie deben cumplir también la protección CSRF global.
- Duplicados dentro del body se rechazan con `409 DUPLICATE_TECHNICAL_REQUIREMENT`; vacante inexistente o fuera del alcance devuelve `404`. Si el esquema aún no se ha desplegado en otro entorno, la tabla ausente produce `503 TECHNICAL_REQUIREMENTS_UNAVAILABLE`.

La persistencia del `PUT` bloquea la fila de vacante y reemplaza los requisitos dentro de una transacción para que una lista no quede parcialmente guardada.
