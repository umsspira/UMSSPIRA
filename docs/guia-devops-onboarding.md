---
title: "UMSSPIRA — Guía de operación y onboarding"
subtitle: "Referencia para un ingeniero de DevOps que se incorpora al proyecto"
author: "Documento generado desde el código fuente del repositorio"
date: "4 de noviembre de 2026"
toc: true
toc-depth: 2
toc-title: "Contenido"
numbersections: true
geometry: "a4paper, margin=2cm"
fontsize: 10pt
mainfont: "DejaVu Sans"
monofont: "DejaVu Sans Mono"
linkcolor: "blue"
urlcolor: "blue"
---

# Para qué sirve este documento

Esta guía reúne en un solo lugar todo lo que necesita saber una persona de **infraestructura, operaciones o DevOps** para entender, levantar, desplegar y mantener UMSSPIRA sin tener que reconstruir el contexto leyendo el código.

No sustituye a la documentación del repositorio: la resume, la interpreta y señala dónde mirar cuando algo falla. Está pensada para leerse de corrido el primer día y consultarse después como referencia.

**Qué encontrará aquí**

| Sección | Resumen |
| --- | --- |
| §2 – §5 | Qué es el proyecto, cómo está construido y con qué tecnologías |
| §6 – §8 | Entornos, base de datos y servicios locales |
| §9 – §10 | Comandos de referencia, CI/CD y despliegue |
| §11 – §12 | Modelo de seguridad y estado real de la observabilidad |
| §13 – §14 | Runbook operativo y problemas conocidos |
| §15 – §16 | Checklist de onboarding y hallazgos abiertos |
| §17 – §18 | Glosario y mapa de documentos |

**Método:** todo lo que se afirma aquí fue verificado contra el código del repositorio el 4 de noviembre de 2026 (rama `dev`, 2 171 commits). Cuando algo es una inferencia y no un hecho verificado, se indica explícitamente.

---

# El proyecto en una página

**UMSSPIRA** es la plataforma de la comunidad de egresados de la Universidad Mayor de San Simón. Conecta a titulados, empresas y administradores mediante mentorías, bolsa de trabajo, eventos, perfil profesional y reportería institucional.

Es un proyecto **académico multi-equipo**: nueve épicas (grandes bloques de funcionalidad) desarrolladas en paralelo por distintos grupos, integradas en una rama común. Esa condición explica muchas de sus peculiaridades: bases de datos separadas por equipo, nombres de ruta en español e inglés mezclados, y una convención documental muy estricta pensada para que treinta personas no pisen el trabajo de otras.

| Métrica | Valor |
| --- | ---: |
| Commits | 2 171 |
| Merge de PRs | 577 |
| Ramas remotas | 183 |
| Épicas | 9 (`epic1` … `epic9`) |
| Endpoints REST | 148 |
| Páginas web | 80 |
| Modelos Prisma | 82 |
| Migraciones SQL | 28 |
| Tests backend / frontend | 121 / 201 archivos |
| Roles de acceso | 3 |
| Permisos | 18 |

**Stack resumido:** NestJS 10 + Prisma 7 + PostgreSQL (Supabase) en el backend; Next.js 14 + Tailwind en el frontend; Redis opcional; Mailpit para correo local; pnpm workspaces como gestor de paquetes.

```{=latex}
\clearpage
```

# Arquitectura

## Topología general

```
                    ┌─────────────────────────────────────────────┐
   Navegador ─────► │  VERCEL  ·  apps/web (Next.js 14, :3001)    │
   (usuario)        │  · App Router, Tailwind, PWA/Serwist        │
                    │  · Middleware de sesión y control por rol   │
                    │  · Proxy /api/v1/[...path]  (allowlist)     │
                    └───────────────────┬─────────────────────────┘
                                        │  HTTPS
                                        │  API_INTERNAL_URL
                                        │  NEXT_PUBLIC_API_URL
                                        ▼
                    ┌─────────────────────────────────────────────┐
                    │  RENDER  ·  umsspira-api (NestJS, :3000)    │
                    │  · Prefijo global /api/v1                   │
                    │  · Guards globales de auth y permisos       │
                    │  · Socket.IO namespace /chat                │
                    │  · Health check en /health                  │
                    └───────┬───────────────────┬─────────────────┘
                            │                   │
              DATABASE_URL  │                   │  SMTP_URL
              (pooler 6543) │                   │  (Mailpit o proveedor)
                            ▼                   ▼
              ┌──────────────────────┐   ┌──────────────────┐
              │ POSTGRESQL (Supabase)│   │  CORREO          │
              │ pooler de sesiones   │   │  Mailpit local   │
              │ 5432 p/ migraciones  │   │  :1025 / UI 8025 │
              └──────────────────────┘   └──────────────────┘
                            ▲
                            │  REDIS_URL (opcional)
              ┌─────────────┴────────────┐
              │ REDIS  ·  rate limiting  │
              └──────────────────────────┘
```

## Flujo de una petición autenticada

1. El navegador llama a rutas **relativas** (`/api/v1/...`), por lo que atraviesan el proxy de Next.js.
2. El proxy valida que el primer segmento esté en su **lista blanca de módulos**; si no, responde `404` sin tocar el backend.
3. Para mutaciones, verifica el **origen** contra `origin`/`sec-fetch-site` y devuelve `403` si no coincide.
4. Reenvía a `API_INTERNAL_URL` propagando `authorization`, `cookie`, `x-csrf-token`, `x-correction-token` y `origin`.
5. En el backend, `AuthenticationGuard` y `PermissionsGuard` (registrados globales) exigen sesión y permiso salvo que la ruta esté marcada `@Public()` o `@PublicRegistration()`.
6. El caso de uso verifica además el **alcance** (`actor.scopes.*`): el permiso autoriza la operación, no el recurso concreto.
7. La respuesta se envuelve en `{ data: ... }`; los errores salen como `{ error: { code, message } }` con mensajes en español.

> **Punto clave para operaciones:** el frontend nunca habla directo con Supabase. Supabase es *únicamente* un alojamiento de PostgreSQL: no se usan Supabase Auth, Storage, SDK ni funciones RPC.

