# SQL histórico de Supabase

Estos scripts se conservaron como referencia histórica al retirar las carpetas heredadas `backend/`, `frontend/` y `supabase/` de la raíz.

No forman parte del flujo activo de despliegue y **no deben ejecutarse** con Supabase CLI ni copiarse a `apps/api/prisma/migrations/`. La aplicación vigente administra el esquema con Prisma:

- Esquema: `apps/api/prisma/schema.prisma`
- Historial activo: `apps/api/prisma/migrations/`
- Despliegue de migraciones: `pnpm --filter api db:deploy`

Los archivos archivados pueden describir un esquema anterior. Antes de usar cualquier parte de su SQL, el equipo debe compararlo con el esquema Prisma y confirmar el historial de la base objetivo.
