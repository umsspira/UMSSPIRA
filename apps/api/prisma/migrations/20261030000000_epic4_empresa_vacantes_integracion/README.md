# Epic 4: integración del esquema empresarial

Origen: `umsspira-equipo-esquema2.sql`, exportación de la réplica del equipo
con SHA-256 `851cc1110b1202a3d688a5318a73be619ba1f28eefe7fbf676da99f48befc822`.

Esta migración incorpora solamente los cambios faltantes sobre la migración
`20261027000000_epic4_empresa_invitacion_usuario`:

- `empresa_invitacion.nombre`, nullable, `VARCHAR(120)`.
- Tres fechas nullable de vacantes con zona horaria y cuatro índices de consulta.
- Salario no negativo mediante `CHECK NOT VALID`, según la definición del equipo.
- Fechas automáticas, prohibición de reapertura y rechazo de nuevas postulaciones
  a vacantes cerradas. Las postulaciones anteriores pueden seguir tramitándose.

El trigger reconoce `PUBLICADO`, usado actualmente, y `PUBLICADA`, usado por la
réplica. Conserva fechas de publicación y cierre existentes. No completa fechas
históricas durante la migración ni modifica registros anteriores.

Se conservan los roles de membresía existentes y sus tipos. No se recrean tablas
ni se importan historiales de Prisma. Tampoco se copian RLS, permisos o funciones
de otras épicas. Los controles de PostgreSQL no dependen de Supabase Auth.

El archivo SQL es transaccional y limita la espera de locks a 10 segundos. Si
no puede adquirirlos, la migración revierte sus cambios; se debe revisar el error
antes de resolver cualquier registro fallido en Prisma y reintentar.

`NOT VALID` conserva salarios negativos históricos, pero un UPDATE de esos
registros sí exige que cumplan la restricción. Antes del despliegue se comprobó
que no había salarios negativos en la base destino.

Se validó restaurando un respaldo de la base destino en PostgreSQL local,
ensayando la migración con rollback, aplicándola mediante Prisma y verificando
la conservación de los datos de todas las tablas. La prueba
`test/epic4-migration.integration.spec.ts` usa únicamente una copia local con
`EPIC4_TEST_DATABASE_URL` y rechaza destinos remotos.