---

# Stack y versiones

| Componente | Versión | Nota |
| --- | --- | --- |
| Node.js | ≥ 22.12 (API) · ≥ 20 (web) | CI fija `22.22.1`; `render.yaml` también |
| pnpm | lockfile `9.0` · CI fija `9` | **No hay campo `packageManager`**: la versión no está bloqueada |
| NestJS | 10.4.22 | Backend, arquitectura hexagonal |
| Prisma | 7.10.1 | Cliente generado en `src/generated/prisma` (ignorado por Git) |
| PostgreSQL | 15 (local) · Supabase (remoto) | |
| Next.js | 14.2.3 | App Router |
| React | 18 | |
| TypeScript | 5.9.3 (api) · ^5 (web) | |
| Zod | 4.6.7 | Validación de entradas **y** de variables de entorno |
| Socket.IO | 4.8 | Namespace `/chat` |
| Redis | ioredis 6 | Opcional, solo rate limiting |
| Jest | 29 (api) · 30 (web) | |
| ESLint | 10 (api) · 8 (web) | |
| Prettier | 3.9.10 | Solo backend |
| Tailwind CSS | 3.4.19 | |
| Argon2id | 0.45.1 | Hash de contraseñas |

**Advertencia de versión:** `pnpm-lock.yaml` declara `lockfileVersion: '9.0'`, pero no existe campo `packageManager` en `package.json`. En la máquina de esta guía corre pnpm 12.6.0 y en CI se instala pnpm 9. Si un despliegue falla con errores de lockfile, sospeche primero de la versión de pnpm.

---

# Estructura del repositorio

```
UMSSPIRA/
├── apps/
│   ├── api/                    Backend NestJS
│   │   ├── prisma/             schema.prisma + 28 migraciones
│   │   ├── scripts/seed/       Seeds por épica (epic-1.ts … epic-9.ts)
│   │   ├── docs/endpoints/     Contratos HTTP por épica
│   │   ├── test/               E2E e integración (adaptadores en memoria)
│   │   └── src/
│   │       ├── config/         Validación Zod del entorno
│   │       ├── shared/         Guards, filtros, seguridad, PrismaService
│   │       └── modules/        auth, user, companies, job-postings,
│   │                           registrations, profile, events, mentorship,
│   │                           reports, nlp, radar, chat, surveys, vacantes
│   └── web/                    Next.js 14
│       ├── src/app/            Rutas App Router: (public), (dashboard), portal/
│       ├── src/modules/        Código por feature
│       ├── src/shared/         Componentes, servicios, utilidades
│       └── src/middleware.ts   Sesión y control de acceso por rol
├── packages/shared-types/      Tipos compartidos (sin build, se importa como fuente)
├── bruno/                      Colección manual de peticiones API
├── postman/                    Colección alternativa (UMSSPIRA.json)
├── docs/                       Documentación suelta del equipo
├── render.yaml                 Descripción del servicio en Render
├── docker-compose.yml          Mailpit + Redis + Postgres locales
├── pnpm-workspace.yaml         Workspaces y scripts permitidos en build
├── .github/workflows/ci.yml    Integración continua
└── AGENTS.md                   Instrucciones para asistentes de IA (local)
```

## Reglas de arquitectura que condicionan lo operativo

- **Arquitectura hexagonal por módulo.** Cada módulo tiene `domain/`, `application/`, `http/` e `infrastructure/`. El dominio y la aplicación **no pueden** importar Nest, Express, Prisma ni `process.env`. Solo `infrastructure/` toca Prisma.
- **Un único schema Prisma.** No hay un schema por módulo. Los modelos generados jamás se editan ni se devuelven directamente al cliente.
- **`apps/api/src/modules/README.md` es la convención vinculante.** Antes de tocar el backend, léase. No reorganizar `auth`.
- **Los scripts de seed nunca se ejecutan al arrancar.** Son operaciones explícitas.

---

# Entornos y variables de entorno

## La distinción más importante: `APP_ENV` ≠ `NODE_ENV` ≠ rama de Git

Es la fuente número uno de errores de configuración.

| Variable | Qué nombra | Valores |
| --- | --- | --- |
| `APP_ENV` | **El destino de los datos** | `epic`, `dev`, `test`, `production` |
| `NODE_ENV` | **El modo de ejecución de Node** | `development`, `test`, `production` |
| Rama de Git | El código que se ejecuta | `main`, `dev`, `epic1` … `epic9` |

Pueden (y suelen) diferir: en Render corre `NODE_ENV=production` sobre `APP_ENV=dev`, es decir, modo publicado de Node sobre **datos ficticios de integración**. `APP_ENV` no se deduce de la rama: el código no consulta Git.

`APP_ENV=production` es el sistema real y **rechaza el seed de demostración**.

## Los tres archivos de entorno

Son distintos y **no se sustituyen entre sí**:

| Archivo | Quién lo lee | Contenido |
| --- | --- | --- |
| `apps/api/.env` | Backend (Nest) | Conexiones, secretos, SMTP |
| `apps/web/.env.local` | Frontend (Next) | `NEXT_PUBLIC_API_URL`, flags de demo |
| `.env` (raíz) | Docker Compose | Solo puertos y contraseña local |

`.env.example` acompaña a cada uno con comentarios explicativos. Ninguno se versiona: `.gitignore` cubre `.env*` y solo permite los `.example`.

> **Windows:** crear `apps/api/.env` desde PowerShell o Notepad puede guardarlo con BOM o UTF-16. Síntoma: el archivo existe con las variables, pero NestJS no las lee. Solución: reescribirlo en UTF-8 sin BOM.

## Variables del backend

El esquema se valida con Zod en `src/config/environment.ts` **al arrancar**. Si algo falta o no cumple el formato, la API no arranca y el error indica el campo (sin volcar valores, que pueden ser secretos).

**Obligatorias**

| Variable | Descripción | Valor típico |
| --- | --- | --- |
| `DATABASE_URL` | Pooler de **transacciones**, puerto **6543** | URL de Supabase con la contraseña real |
| `DIRECT_URL` | Pooler de **sesiones**, puerto **5432**; migraciones y seeds | Ídem |
| `AUTH_JWT_SECRET` | Clave de firma de tokens. **Mínimo 64 caracteres**. No es una clave de Supabase | `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"` |

**Con valor por defecto**

| Variable | Defecto | Cuándo cambiarla |
| --- | --- | --- |
| `NODE_ENV` | `development` | `production` al publicar |
| `APP_ENV` | `epic` | `dev` en integración, `production` en el sistema real |
| `PORT` | `3000` | Render lo inyecta; no declararlo en `render.yaml` |
| `CORS_ORIGINS` | `http://localhost:3001` | URL pública de Vercel (coma entre orígenes) |
| `SMTP_URL` | `smtp://127.0.0.1:1025` | Proveedor real en producción |
| `MAIL_FROM` | `UMSSPIRA <no-reply@umsspira.local>` | Remitente autorizado por el SMTP |
| `WEB_BASE_URL` | `http://localhost:3001` | **La URL pública de la web** (ver §16) |
| `AUTH_ACCESS_SECONDS` | 900 (15 min) | Duración del access token |
| `AUTH_SESSION_HOURS` | 12 | Sesión sin "recordar" |
| `AUTH_REMEMBER_DAYS` | 30 | Sesión con "recordar" |
| `AUTH_COOKIE_SECURE` | `true` con `NODE_ENV=production` | No admite desactivarlo en producción |
| `AUTH_RATE_LIMIT_STORE` | `memory` en dev/test, `redis` en producción | Elegir explícitamente |
| `CORRECTION_LINK_TTL_DAYS` | 7 | Vigencia del enlace de corrección |
| `SHADOW_DATABASE_URL` | vacío | Solo al **generar** migraciones |

**Validaciones cruzadas que hacen fallar el arranque**

- `AUTH_RATE_LIMIT_STORE=redis` exige `REDIS_URL` explícita.
- `NODE_ENV=production` exige `AUTH_COOKIE_SECURE` en `true`.
- `CORS_ORIGINS` debe ser orígenes HTTP(S) sin ruta, query ni credenciales.

## Variables del frontend

| Variable | Efecto |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | URL pública del API. **Se inlina en el bundle durante el build**: si falta, el frontend apunta a `http://localhost:3000` |
| `API_INTERNAL_URL` | URL raíz del backend usada por el proxy de Next.js en el servidor |
| `NEXT_PUBLIC_ENABLE_SIMULATION_CONTROLS` | Controles de simulación del radar |
| `NEXT_PUBLIC_USE_MOCK` / `NEXT_PUBLIC_USE_AFFINITY_MOCK` / `NEXT_PUBLIC_DEMO_MODE` | Flags de demostración |

---

# Base de datos

## Conexiones

| Variable | Pooler | Puerto | Uso |
| --- | --- | --- | --- |
| `DATABASE_URL` | Transacciones | 6543 | Consultas en runtime |
| `DIRECT_URL` | Sesiones | 5432 | `db:deploy`, `db:migrate`, seeds |

El pooler de transacciones de Supabase **no sirve para migraciones**; por eso existen dos URLs. Cada equipo usa las conexiones de su propia base.

El cliente Prisma se configura con `max: 10` conexiones, `connectionTimeoutMillis: 5000` y `query_timeout: 5000`. Una consulta que cuelga devuelve `503 DATABASE_UNAVAILABLE` tras 5 segundos, no cuelga el proceso.

## Migraciones

| Comando | Qué hace |
| --- | --- |
| `pnpm --filter api prisma:validate` | Valida el schema |
| `pnpm --filter api db:migrate --name X` | **Crea y aplica** una migración nueva (dev, vía `DIRECT_URL`; necesita shadow DB) |
| `pnpm --filter api db:deploy` | Aplica las migraciones **ya entregadas** |
| `pnpm --filter api db:status` | Estado de las migraciones |
| `pnpm --filter api prisma:generate` | Regenera el cliente |

**Reglas de oro**

1. **Nunca editar una migración ya aplicada.** Se agrega una nueva. (`.gitattributes` fija el checksum de una migración concreta con `-text` justamente para protegerla.)
2. **Ningún comando de BD se ejecuta al arrancar el servidor.** Ni `db:deploy`, ni `db:seed`.
3. La migración nueva se aplica con `db:deploy`, no con `db:migrate`, cuando se trata de una base compartida o de producción.
4. Schema y migraciones se versionan; el cliente generado y las credenciales no.

## Seeds

| Comando | Contenido | Requisito |
| --- | --- | --- |
| `pnpm --filter api db:seed` | Solo catálogos: roles, permisos, carreras, tipos de archivo | — |
| `pnpm --filter api db:seed:demo` | Catálogo + cuentas + todos los `epic-N.ts` | `APP_ENV` ∈ {`epic`,`dev`,`test`}; rechaza `production` |
| `pnpm --filter api db:seed:informatica` | Asigna la carrera de Informática al admin existente | Cuenta admin ya creada |

El seed **no borra ni actualiza** registros existentes: repetirlo solo agrega lo que falte. Si un correo de demostración pertenece a otro UUID, se rechaza y no se sobrescribe.

**Cuentas de demostración**

| Correo | Contraseña | Rol |
| --- | --- | --- |
| `titulado@umss.edu.bo` | `titulado1234` | titulado |
| `admin@umss.edu.bo` | `admin1234` | administrador |
| `empresa@umss.edu.bo` | `empresa1234` | empresa |

---

# Servicios locales (Docker)

`docker compose` levanta auxiliares, no la aplicación.

| Servicio | Imagen | Puertos | Perfil | Para qué |
| --- | --- | --- | --- | --- |
| `mailpit` | axllent/mailpit v1.27.4 | 1025 SMTP · 8025 UI | **siempre** | Captura correos de registro/verificación sin salir a Internet |
| `redis` | redis:7-alpine | 6379 | `redis` | Contadores de rate limiting |
| `db` | postgres:15-alpine | 5432 | `local-db` | PostgreSQL local con volumen `db_data` |

```bash
docker compose up -d --wait                     # Mailpit
docker compose --profile redis up -d --wait     # + Redis
docker compose --profile local-db up -d --wait  # + PostgreSQL
docker compose --profile "*" ps                 # estado
docker compose --profile "*" down               # parar (conserva volúmenes)
```

Todos tienen `healthcheck`, puertos solo en `127.0.0.1` y rotación de logs (3 archivos × 10 MB). Levantar Redis o Postgres **no cambia** la configuración de la API: eso lo decide `apps/api/.env`.

Para apuntar la API al PostgreSQL local:

```
DATABASE_URL=postgresql://postgres:umsspira_local@localhost:5432/postgres
DIRECT_URL=postgresql://postgres:umsspira_local@localhost:5432/postgres
```

Docker crea la base vacía; Prisma crea las tablas. Cambiar `POSTGRES_PASSWORD` en `.env` **no** modifica un volumen ya creado.

---

# Comandos de referencia

Ejecutar siempre desde la raíz del monorepo.

## Arranque

```bash
pnpm install                    # todos los workspaces a la vez
docker compose up -d --wait     # Mailpit (requiere Docker Desktop)
pnpm run dev                    # api :3000 + web :3001 en paralelo

pnpm --filter api dev           # solo backend
pnpm --filter web dev           # solo frontend
```

| URL | Qué |
| --- | --- |
| `http://localhost:3001` | Aplicación web |
| `http://localhost:3000/health` | Salud del backend y de la BD |
| `http://localhost:8025` | Bandeja de correos de prueba |

## Preparar una base nueva

```bash
pnpm install
pnpm --filter api db:deploy
pnpm --filter api prisma:generate
pnpm --filter api db:seed:demo
```

## Verificación (mismo orden que CI)

```bash
pnpm lint        # 1. linter
pnpm test        # 2. pruebas
pnpm build       # 3. compilación
```

`pnpm --filter api typecheck` **existe pero CI no lo ejecuta**. Ejecutarlo a mano si se toca TypeScript del backend.

## Utilidades sueltas

```bash
pnpm --filter api format            # Prettier (solo backend)
pnpm --filter api format:check
pnpm --filter api account:create    # cuenta operativa vía stdin (JSON)
pnpm --filter api auth:prune        # limpia sesiones vencidas
pnpm --filter api test -- <ruta>    # un solo archivo
pnpm --filter web test -- <ruta>
```

> `account:create` recibe JSON por **entrada estándar**. Nunca pasar contraseñas por argumentos de proceso ni archivos versionados.

---

# CI/CD y despliegue

## Integración continua — GitHub Actions

Un único workflow, `.github/workflows/ci.yml`, que corre en **pull requests** hacia `main`, `dev` y `epic*`.

```
checkout → pnpm 9 → Node 22.22.1 (con caché pnpm) → pnpm install
        → pnpm lint → pnpm test → pnpm build
```

Sin matriz de SO, sin despliegue automático, sin publicación de artefactos, sin escaneo de seguridad ni de dependencias. **No hay Dependabot.** No hay templates de issues ni de PR.

> Detalle: el paso se llama *"Configurar Node.js 20"* pero instala `22.22.1`. Es solo una etiqueta desactualizada.

**Hooks locales** (Husky)

- `pre-commit` → `lint-staged`: `eslint --fix` en el backend, `next lint --file` en el frontend.
- `commit-msg` → `commitlint` con `config-conventional`. Un mensaje que no cumpla Conventional Commits **es rechazado por Git**.

Formato esperado: `feat(api): ...`, `fix(web): ...`, `chore: ...`. Se exige además *atomic commits*: un commit con veinte cambios distintos obliga a quien lo subió a corregirlo.

## Flujo de ramas

| Rama | Rol |
| --- | --- |
| `main` | Producción |
| `dev` | Integración — **objetivo de los PR** y rama que despliega el API |
| `epic1` … `epic9` | Integración por épica |
| `feat/G<HU>-<nombre>` | Trabajo concreto de una HU (ej. `feat/G1-HU2-login`) |

Existe `sync-epics.sh` (no versionado) que actualiza `epic1..epic9` desde `dev`; se niega a correr con merges en curso o cambios sin commitear.

## API en Render — `render.yaml`

| Campo | Valor |
| --- | --- |
| Servicio | `umsspira-api`, runtime `node`, región `virginia` |
| Plan | **free** — se duerme tras ~15 min sin tráfico; primer request ≈ 50 s |
| Rama | `dev` |
| `rootDir` | `.` (la raíz conserva workspace y lockfile) |
| Build | `pnpm install --frozen-lockfile --prod=false && pnpm --filter api build` |
| Start | `pnpm --filter api start` |
| Health check | `/health` (hace `SELECT 1`; 503 si la BD no responde) |
| `NODE_VERSION` / `NODE_ENV` / `APP_ENV` | `22.22.1` / `production` / `dev` |
| `AUTH_RATE_LIMIT_STORE` | `memory` (explícito: plan free, una instancia) |
| `CORS_ORIGINS` | `https://umsspira-web.vercel.app` |
| Secretos (`sync: false`) | `DATABASE_URL`, `DIRECT_URL`, `AUTH_JWT_SECRET`, `SMTP_URL`, `MAIL_FROM` |

Los secretos **no** viven en el archivo: se cargan en el dashboard de Render.

> **El plan gratuito bloquea los puertos SMTP 25/465/587.** Para correo real hace falta subir de plan o usar un proveedor API (hay una `BREVO_API_KEY` opcional en el esquema).

## Web en Vercel

Configuración **en el panel**, no en el repo (salvo `apps/web/vercel.json`):

- **Root Directory = `apps/web`** — obligatorio; si se deja la raíz, el build falla.
- `NEXT_PUBLIC_API_URL` definida **antes del build**: se inlina en el bundle.
- `API_INTERNAL_URL` para que el proxy del lado servidor alcance al backend.
- `vercel.json` habilita despliegues **solo** en las ramas `dev` y `main` (`"**": false`).

## Variables que deben existir antes de arrancar

| Plataforma | Variable |
| --- | --- |
| Render | `DATABASE_URL`, `DIRECT_URL`, `AUTH_JWT_SECRET`, `CORS_ORIGINS`, `SMTP_URL`, `MAIL_FROM` |
| Vercel | `API_INTERNAL_URL`, `NEXT_PUBLIC_API_URL` |

**Cada épica puede traer variables nuevas.** Si falta una, la app arranca y falla en runtime. Ver §16 para el caso concreto de `WEB_BASE_URL`.

## Secuencia de un despliegue típico

```bash
git checkout dev && git pull
pnpm lint && pnpm test && pnpm build      # reproducir CI antes de mergear
# PR a dev → CI corre → merge
# Render despliega automáticamente desde dev
# Si hay migración nueva:
pnpm --filter api db:deploy              # manual, contra DIRECT_URL
# Verificar:
curl -s https://<api>.onrender.com/health
```

> Las migraciones **no** se aplican automáticamente al desplegar. Son un paso manual y deliberado.

---

# Seguridad y acceso

## Modelo de autenticación

Autenticación **propia** del backend; Supabase no interviene.

- **Access token**: JWT breve (15 min), firmado con `AUTH_JWT_SECRET`, con `iss=umsspira-api` y `aud=umsspira-web`.
- **Refresh token**: opaco, **rota** en cada renovación; los hashes se persisten en PostgreSQL. El refresh consumido no se reutiliza.
- **Contraseñas**: Argon2id.

**Cookies**: `umsspira_token`, `umsspira_refresh`, `umsspira_csrf`, `umsspira_role`.

**CSRF**: las mutaciones autenticadas *por cookie* exigen además la cabecera `X-CSRF-Token`, cuyo hash está vinculado a la sesión. Con `Authorization: Bearer` no hace falta.

**Cookies `Secure`**: se activan con `NODE_ENV=production` y no admiten desactivarse en producción. Detrás de un proxy esto exige que el tráfico entrante sea HTTPS.

## Autorización en dos niveles

| Nivel | Mecanismo | Qué resuelve |
| --- | --- | --- |
| Operación | `@RequirePermissions(...)` — exige **todos** los permisos listados | ¿Puede ejecutar esta acción? |
| Recurso | `actor.scopes.*` verificado en el caso de uso y re-filtrado en el repositorio | ¿Sobre *qué* datos? |

Decoradores relevantes:

- `@Public()` — omite ambos guards globales. Solo para rutas que deben ser públicas.
- `@PublicRegistration()` — además aplica controles de tráfico y origen del registro.
- `@Roles(...)` — restricción directa de rol.
- `@CurrentActor()` — entrega el contexto verificado al controlador.

**Nunca** se confía en `x-user-id`, `x-company-id`, roles enviados por el cliente, ni en un UUID de la URL como prueba de propiedad. Tampoco se concede acceso universal solo por ser administrador: cada flujo conserva su alcance.

## Roles y permisos

| Rol | Permisos |
| --- | --- |
| `administrador` | `user:self:read`, `auth:sessions:self`, `solicitudes:read`, `solicitudes:review`, `eventos:manage`, `reportes:read`, `mentores:manage`, `nlp:extract`, `empresas:invite` |
| `titulado` | `user:self:read`, `auth:sessions:self`, `perfil:self:read`, `perfil:self:write`, `mentores:self:write`, `eventos:read`, `nlp:extract`, `radar:self:read`, `radar:self:write` |
| `empresa` | `user:self:read`, `auth:sessions:self`, `empresas:self:read`, `empresas:self:write`, `vacantes:create`, `eventos:read` |

*Nota:* los 18 permisos viven en `access.policy.ts`. **Mentor es una participación del titulado, no un cuarto rol de login.**

> Agregar un texto nuevo a `@RequirePermissions` **no** lo asigna a ningún rol. Hay que añadirlo a la política *y* sembrarlo explícitamente.

## Límite de tasa (rate limiting)

| Aspecto | Comportamiento |
| --- | --- |
| Adaptador | `memory` en dev/test; `redis` en producción por defecto |
| En Render free | `memory` **explícito** (instancia única) |
| Clave | `request.ip` + clase del controlador |
| Si Redis falla | **503**, sin caída silenciosa a memoria |
| Alcance | Login, renovación, cambio de contraseña, registro, chat |

Los contadores en memoria se reinician con el proceso y **no se comparten entre instancias**. Si Render escala a más de una instancia con `memory`, cada instancia tendrá su propio límite.

**Limitación conocida:** el backend usa `request.ip` y **no hay `trust proxy` configurado** en Express. Detrás del proxy de Render, `request.ip` puede ser la IP del proxy, con lo que todos los usuarios compartirían un mismo contador. Ver §16.

## Cabeceras y CORS

`helmet` activo, `Cache-Control: no-store` en toda respuesta, CORS con orígenes explícitos desde `CORS_ORIGINS`, métodos y cabeceras permitidos enumerados. Socket.IO usa los mismos orígenes y valida el `origin` en el handshake.

**CORS no autentica ni sustituye al CSRF**: controla qué orígenes pueden *leer* una respuesta.

## Formato de errores

```json
{ "error": { "code": "SCREAMING_SNAKE", "message": "Mensaje en español" } }
```

La validación agrega `fields`. Los errores inesperados devuelven `INTERNAL_ERROR` genérico y se registran sin exponer consultas, contraseñas ni valores del entorno.

---

# Observabilidad: qué hay y qué falta

Esta sección es la más importante para un rol de operaciones, porque describe la **brecha real** entre lo que el proyecto tiene y lo que un sistema en producción debería tener.

## Lo que existe

| Mecanismo | Detalle |
| --- | --- |
| Health check | `GET /health` — `SELECT 1` contra PostgreSQL; `503 DATABASE_UNAVAILABLE` si falla. Es el health check de Render y la primera línea de diagnóstico |
| Logs | Logger nativo de NestJS hacia **stdout** (Render los captura). Arranque, errores de arranque y avisos de salud de la BD |
| Logs Docker | Rotación local: 3 archivos × 10 MB por servicio |
| Filtro de errores | Registra errores inesperados sin filtrar datos al cliente |
| Traductor de Prisma | Mapea `P2002`→409, `P2003`→409, `P2025`→404, `P2024`/init→503 |
| Errores de dominio | Códigos propios (`RATE_LIMITED`, `CONFLICT`, …) con mensajes en español |

## Lo que falta

| Capa | Estado |
| --- | --- |
| APM / tracing (Sentry, OpenTelemetry, Datadog) | **No existe** |
| Métricas (Prometheus, exportadores) | **No existe** |
| Alertas / notificaciones | **No existe** |
| Centralización de logs | **No existe** — solo stdout del contenedor |
| Dashboards | **No existe** |
| Monitoreo de uptime externo | **No existe** (salvo el health check de Render) |
| Correlación de IDs de petición | **No existe** |
| Backups documentados de la base | **No hay evidencia en el repositorio** |
| Escaneo de dependencias / SAST | **No existe** |
| Runbook de incidentes formal | **No existe** (esta guía §13 es un primer paso) |
| Pruebas de humo post-despliegue | **No existe** |

**Implicación práctica:** cuando la API "no responde", la evidencia disponible se reduce a los logs de stdout en Render, el resultado de `/health` y lo que el navegador muestre. No hay forma de saber cuántas peticiones fallan, cuánto tardan, ni cuándo empezó un problema sin leer el código o reproducirlo.

## Recomendaciones priorizadas

1. **Backups de PostgreSQL** — es el riesgo más grave. Confirmar el plan de respaldo de Supabase y probar una restauración.
2. **`WEB_BASE_URL` en Render** — sin ella los enlaces de correo apuntan a `localhost` (§16).
3. **`trust proxy`** — para que el rate limiting por IP funcione detrás del proxy (§16).
4. **Alerta de salud** — un uptime check externo sobre `/health` es de bajo costo y cubre el caso más común.
5. **Sentry** — captura de excepciones de frontend y backend con contexto de deploy.

---

# Runbook: operaciones recurrentes

## Desplegar un cambio

```bash
git checkout dev && git pull
pnpm lint && pnpm test && pnpm build     # reproducir el CI localmente
# abrir PR a dev → esperar CI verde → merge
# Render despliega solo desde dev
curl -s https://<api>.onrender.com/health
```

## Aplicar una migración

```bash
pnpm --filter api prisma:validate
pnpm --filter api db:status              # ¿qué falta?
pnpm --filter api db:deploy              # aplica las entregadas
```

Nunca editar una migración ya aplicada. Si algo salió mal, revertir con una migración nueva.

## Agregar una variable de entorno

1. Agregarla al esquema de `src/config/environment.ts` (con defecto si es opcional).
2. Documentarla en `apps/api/.env.example`.
3. **Agregarla en Render** (o en Vercel si es `NEXT_PUBLIC_*`).
4. Reiniciar el servicio.
5. Verificar que arranque: si falta y es obligatoria, verá `Configuración de entorno inválida: <campo>: <mensaje>`.

## Rotar `AUTH_JWT_SECRET`

Generar clave nueva de ≥ 64 caracteres, actualizarla en Render y reiniciar. **Efecto:** todos los access tokens dejan de ser válidos y los usuarios deberán iniciar sesión nuevamente. Coordinar por escrito.

## Correo no llega

1. ¿`docker compose ps` muestra Mailpit arriba en local? → UI en `:8025`.
2. ¿En producción? Verificar `SMTP_URL` y `MAIL_FROM` en Render.
3. **Recordar:** el plan free de Render bloquea 25/465/587.
4. Los códigos OTP **nunca** aparecen en la respuesta HTTP: solo en el correo.

## La API no arranca

El mensaje típico es `Configuración de entorno inválida: <campo>: <mensaje>`. Corregir ese campo. Causas frecuentes:

- `AUTH_JWT_SECRET` con menos de 64 caracteres.
- `DATABASE_URL` que no es una URL de PostgreSQL válida.
- `CORS_ORIGINS` con ruta después del dominio.
- `AUTH_RATE_LIMIT_STORE=redis` sin `REDIS_URL`.
- Archivo `.env` con BOM/UTF-16 en Windows.
- Puerto `3000` ocupado.

## El frontend apunta a `localhost`

`NEXT_PUBLIC_API_URL` no se definió **antes del build** en Vercel. Corregir la variable y **re-desplegar**: el valor está inlina en el bundle, un hotfix sin rebuild no sirve.

## "Ruta no disponible" (404) desde el navegador

El namespace no está en la lista blanca `MODULES` del proxy de Next.js, en `apps/web/src/app/api/v1/` (archivo `[...path]/route.ts`). Ver §16: `vacantes` y `mail-events` están fuera.

## Rate limit (429) o 503 del limitador

- `429` → límite alcanzado; esperar la ventana o revisar si múltiples usuarios comparten IP (§16).
- `503` → modo Redis activo y Redis caído. La app **no** cae a memoria automáticamente; está diseñado así para no degradar el control de acceso en silencio.

## Desconexión de la base

`/health` responde `503 DATABASE_UNAVAILABLE`. Verificar estado del proyecto Supabase y que `DATABASE_URL` apunte al pooler correcto (6543 en runtime).

---

# Problemas conocidos

| # | Síntoma | Causa | Mitigación |
| --- | --- | --- | --- |
| 1 | El primer request tarda ~50 s | Plan free de Render duerme tras 15 min sin tráfico | Subir de plan para demos |
| 2 | Los correos de recuperación llevan a `localhost:3001` | `WEB_BASE_URL` no está en `render.yaml` y su defecto es `http://localhost:3001` | Definirla en Render (§16) |
| 3 | El rate limit por IP no distingue usuarios detrás del proxy | `request.ip` sin `trust proxy` configurado | Configurar `trust proxy` (§16) |
| 4 | `404 Ruta no disponible` desde el navegador | Namespace fuera de la lista blanca `MODULES` | Agregarlo al proxy o llamar directo a la API |
| 5 | `.env` existe pero Nest no lo lee | Archivo con BOM o UTF-16 (Windows) | Reescribir en UTF-8 sin BOM |
| 6 | El frontend apunta a `localhost:3000` | `NEXT_PUBLIC_API_URL` no definida antes del build | Definir y re-desplegar |
| 7 | Build falla con error de lockfile | pnpm no fijado (`packageManager` ausente) | Alinear versión de pnpm con CI (9) |
| 8 | No hay correo en producción | Puertos SMTP bloqueados en plan free | Proveedor API o subir de plan |
| 9 | CI verde pero tipos rotos | `typecheck` no corre en CI | Ejecutarlo manualmente |
| 10 | Un PR rompe algo que el CI no vio | CI solo cubre lint/test/build | Ampliar el pipeline |

---

# Checklist de onboarding

## Día 1 — entorno funcionando

- [ ] Node ≥ 22.12, pnpm 9, Docker Desktop, Git instalados.
- [ ] `git clone` + `pnpm install` desde la raíz sin errores.
- [ ] `apps/api/.env` creado desde `.env.example` con `DATABASE_URL`, `DIRECT_URL` y `AUTH_JWT_SECRET` generados.
- [ ] `apps/web/.env.local` creado con `NEXT_PUBLIC_API_URL` apuntando a `http://localhost:3000`.
- [ ] `docker compose up -d --wait` arriba (Mailpit en `:8025`).
- [ ] `pnpm --filter api db:deploy` y `pnpm --filter api db:seed:demo` ejecutados.
- [ ] `pnpm run dev` levanta ambos servicios.
- [ ] `http://localhost:3000/health` responde `{"status":"ok","database":"ok"}`.
- [ ] Login con `admin@umss.edu.bo` / `admin1234` funciona.
- [ ] Un correo de prueba llega a `http://localhost:8025`.

## Semana 1 — contexto

- [ ] Leer `README.md` raíz, `AGENTS.md` y `apps/api/README.md`.
- [ ] Leer `apps/api/src/modules/README.md` (**convención vinculente** del backend).
- [ ] Entender la diferencia `APP_ENV` / `NODE_ENV` / rama de Git.
- [ ] Entender las dos conexiones de Supabase (6543 vs 5432).
- [ ] Correr `pnpm lint && pnpm test && pnpm build` y verlos verdes.
- [ ] Abrir un PR de prueba a `dev` y ver pasar el CI.
- [ ] Recorrer `bruno/` y ejecutar un par de peticiones manuales.
- [ ] Mapear los servicios en Render y Vercel: qué rama despliega, qué variables existen, qué secretos faltan.
- [ ] Revisar `render.yaml` y verificar en el dashboard que todos los secretos estén cargados.

## Semana 2 — operación

- [ ] Confirmar el **plan de respaldos** de Supabase y probar una restauración.
- [ ] Verificar/crear `WEB_BASE_URL` en Render.
- [ ] Verificar `trust proxy` y el comportamiento real del rate limit.
- [ ] Definir un mecanismo de alerta sobre `/health`.
- [ ] Revisar el estado de la cola de notificaciones y los workers de correo.
- [ ] Documentar los accesos administrativos (Render, Vercel, Supabase, GitHub) y su rotación.
- [ ] Revisar §16 con el equipo y priorizar los hallazgos.

---

# Hallazgos y deuda técnica

Detectados al verificar el código el 4 de noviembre de 2026. Ninguno bloquea el desarrollo; varios afectan la operación en producción.

## Prioridad alta — afecta producción

**H1. `WEB_BASE_URL` no está declarada en `render.yaml`**.
Su defecto en `environment.ts` es `http://localhost:3001`. Alimenta los enlaces de recuperación de contraseña (`request-password-recovery.use-case.ts`) y los enlaces de corrección de solicitudes. En producción, **esos correos llevan a `localhost`**.
*Acción:* agregar la variable en Render con la URL pública de Vercel y reiniciar.

**H2. Rate limiting sin `trust proxy`**.
El limitador usa `request.ip` (`login.controller.ts`, `refresh-session.controller.ts`, `registration-traffic.guard.ts`) y no hay ninguna llamada a `app.set('trust proxy', ...)`. Express por defecto devuelve la IP del socket: detrás del proxy de Render puede ser la IP del proxy, **compartiendo un único contador entre todos los usuarios**.
*Acción:* configurar `trust proxy` y validar el comportamiento real con dos IPs distintas.

**H3. Sin plan de respaldos verificable**.
No hay documentación de backup ni de restauración en el repositorio. Para una base con datos de producción, es el riesgo más grave de la lista.
*Acción:* confirmar el plan de Supabase, programar retención y probar una restauración.

## Prioridad media — afecta calidad y velocidad

**H4. CI limitado a `lint` + `test` + `build`**.
No corre `typecheck` (existe como script), no escanea dependencias, no publica artefactos, no hay Dependabot, ni templates de issues/PR. Un error de tipos puede pasar a `dev`.
*Acción:* agregar `pnpm --filter api typecheck` al workflow y habilitar Dependabot.

**H5. Sin observabilidad**.
Sin APM, métricas, alertas, logs centralizados ni monitoreo de uptime (ver §12). Un incidente solo se detecta por que alguien reporta.
*Acción:* Sentry + uptime check sobre `/health` como mínimo.

**H6. Namespace `vacantes` fuera de la lista blanca del proxy**.
`MODULES` en `apps/web/src/app/api/v1/` (archivo `[...path]/route.ts`) no incluye `vacantes` ni `mail-events`. El frontend llama a `/api/v1/vacantes` directamente a `NEXT_PUBLIC_API_URL` (bypass del proxy) y `mail-events` solo se usa desde Bruno.
*Acción:* alinear la lista blanca con los namespaces reales.

**H7. Versiones de herramienta no fijadas**.
No hay campo `packageManager` en `package.json`; CI instala pnpm 9 mientras la máquina local puede tener otra. El lockfile es `9.0`.
*Acción:* agregar `"packageManager": "pnpm@9.x.y"`.

## Prioridad baja — higiene del repositorio

**H8. Archivos basura trackeados en la raíz**.
Cinco archivos de 0 bytes están versionados: `(`, `{`, `window.history.back()}`, `window.location.reload()}` y `pnpm`. Son residuos de comandos mal tipeados.
*Acción:* `git rm` y agregarlos a `.gitignore`.

**H9. `umsspira-epic7-config.env.enc` versionado**.
Archivo cifrado con OpenSSL (`enc'd data with salted password`) en la raíz. Contenido y passphrase no documentados: no está claro si sigue vigente ni quién tiene la clave.
*Acción:* verificar contenido, documentarlo o retirarlo.

**H10. Referencias a `apps/api-antigua` que ya no existe**.
Aparece en `.gitignore` (3 líneas) y en `pnpm-workspace.yaml` como exclusión, pero la carpeta no existe.
*Acción:* limpiar.

**H11. `AGENTS.md` gitignoreado**.
Está en `.gitignore` (línea 15) pese a que tuvo historial en Git. Cada desarrollador lo tiene local y nadie más.
*Acción:* decidir si se versiona o se retira del `.gitignore`.

**H12. Etiqueta de CI desactualizada**.
El paso se llama *"Configurar Node.js 20"* pero instala `22.22.1`.

**H13. Duplicado de navbar**.
`admin-navbar.tsx` y `adminnavbar.tsx` coexisten en `apps/web/src/shared/components/`.

**H14. Permisos de escritura con permiso de lectura**.
Las operaciones `POST`/`PATCH`/`DELETE` sobre `/api/v1/companies/:companyId/users/*` declaran `empresas:self:read` pese a ser mutaciones.

**H15. `/api/v1/vacantes/*` sin `@RequirePermissions`**.
Depende solo de la sesión y del alcance de `@CurrentActor`.

**H16. Rutas del frontend sin cobertura de middleware**.
`/profile*`, `/mis-pases*` y `/portal/admin` no entran en el `matcher` de `src/middleware.ts` ni montan `<AuthGuard>`. La API responde 401 y la pantalla muestra su estado de error, pero **no hay redirección automática a `/login`**.

**H17. SQL histórico de Supabase fuera del flujo activo.** Los scripts antiguos se conservan como referencia histórica en
[`docs/epic5/sql-historico/`](./epic5/sql-historico/); no existe un flujo Supabase CLI activo. El esquema y las
migraciones vigentes se gestionan con Prisma en `apps/api/prisma/`. `scripts/verificar-radar-m1.ps1` sigue
restringido a PostgreSQL local (verifica que `DIRECT_URL` sea `localhost`).

---

# Glosario

| Término | Significado en este proyecto |
| --- | --- |
| **Épica** | Gran bloque funcional (1–9), con su propia rama `epicN` y su carpeta de seeds `epic-N.ts` |
| **HU** | Historia de usuario; unidad de trabajo individual (ej. `feat/G1-HU2-login`) |
| **Grupo** | Equipo estudiantil responsable de una HU (`G1`…`G9`) |
| **Titulado** | Egresado con cuenta en la plataforma. Rol `titulado` |
| **Mentor** | Participación de un titulado como mentor. **No** es un rol de login |
| **Scope / alcance** | Qué *datos* concretos puede tocar un actor (`actor.scopes.*`) |
| **Port / adapter** | Interfaz en `application/`, implementación en `infrastructure/` |
| **Presenter** | Construye la respuesta pública en HTTP. No exponer filas crudas |
| **Translator** | Convierte filas de persistencia en entidades internas |
| **Pooler de transacciones** | Puerto 6543, `DATABASE_URL`, consultas en runtime |
| **Pooler de sesiones** | Puerto 5432, `DIRECT_URL`, migraciones y seeds |
| **`APP_ENV`** | Destino de los datos (`epic`/`dev`/`test`/`production`). No es una rama |
| **`NODE_ENV`** | Modo de ejecución de Node |
| **Allowlist del proxy** | Conjunto de namespaces que el frontend está autorizado a reenviar |
| **Envelope** | `{ data }` en éxito, `{ error: { code, message } }` en fallo |
| **Bruno / Postman** | Colecciones manuales de peticiones API, una carpeta por módulo |
| **Mailpit** | Servidor SMTP local que captura correos sin enviarlos a Internet |
| **`sync: false`** | Clave en `render.yaml` cuyo valor se carga en el dashboard, no en el repo |

---

# Mapa de documentos

| Documento | Qué contiene |
| --- | --- |
| `README.md` | Puesta en marcha, despliegue, mapa por equipo, flujo de ramas |
| `AGENTS.md` | Resumen operativo para asistentes de IA (local, gitignoreado) |
| `apps/api/README.md` | Organización del backend, variables de entorno, límites y Redis |
| `apps/api/src/modules/README.md` | **Convención vinculante** del backend: fronteras, Zod, presenters, errores, permisos |
| `apps/api/src/shared/README.md` | Contratos de seguridad, guards, errores, infraestructura compartida |
| `apps/api/scripts/seed/README.md` | Cobertura de la seed, cuentas y orden de relaciones |
| `apps/api/test/README.md` | Alcance de las pruebas y qué sustituyen |
| `apps/api/docs/cambios-backend.md` | Decisiones de arquitectura de la migración a NestJS |
| `apps/api/docs/endpoints/` | Contratos HTTP por épica, con plantilla institucional |
| `apps/api/docs/pasos-crear-bd.txt` | Procedimiento exacto para crear una base nueva |
| `bruno/README.md` | Cómo usar la colección manual de peticiones |
| `docs/mapa-de-rutas.md` | Inventario completo de rutas frontend y backend |
| `render.yaml` | Definición del servicio en Render |
| `docker-compose.yml` | Servicios locales (Mailpit, Redis, Postgres) |
| `.github/workflows/ci.yml` | Integración continua |

---

*Documento generado por verificación directa del código fuente. Verifique los hallazgos de §16 antes de actuar: varios dependen de configuración en Render, Vercel y Supabase que no es visible desde el repositorio.*
